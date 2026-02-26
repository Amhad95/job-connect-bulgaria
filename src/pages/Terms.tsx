import { Layout } from "@/components/Layout";
import { useTranslation } from "react-i18next";

export default function Terms() {
  const { i18n } = useTranslation();
  const isBg = i18n.language === "bg";

  return (
    <Layout>
      <div className="container max-w-3xl py-12 md:py-16">
        <h1 className="mb-8 font-display text-3xl font-bold">
          {isBg ? "Условия за ползване" : "Terms of Service"}
        </h1>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isBg ? "1. Използване на услугата" : "1. Use of service"}
            </h2>
            <p>
              {isBg
                ? "Bachkam.com е агрегатор на обяви за работа. Не публикуваме обяви сами — показваме съдържание от публични източници и винаги свързваме към оригиналната обява."
                : "Bachkam.com is a job listing aggregator. We do not post jobs ourselves — we display content from public sources and always link to the original posting."}
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isBg ? "2. Точност на данните" : "2. Data accuracy"}
            </h2>
            <p>
              {isBg
                ? "Полагаме усилия данните да са актуални, но не гарантираме пълна точност. Винаги проверявайте оригиналната обява преди кандидатстване."
                : "We make efforts to keep data current, but do not guarantee full accuracy. Always verify the original posting before applying."}
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isBg ? "3. Премахване на съдържание" : "3. Content removal"}
            </h2>
            <p>
              {isBg
                ? "Ако притежавате обява и желаете премахването й, моля използвайте формата за заявка за премахване на страницата Източници."
                : "If you own a posting and want it removed, please use the removal request form on the Sources page."}
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
