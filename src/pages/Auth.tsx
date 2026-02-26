import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Auth() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("login");

  return (
    <Layout>
      <div className="container flex items-center justify-center py-16 md:py-24">
        <div className="w-full max-w-md rounded-lg border bg-card p-8">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("common.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("common.signup")}</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6 space-y-4">
              <h2 className="font-display text-xl font-bold">{t("auth.loginTitle")}</h2>
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <Input type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{t("auth.password")}</Label>
                <Input type="password" />
              </div>
              <Button className="w-full">{t("common.login")}</Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("auth.noAccount")}{" "}
                <button className="text-primary hover:underline" onClick={() => setTab("signup")}>{t("common.signup")}</button>
              </p>
            </TabsContent>
            <TabsContent value="signup" className="mt-6 space-y-4">
              <h2 className="font-display text-xl font-bold">{t("auth.signupTitle")}</h2>
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <Input type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{t("auth.password")}</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>{t("auth.confirmPassword")}</Label>
                <Input type="password" />
              </div>
              <Button className="w-full">{t("common.signup")}</Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("auth.hasAccount")}{" "}
                <button className="text-primary hover:underline" onClick={() => setTab("login")}>{t("common.login")}</button>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
