import type { DetectionStrategy, ResolvedLanguage, ResolvedOptions } from "../types";

export type DetectionOptions = Pick<
  ResolvedOptions,
  "languages" | "defaultLanguage" | "detection" | "frontmatterKeys"
>;

export interface DetectInput {
  slug: string;
  frontmatter?: Record<string, unknown> | undefined;
}

export interface Detection {
  lang: string;
  source: DetectionStrategy | "default";
  /** Slug without the language folder or suffix; equal for path-linked translations. */
  baseSlug: string;
}

/**
 * Matches a language value (`de`, `de-DE`, `DE`) against the configured languages:
 * exact code, exact locale, then the primary subtag.
 */
export function matchLanguage(
  value: unknown,
  languages: ResolvedLanguage[],
): ResolvedLanguage | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  return (
    languages.find((l) => l.code === v) ??
    languages.find((l) => l.locale.toLowerCase() === v) ??
    languages.find((l) => l.code === v.split(/[-_]/)[0])
  );
}

function fromFolder(slug: string, langs: ResolvedLanguage[]): Detection | undefined {
  const idx = slug.indexOf("/");
  if (idx <= 0) return undefined;
  const lang = matchCode(slug.slice(0, idx), langs);
  if (!lang) return undefined;
  const rest = slug.slice(idx + 1);
  return { lang: lang.code, source: "folder", baseSlug: rest === "" ? "index" : rest };
}

function fromSuffix(slug: string, langs: ResolvedLanguage[]): Detection | undefined {
  const cut = slug.lastIndexOf("/");
  const dir = cut >= 0 ? slug.slice(0, cut + 1) : "";
  const name = cut >= 0 ? slug.slice(cut + 1) : slug;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const lang = matchCode(name.slice(dot + 1), langs);
  if (!lang) return undefined;
  return { lang: lang.code, source: "suffix", baseSlug: dir + name.slice(0, dot) };
}

/** Folder and suffix must match a code exactly (case-insensitive), not a locale or subtag. */
function matchCode(value: string, langs: ResolvedLanguage[]): ResolvedLanguage | undefined {
  const v = value.toLowerCase();
  return langs.find((l) => l.code === v);
}

export function detectLanguage(input: DetectInput, opts: DetectionOptions): Detection {
  for (const strategy of opts.detection) {
    let hit: Detection | undefined;
    if (strategy === "folder") {
      hit = fromFolder(input.slug, opts.languages);
    } else if (strategy === "suffix") {
      hit = fromSuffix(input.slug, opts.languages);
    } else if (strategy === "frontmatter") {
      const lang = matchLanguage(input.frontmatter?.[opts.frontmatterKeys.lang], opts.languages);
      if (lang) hit = { lang: lang.code, source: "frontmatter", baseSlug: input.slug };
    }
    if (hit) return hit;
  }
  return { lang: opts.defaultLanguage, source: "default", baseSlug: input.slug };
}

/**
 * Where the translation of `baseSlug` in `lang` would live under the given convention
 * (the inverse of `detectLanguage` for `folder` and `suffix`). Returns undefined for
 * conventions that cannot be derived from the slug alone.
 */
export function languageSlug(
  baseSlug: string,
  lang: string,
  source: DetectionStrategy | "default",
): string | undefined {
  switch (source) {
    case "folder":
      return `${lang}/${baseSlug}`;
    case "suffix": {
      return `${baseSlug}.${lang}`;
    }
    default:
      return undefined;
  }
}
