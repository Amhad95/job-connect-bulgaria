import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function CompleteProfile() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const meta = user?.user_metadata ?? {};
  const [firstName, setFirstName] = useState(
    meta.first_name || meta.given_name || meta.full_name?.split(" ")[0] || ""
  );
  const [lastName, setLastName] = useState(
    meta.last_name || meta.family_name || meta.full_name?.split(" ").slice(1).join(" ") || ""
  );
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) {
      toast({ title: t("auth.error", "Error"), description: t("auth.birthDateRequired", "Date of birth is required."), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        birth_date: format(birthDate, "yyyy-MM-dd"),
        full_name: `${firstName} ${lastName}`.trim(),
      } as any)
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard/tracker", { replace: true });
    }
  };

  return (
    <div className="container flex items-center justify-center py-16 md:py-24">
      <div className="w-full max-w-md rounded-lg border bg-card p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="font-display text-xl font-bold">{t("auth.completeProfileTitle", "Complete Your Profile")}</h2>
          <p className="text-sm text-muted-foreground">{t("auth.completeProfileDesc", "Please provide the following details to continue.")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("auth.firstName", "First Name")}</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t("auth.lastName", "Last Name")}</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("auth.birthDate", "Date of Birth")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !birthDate && "text-muted-foreground")}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate ? format(birthDate, "PPP") : t("auth.pickDate", "Pick a date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  captionLayout="dropdown"
                  fromYear={1920}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? t("common.loading") : t("auth.continue", "Continue")}
          </Button>
        </form>
      </div>
    </div>
  );
}
