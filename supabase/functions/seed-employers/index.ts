import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMPLOYERS = [
  { name: "Schwarz IT", url: "https://it.schwarz/en/career" },
  { name: "SAP Labs Bulgaria", url: "https://jobs.sap.com/search/?q=&locationsearch=Sofia" },
  { name: "Bosch Engineering Center Sofia", url: "https://www.bosch.bg/careers/" },
  { name: "VMware / Broadcom", url: "https://jobs.broadcom.com/" },
  { name: "Uber Bulgaria", url: "https://www.uber.com/bg/en/careers/" },
  { name: "Coca-Cola HBC Bulgaria", url: "https://careers.coca-colahellenic.com/" },
  { name: "Kaufland Bulgaria", url: "https://www.karieri.bg/" },
  { name: "Lidl Bulgaria", url: "https://kariera.lidl.bg/" },
  { name: "UniCredit Bulbank", url: "https://www.unicreditbulbank.bg/en/careers/" },
  { name: "DSK Bank (OTP Group)", url: "https://dskbank.bg/karieri" },
  { name: "Postbank (Eurobank)", url: "https://www.postbank.bg/bg/Karieri" },
  { name: "Fibank", url: "https://www.fibank.bg/bg/za-nas/karieri" },
  { name: "A1 Bulgaria", url: "https://www.a1.bg/karieri" },
  { name: "Yettel Bulgaria", url: "https://www.yettel.bg/karieri" },
  { name: "Vivacom", url: "https://www.vivacom.bg/bg/residential/karieri" },
  { name: "Telerik Academy", url: "https://www.telerikacademy.com/about/careers" },
  { name: "Progress Software", url: "https://www.progress.com/careers" },
  { name: "Endava Bulgaria", url: "https://www.endava.com/careers" },
  { name: "EPAM Bulgaria", url: "https://www.epam.com/careers" },
  { name: "Accenture Bulgaria", url: "https://www.accenture.com/bg-en/careers" },
  { name: "DXC Technology Bulgaria", url: "https://careers.dxc.com/" },
  { name: "Experian Bulgaria", url: "https://www.experian.bg/careers" },
  { name: "Paysafe Bulgaria", url: "https://www.paysafe.com/careers/" },
  { name: "Payhawk", url: "https://www.payhawk.com/en/careers" },
  { name: "Gtmhub / Quantive", url: "https://quantive.com/careers" },
  { name: "Leanplum / CleverTap", url: "https://clevertap.com/careers/" },
  { name: "Strypes", url: "https://strypes.eu/careers/" },
  { name: "Musala Soft", url: "https://www.musala.com/careers/" },
  { name: "Scalefocus", url: "https://www.scalefocus.com/careers" },
  { name: "Ontotext", url: "https://www.ontotext.com/careers/" },
  { name: "Chaos (V-Ray)", url: "https://www.chaos.com/careers" },
  { name: "Gtmhub / Quantive", url: "https://quantive.com/careers" },
  { name: "SiteGround", url: "https://www.siteground.com/careers" },
  { name: "SuperHosting.BG", url: "https://www.superhosting.bg/web-hosting-page-careers.php" },
  { name: "ICB InterConsult Bulgaria", url: "https://www.icb.bg/bg/careers" },
  { name: "Devexperts Bulgaria", url: "https://devexperts.com/careers/" },
  { name: "Dreamix", url: "https://www.dreamix.eu/careers/" },
  { name: "MentorMate", url: "https://mentormate.com/careers/" },
  { name: "Nestle Bulgaria", url: "https://www.nestle.bg/bg/careers" },
  { name: "Mondelez Bulgaria", url: "https://www.mondelezinternational.com/careers/" },
  { name: "Aurubis Bulgaria", url: "https://www.aurubis.com/en/careers" },
  { name: "Sopharma", url: "https://www.sopharmagroup.com/bg/karieri" },
  { name: "Huvepharma", url: "https://www.huvepharma.com/careers/" },
  { name: "EVN Bulgaria", url: "https://www.evn.bg/Karieri.aspx" },
  { name: "Schneider Electric Bulgaria", url: "https://www.se.com/bg/bg/about-us/careers/overview.jsp" },
  { name: "Siemens Bulgaria", url: "https://new.siemens.com/bg/en/company/jobs.html" },
  { name: "TechnoLogica", url: "https://www.technologica.com/bg/careers/" },
  { name: "Fadata Group", url: "https://www.fadata.eu/careers/" },
  { name: "Nemetschek Bulgaria", url: "https://www.nemetschek.bg/en/careers/" },
  { name: "Bulpros / DIGITALL", url: "https://digitall.com/careers/" },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()\/]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const results = { upserted: 0, errors: [] as string[] };

    // Deduplicate by name
    const seen = new Set<string>();
    const unique = EMPLOYERS.filter((e) => {
      if (seen.has(e.name)) return false;
      seen.add(e.name);
      return true;
    });

    for (const emp of unique) {
      const slug = slugify(emp.name);
      const domain = extractDomain(emp.url);

      // Upsert employer
      const { data: employer, error: empErr } = await supabase
        .from("employers")
        .upsert({ name: emp.name, slug, website_domain: domain }, { onConflict: "slug" })
        .select("id")
        .single();

      if (empErr) {
        results.errors.push(`${emp.name}: ${empErr.message}`);
        continue;
      }

      // Upsert employer_source
      const { error: srcErr } = await supabase
        .from("employer_sources")
        .upsert(
          {
            employer_id: employer.id,
            careers_home_url: emp.url,
            jobs_list_url: emp.url,
            robots_url: `https://${domain}/robots.txt`,
            policy_status: "PENDING",
            policy_mode: "METADATA_ONLY",
          },
          { onConflict: "employer_id" }
        );

      if (srcErr) {
        results.errors.push(`${emp.name} source: ${srcErr.message}`);
        continue;
      }

      results.upserted++;
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
