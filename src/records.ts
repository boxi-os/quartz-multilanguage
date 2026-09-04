import type { MultilanguageFileData, ResolvedOptions } from "./types";
import { detectLanguage } from "./language/detect";
import { buildTranslationIndex, type PageRecord, type TranslationIndex } from "./language/link";

type FileData = Record<string, unknown>;

function asStringArray(value: unknown): string[] | undefined {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return undefined;
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k.trim().toLowerCase()] = v;
  }
  return out;
}

/** Reads the language fields from frontmatter; used by the transformer and as fallback here. */
export function readFrontmatterFields(
  frontmatter: FileData | undefined,
  opts: ResolvedOptions,
): Pick<MultilanguageFileData, "translationKey" | "translations"> {
  const key = frontmatter?.[opts.frontmatterKeys.key];
  const translations = asStringRecord(frontmatter?.[opts.frontmatterKeys.translations]);
  return {
    translationKey: typeof key === "string" && key.trim() ? key.trim() : undefined,
    translations,
  };
}

/** Builds the linking record for one page from its vfile data. */
export function toPageRecord(data: FileData, opts: ResolvedOptions): PageRecord | undefined {
  const slug = data.slug;
  if (typeof slug !== "string" || !slug) return undefined;
  const frontmatter =
    data.frontmatter && typeof data.frontmatter === "object"
      ? (data.frontmatter as FileData)
      : undefined;

  // The transformer normally ran already. If it did not (plugin misconfigured or a page
  // produced by another plugin), derive the same information on the fly.
  const stored = data.multilanguage as MultilanguageFileData | undefined;
  const detection = stored ?? detectLanguage({ slug, frontmatter }, opts);
  const fields = stored ?? readFrontmatterFields(frontmatter, opts);

  return {
    slug,
    lang: detection.lang,
    baseSlug: detection.baseSlug,
    source: detection.source,
    title: typeof frontmatter?.title === "string" ? frontmatter.title : undefined,
    aliases: asStringArray(frontmatter?.aliases),
    translationKey: fields.translationKey,
    translations: fields.translations,
  };
}

const cache = new WeakMap<object, TranslationIndex>();

/**
 * Index for a list of file data objects. Cached by the identity of the list: Quartz passes
 * the same `allFiles` array to every component of one build, so the index is built once.
 */
export function indexFromFiles(files: FileData[], opts: ResolvedOptions): TranslationIndex {
  const hit = cache.get(files);
  if (hit) return hit;
  const records = files
    .map((f) => toPageRecord(f, opts))
    .filter((r): r is PageRecord => r !== undefined);
  const index = buildTranslationIndex(records, opts);
  cache.set(files, index);
  return index;
}

/** Slug of the language's home page, preferring `home`, then `<code>/index`, then `index`. */
export function homeSlug(
  lang: string,
  opts: ResolvedOptions,
  hasSlug: (slug: string) => boolean,
): string {
  const cfg = opts.languages.find((l) => l.code === lang);
  if (cfg?.home) return cfg.home;
  const prefixed = `${lang}/index`;
  if (hasSlug(prefixed)) return prefixed;
  if (lang === opts.defaultLanguage && hasSlug("index")) return "index";
  return prefixed;
}
