

## Update `jobs_list_url` for All Companies

Bulk data update via the insert tool — no schema changes needed. I'll run UPDATE statements against `employer_sources` using each source's `id`.

### Companies with URL changes (32 updates):

| Company | New `jobs_list_url` |
|---|---|
| A1 Bulgaria | `https://jobs.a1.com/bg/jobs/?country=bulgaria` |
| Accenture Bulgaria | `https://www.accenture.com/bg-en/careers/jobsearch` |
| Aurubis Bulgaria | `https://www.aurubis.com/en/career/jobs` |
| Bosch Engineering Center Sofia | `https://careers.smartrecruiters.com/BoschGroup/bulgaria` |
| Bulpros / DIGITALL | `https://digitall.com/careers/apply` |
| Chaos (V-Ray) | `https://careers.chaos.com/?jobs-c88dea0d%5Bcountry%5D%5B%5D=BG` |
| Coca-Cola HBC Bulgaria | long URL (country-filtered) |
| Devexperts Bulgaria | `https://careers.devexperts.com/vacancies?q=&country=bg&cities=Sofia` |
| Dreamix | `www.dreamix.eu/careers/` |
| DSK Bank (OTP Group) | encoded BG careers URL |
| DXC Technology Bulgaria | `https://careers.dxc.com/job-search-results/?compliment[]=Bulgaria` |
| EPAM Bulgaria | `https://careers.epam.com/en/jobs?country=4060741400008679559` |
| EVN Bulgaria | `https://careers.evn.bg/Jobs` |
| Experian Bulgaria | `https://careers.smartrecruiters.com/Experian?search=Sofia,%20Bulgaria` |
| Fadata Group | personio URL with filters |
| Fibank | `https://www.fibank.bg/bg/za-nas/karieri` |
| Huvepharma | `https://www.huvepharma.com/join-us/` |
| ICB InterConsult Bulgaria | `https://www.icb.bg/careers/` |
| Kaufland Bulgaria | `https://kariera.kaufland.bg/svobodni-pozitsii` |
| Leanplum / CleverTap | `clevertap.com/careers/` |
| Lidl Bulgaria | `https://jobs.lidl.bg/tarsene-na-rabota` |
| Mondelez Bulgaria | `www.mondelezinternational.com/careers/jobs/?term&countrycode=BG` |
| Musala Soft | `www.musala.com/careers/` |
| Nemetschek Bulgaria | `https://careers.nemetschek.bg/positions` |
| Nestle Bulgaria | `https://www.nestle.bg/bg/jobs/search-jobs?keyword=&country=BG` |
| Ontotext | `https://www.ontotext.com/company/careers/open-positions/` |
| Payhawk | `https://payhawk.com/bg/karieri#open-positions` |
| Paysafe Bulgaria | `https://jobs.paysafe.com/search/?...locationsearch=bulgaria...` |
| Postbank (Eurobank) | `www.postbank.bg/bg/Karieri` |
| Progress Software | `https://www.progress.com/company/careers/open-positions?location=Bulgaria` |
| SAP Labs Bulgaria | `https://jobs.sap.com/search/?q=&locationsearch=Sofia` |
| Scalefocus | `https://www.scalefocus.com/open-positions` |
| Schneider Electric Bulgaria | `https://careers.se.com/jobs?lang=en-US&country=Bulgaria&page=1` |
| Schwarz IT | `it.schwarz/en/career` |
| Siemens Bulgaria | `https://jobs.siemens.com/...` |
| Sopharma | `https://www.sopharmagroup.com/bg/karieri/otvoreni-pozitsii?...` |
| Strypes | `https://ict-strypes.eu/careers/` |
| SuperHosting.BG | `https://superhosting.teamtailor.com/bg/jobs` |
| TechnoLogica | `https://technologica.com/careers/open-positions/` |
| Telerik Academy | `www.telerikacademy.com/about/careers` |
| Uber Bulgaria | `www.uber.com/bg/en/careers/` |
| UniCredit Bulbank | `https://careers.unicredit.eu/en_GB/jobsuche/SearchJobs/?...` |
| Vivacom | `https://www.vivacom.bg/bg/residential/za-nas/karieri/obiavi-za-rabota` |
| Yettel Bulgaria | `https://jobs.ceetelcogroup.com/yettel/search/?...` |

### Companies set to NULL (no URL / "—"):
Acme Corp, Endava Bulgaria (all 3 sources), Gtmhub / Quantive (both sources), MentorMate (both sources), SiteGround (both sources), VMware / Broadcom

### Implementation
One batch of UPDATE statements using the insert tool, targeting each `employer_sources` row by its `id`.

