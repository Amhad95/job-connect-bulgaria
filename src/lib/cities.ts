export interface CityEntry {
  slug: string;
  name_en: string;
  name_bg: string;
}

export const CANONICAL_CITIES: CityEntry[] = [
  { slug: "sofia",          name_en: "Sofia",          name_bg: "София" },
  { slug: "plovdiv",        name_en: "Plovdiv",        name_bg: "Пловдив" },
  { slug: "varna",          name_en: "Varna",          name_bg: "Варна" },
  { slug: "burgas",         name_en: "Burgas",         name_bg: "Бургас" },
  { slug: "ruse",           name_en: "Ruse",           name_bg: "Русе" },
  { slug: "stara-zagora",   name_en: "Stara Zagora",   name_bg: "Стара Загора" },
  { slug: "veliko-tarnovo", name_en: "Veliko Tarnovo", name_bg: "Велико Търново" },
  { slug: "pleven",         name_en: "Pleven",         name_bg: "Плевен" },
  { slug: "blagoevgrad",    name_en: "Blagoevgrad",    name_bg: "Благоевград" },
  { slug: "gabrovo",        name_en: "Gabrovo",        name_bg: "Габрово" },
];

const SLUG_MAP = new Map(CANONICAL_CITIES.map(c => [c.slug, c]));

/** Get localized city name from slug. Falls back to raw city string or slug itself. */
export function getCityName(slug: string | undefined | null, lang: string, rawCity?: string | null): string {
  if (slug) {
    const entry = SLUG_MAP.get(slug);
    if (entry) return lang === "bg" ? entry.name_bg : entry.name_en;
  }
  return rawCity || slug || "";
}

/** Get city display label for filter chips: "Sofia (София)" format */
export function getCityLabel(slug: string): string {
  const entry = SLUG_MAP.get(slug);
  if (!entry) return slug;
  return `${entry.name_en} (${entry.name_bg})`;
}

/** Normalize raw city text to slug (client-side mirror of DB function) */
export function normalizeCityToSlug(raw: string): string | null {
  const lower = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    sofia: "sofia", "софия": "sofia",
    plovdiv: "plovdiv", "пловдив": "plovdiv",
    varna: "varna", "варна": "varna",
    burgas: "burgas", "бургас": "burgas",
    ruse: "ruse", "русе": "ruse", rousse: "ruse",
    "stara zagora": "stara-zagora", "стара загора": "stara-zagora",
    "veliko tarnovo": "veliko-tarnovo", "велико търново": "veliko-tarnovo", "veliko turnovo": "veliko-tarnovo",
    pleven: "pleven", "плевен": "pleven",
    blagoevgrad: "blagoevgrad", "благоевград": "blagoevgrad",
    gabrovo: "gabrovo", "габрово": "gabrovo",
  };
  return map[lower] ?? null;
}
