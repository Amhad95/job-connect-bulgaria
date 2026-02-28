import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MapPin, SendHorizonal, Loader2 } from "lucide-react";

const schema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    subject: z.string().min(3, "Subject must be at least 3 characters"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactValues = z.infer<typeof schema>;

export default function Contact() {
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);

    const form = useForm<ContactValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", email: "", subject: "", message: "" },
    });

    async function onSubmit(values: ContactValues) {
        setSubmitting(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("contact_messages").insert([values]);
        setSubmitting(false);

        if (error) {
            toast.error(t("contact.errorBody"));
        } else {
            toast.success(t("contact.successTitle"), {
                description: t("contact.successBody"),
            });
            form.reset();
        }
    }

    return (
        <Layout>
            {/* ── Hero ─────────────────────────────────────────────────────────── */}
            <section className="border-b bg-gradient-to-br from-primary/5 via-background to-background py-16">
                <div className="container max-w-3xl text-center">
                    <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                        {t("contact.title")}
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">{t("contact.subtitle")}</p>
                </div>
            </section>

            {/* ── Two-column body ──────────────────────────────────────────────── */}
            <section className="container max-w-5xl py-16">
                <div className="grid gap-12 lg:grid-cols-2">
                    {/* Left – contact info */}
                    <div className="flex flex-col gap-8">
                        <div>
                            <h2 className="font-display text-xl font-bold text-foreground">{t("contact.infoTitle")}</h2>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                {t("contact.subtitle")}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <a
                                href={`mailto:${t("contact.email")}`}
                                className="flex items-center gap-3 group text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                    <Mail className="h-4 w-4 text-primary" />
                                </span>
                                <span className="text-sm font-medium group-hover:underline">
                                    {t("contact.email")}
                                </span>
                            </a>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                    <MapPin className="h-4 w-4 text-primary" />
                                </span>
                                <span className="text-sm font-medium">{t("contact.location")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right – form */}
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <h2 className="mb-6 font-display text-xl font-bold text-foreground">
                            {t("contact.formTitle")}
                        </h2>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("contact.name")}</FormLabel>
                                                <FormControl>
                                                    <Input id="contact-name" placeholder="Jane Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("contact.emailField")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        id="contact-email"
                                                        type="email"
                                                        placeholder="jane@example.com"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("contact.subject")}</FormLabel>
                                            <FormControl>
                                                <Input id="contact-subject" placeholder="Partnership enquiry" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("contact.message")}</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    id="contact-message"
                                                    rows={5}
                                                    placeholder="Tell us more…"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    id="contact-submit"
                                    type="submit"
                                    className="w-full gap-2"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <SendHorizonal className="h-4 w-4" />
                                    )}
                                    {t("contact.submit")}
                                </Button>
                            </form>
                        </Form>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
