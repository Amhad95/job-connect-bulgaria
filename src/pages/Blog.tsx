import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useSEO } from "@/hooks/useSEO";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, FileText } from "lucide-react";

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    cover_image_url: string | null;
    published_at: string;
}

async function fetchPublishedPosts(): Promise<BlogPost[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, published_at")
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as BlogPost[];
}

function BlogCardSkeleton() {
    return (
        <Card className="overflow-hidden">
            <Skeleton className="h-48 w-full rounded-none" />
            <CardContent className="space-y-3 p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
            </CardContent>
        </Card>
    );
}

export default function Blog() {
    const { t } = useTranslation();

    useSEO({
        title: "Блог — бачкам",
        description: "Съвети за кариера, CV, мотивационни писма, интервюта и търсене на работа в България.",
        canonical: "/blog",
    });

    const { data: posts, isLoading, isError } = useQuery({
        queryKey: ["blog_posts"],
        queryFn: fetchPublishedPosts,
    });

    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────────────────── */}
            <section className="border-b bg-gradient-to-br from-primary/5 via-background to-background py-16">
                <div className="container max-w-3xl text-center">
                    <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                        {t("blog.title")}
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">{t("blog.subtitle")}</p>
                </div>
            </section>

            {/* ── Posts grid ───────────────────────────────────────────────────── */}
            <section className="container max-w-6xl py-16">
                {isLoading && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <BlogCardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {isError && (
                    <p className="text-center text-muted-foreground">{t("common.noResults")}</p>
                )}

                {!isLoading && !isError && posts?.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-24 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground/40" />
                        <h2 className="font-display text-xl font-semibold text-foreground">
                            {t("blog.emptyTitle")}
                        </h2>
                        <p className="max-w-xs text-sm text-muted-foreground">{t("blog.emptyBody")}</p>
                    </div>
                )}

                {!isLoading && !isError && (posts?.length ?? 0) > 0 && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {posts!.map((post) => (
                            <Link key={post.id} to={`/blog/${post.slug}`} className="group focus:outline-none">
                                <Card className="h-full overflow-hidden border transition-shadow duration-300 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                                    <div className="relative h-48 w-full overflow-hidden bg-muted">
                                        {post.cover_image_url ? (
                                            <img
                                                src={post.cover_image_url}
                                                alt={post.title}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
                                                <FileText className="h-10 w-10 text-muted-foreground/30" />
                                            </div>
                                        )}
                                    </div>

                                    <CardContent className="flex flex-col gap-2 p-5">
                                        <Badge variant="secondary" className="w-fit gap-1 text-xs font-normal">
                                            <CalendarDays className="h-3 w-3" />
                                            {format(new Date(post.published_at), "dd MMM yyyy")}
                                        </Badge>

                                        <h2 className="font-display text-base font-bold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                            {post.title}
                                        </h2>

                                        {post.excerpt && (
                                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                                {post.excerpt}
                                            </p>
                                        )}

                                        <span className="mt-auto pt-2 text-xs font-medium text-primary">
                                            {t("blog.readMore")} →
                                        </span>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
