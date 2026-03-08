import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const BASE_URL = "https://www.bachkam.com";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/6Q6GCiPTpPNCgNUhK0gK0FsAXpG2/social-images/social-1772653726568-Screenshot_2026-03-04_at_9.48.37_PM.webp";

function upsertMeta(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return el;
}

export function useSEO({ title, description, canonical, ogImage, noIndex, jsonLd }: SEOProps) {
  useEffect(() => {
    // Title
    const prevTitle = document.title;
    document.title = title;

    // Meta description
    upsertMeta("name", "description", description);

    // OG tags
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    const resolvedImage = ogImage || DEFAULT_OG_IMAGE;
    upsertMeta("property", "og:image", resolvedImage);

    // Twitter tags
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", resolvedImage);

    // Canonical
    const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;
    let canonicalEl: HTMLLinkElement | undefined;
    if (canonicalUrl) {
      canonicalEl = upsertLink("canonical", canonicalUrl);
      upsertMeta("property", "og:url", canonicalUrl);
    }

    // noindex
    let robotsMeta: HTMLMetaElement | undefined;
    if (noIndex) {
      robotsMeta = upsertMeta("name", "robots", "noindex, nofollow");
    }

    // JSON-LD
    let scriptEl: HTMLScriptElement | undefined;
    if (jsonLd) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(scriptEl);
    }

    return () => {
      document.title = prevTitle;
      if (scriptEl) scriptEl.remove();
      if (robotsMeta && noIndex) robotsMeta.remove();
    };
  }, [title, description, canonical, ogImage, noIndex, jsonLd]);
}
