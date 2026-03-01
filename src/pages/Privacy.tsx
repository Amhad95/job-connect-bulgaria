import { useTranslation } from "react-i18next";

export default function Privacy() {
  const { i18n } = useTranslation();
  const isBg = i18n.language === "bg";

  return (
    <div className="container max-w-3xl py-12 md:py-16">
        <h1 className="mb-8 font-display text-3xl font-bold">
          {isBg ? "Политика за поверителност" : "Privacy Policy"}
        </h1>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isBg ? "1. Какви данни събираме" : "1. What data we collect"}
            </h2>
            <p>
              {isBg
                ? "Събираме само данните, необходими за предоставяне на услугата: имейл адрес за акаунта, запазени обяви, качени документи (ако изберете) и данни за проследяване на кандидатури."
                : "We only collect data necessary to provide the service: email for your account, saved jobs, uploaded documents (if you choose), and application tracking data."}
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isBg ? "2. Как използваме данните ви" : "2. How we use your data"}
            </h2>
            <p>
              {isBg
                ? "Данните се използват за показване на подходящи обяви, генериране на мотивационни писма и управление на кандидатурите ви. Не споделяме данните ви със сайтове за работа."
                : "Data is used to show relevant job listings, generate cover letters, and manage your applications. We do not share your data with job sites."}
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isBg ? "3. Изтриване на данни" : "3. Data deletion"}
            </h2>
            <p>
              {isBg
                ? "Можете да изтриете акаунта си и всички свързани данни по всяко време от страницата за профил."
                : "You can delete your account and all associated data at any time from your profile page."}
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isBg ? "4. Контакт" : "4. Contact"}
            </h2>
            <p>
              {isBg
                ? "За въпроси относно поверителността, свържете се с нас на privacy@bachkam.com."
                : "For privacy questions, contact us at privacy@bachkam.com."}
            </p>
          </section>
        </div>
      </div>
  );
}
