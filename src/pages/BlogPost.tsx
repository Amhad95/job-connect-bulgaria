import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    cover_image_url: string | null;
    published_at: string;
}

async function fetchPost(slug: string): Promise<BlogPost | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("id, title, slug, excerpt, content, cover_image_url, published_at")
        .eq("slug", slug)
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .single();

    if (error) return null;
    return data as BlogPost;
}

function BlogPostSkeleton() {
    return (
        <div className="container max-w-3xl py-10 space-y-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
    );
}

export default function BlogPost() {
    const { slug } = useParams<{ slug: string }>();
    const { t } = useTranslation();

    const { data: post, isLoading } = useQuery({
        queryKey: ["blog_post", slug],
        queryFn: () => fetchPost(slug!),
        enabled: Boolean(slug),
    });

    if (isLoading) {
        return (
            <Layout>
                <BlogPostSkeleton />
            </Layout>
        );
    }

    if (!post) {
        return (
            <Layout>
                <div className="container max-w-3xl py-20 text-center">
                    <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="mb-6 text-muted-foreground">{t("blog.notFound")}</p>
                    <Link to="/blog">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t("blog.backToBlog")}
                        </Button>
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <article className="container max-w-3xl py-10">
                <Link
                    to="/blog"
                    className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t("blog.backToBlog")}
                </Link>

                <Badge variant="secondary" className="mt-4 gap-1 text-xs font-normal">
                    <CalendarDays className="h-3 w-3" />
                    {t("blog.publishedOn")} {format(new Date(post.published_at), "dd MMMM yyyy")}
                </Badge>

                <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
                    {post.title}
                </h1>

                {post.excerpt && (
                    <p className="mt-3 text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>
                )}

                {post.cover_image_url && (
                    <div className="mt-8 overflow-hidden rounded-xl border bg-muted">
                        <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="h-72 w-full object-cover md:h-96"
                        />
                    </div>
                )}

                <div
                    className="prose prose-neutral dark:prose-invert prose-headings:font-display prose-a:text-primary prose-a:no-underline hover:prose-a:underline mt-10 max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                <div className="mt-14 border-t pt-8">
                    <Link to="/blog">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t("blog.backToBlog")}
                        </Button>
                    </Link>
                </div>
            </article>
        </Layout>
    );
}
