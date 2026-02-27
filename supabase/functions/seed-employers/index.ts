import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMPLOYERS = [
  { name: "Schwarz IT", url: "https://it.schwarz/en/career" },
  { name: "SAP Labs Bulgaria", url: "https://jobs.sap.com/go/Bulgaria/8806301/" },
  { name: "Bosch Engineering Center Sofia", url: "https://jobs.smartrecruiters.com/?company=BoschGroup&location=Bulgaria" },
  { name: "VMware / Broadcom", url: "https://broadcom.wd1.myworkdayjobs.com/External_Career" },
  { name: "Uber Bulgaria", url: "https://www.uber.com/bg/en/careers/" },
  { name: "Coca-Cola HBC", url: "https://careers.coca-colahellenic.com/bg_BG/careers/SearchJobs/?3_109_3=4269" },
  { name: "Kaufland Bulgaria", url: "https://kariera.kaufland.bg/jobs" },
  { name: "Lidl Bulgaria", url: "https://jobs.lidl.bg/obiavi-za-rabota" },
  { name: "Billa Bulgaria", url: "https://www.billa.bg/za-billa/billa-kato-rabotodatel/svobodni-pozitsii" },
  { name: "UniCredit Bulbank", url: "https://jobs.unicredit.eu/search/?locationsearch=Bulgaria" },
  { name: "DSK Bank (All Roles)", url: "https://dskbank.bg/en/career/career" },
  { name: "DSK Bank (IT Specific Roles)", url: "https://dskbank.bg/%D0%BA%D0%BE%D0%B8-%D1%81%D0%BC%D0%B5-%D0%BD%D0%B8%D0%B5/%D0%B4%D1%81%D0%BA-%D0%B8%D1%82-%D1%81%D0%BF%D0%B5%D1%86%D0%B8%D0%B0%D0%BB%D0%B8%D1%81%D1%82%D0%B8/-page-1-" },
  { name: "Postbank (Eurobank)", url: "https://www.careers.postbank.bg/jobs" },
  { name: "Fibank", url: "https://www.fibank.bg/bg/za-nas/karieri" },
  { name: "Nexo", url: "https://nexo.com/careers#open-positions" },
  { name: "A1 Bulgaria", url: "https://jobs.a1.com/bg/job-search/" },
  { name: "Yettel Bulgaria", url: "https://www.yettel.bg/bg/careers/open-positions" },
  { name: "Vivacom", url: "https://www.vivacom.bg/za-nas/karieri" },
  { name: "Telerik Academy", url: "https://www.telerikacademy.com/about/careers" },
  { name: "Progress Software", url: "https://www.progress.com/company/careers/open-positions" },
  { name: "Endava Bulgaria", url: "https://careers.endava.com/en/Search-Job?locations=Sofia,Varna,Ruse,Plovdiv" },
  { name: "EPAM Systems", url: "https://www.epam.com/careers/job-listings?country=Bulgaria" },
  { name: "IBM Bulgaria", url: "https://careers.ibm.com/job-search/?lc=Bulgaria" },
  { name: "HP Inc", url: "https://jobs.hp.com/search-results/?location=Sofia%2C%20Bulgaria" },
  { name: "HPE (Hewlett Packard Enterprise)", url: "https://careers.hpe.com/us/en/search-results?location=Bulgaria" },
  { name: "Accenture Bulgaria", url: "https://www.accenture.com/bg-en/careers" },
  { name: "DXC Technology", url: "https://dxc.wd1.myworkdayjobs.com/DXCJobs?locationCountry=a33f642bdbe94879ba9bc5e340a653bb" },
  { name: "Experian", url: "https://careers.experian.com/jobs/search?address=Bulgaria" },
  { name: "Paysafe", url: "https://careers.paysafe.com/jobs/" },
  { name: "Payhawk", url: "https://www.payhawk.com/en/careers" },
  { name: "Gtmhub / Quantive", url: "https://quantive.com/careers" },
  { name: "Leanplum / CleverTap", url: "https://clevertap.com/careers/" },
  { name: "Strypes", url: "https://strypes.eu/careers/" },
  { name: "Musala Soft", url: "https://www.musala.com/careers/" },
  { name: "Scalefocus", url: "https://www.scalefocus.com/careers" },
  { name: "Ontotext", url: "https://www.ontotext.com/careers/" },
  { name: "Chaos", url: "https://www.chaos.com/careers/open-positions" },
  { name: "SiteGround", url: "https://careers.siteground.com/" },
  { name: "SuperHosting.BG", url: "https://www.superhosting.bg/web-hosting-page-careers.php" },
  { name: "ICB InterConsult Bulgaria", url: "https://www.icb.bg/bg/careers" },
  { name: "Devexperts Bulgaria", url: "https://devexperts.com/careers/" },
  { name: "Dreamix", url: "https://www.dreamix.eu/careers/" },
  { name: "MentorMate", url: "https://mentormate.com/careers/" },
  { name: "Nestlé Bulgaria", url: "https://www.nestle.bg/bg/jobs/search-jobs" },
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
  { name: "TELUS International", url: "https://jobs.telusinternational.com/en_US/careers/SearchJobsBulgaria" },
  { name: "Sutherland", url: "https://jobs.sutherlandglobal.com/search-jobs/Bulgaria/" },
  { name: "Melexis Bulgaria", url: "https://www.melexis.com/en/careers/jobs?location=Sofia" },
  { name: "Visteon Bulgaria", url: "https://visteon.com/careers/" },
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
