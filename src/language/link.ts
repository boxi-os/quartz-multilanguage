import type { DetectionStrategy, LinkingStrategy, TranslationMap } from "../types";
import { warnOnce } from "../util/warn";

export interface PageRecord {
  slug: string;
  lang: string;
  baseSlug: string;
  /** Which detection strategy produced `lang`; needed to derive sibling slugs. */
  source?: DetectionStrategy | "default";
  title?: string;
  /** Raw frontmatter aliases (titles, not slugs). */
  aliases?: string[];
  translationKey?: string;
  /** Language code → slug, as written in frontmatter. */
  translations?: Record<string, string>;
}

export interface TranslationIndex {
  /** Every slug maps to its group, which includes the slug itself. */
  bySlug: Map<string, TranslationMap>;
  /** Slug → page title, for `switcher.label: translatedTitle`. */
  titles: Map<string, string>;
  /** Slug → language, for pages known to the index. */
  langs: Map<string, string>;
}

export interface LinkOptions {
  linking: readonly LinkingStrategy[];
}

/** Normalizes titles, aliases and file names so `Kaffee Bohnen`, `kaffee-bohnen` and `Kaffee_Bohnen` match. */
export function normalizeTitle(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-");
}

/** Normalizes a frontmatter translation target (`[[en/coffee]]`, `/en/coffee.md`) to a slug-like string. */
export function normalizeTarget(value: string): string {
  let s = value.trim();
  const wiki = /^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/.exec(s);
  if (wiki) s = wiki[1]!.trim();
  s = s.replace(/^\/+|\/+$/g, "");
  if (s.toLowerCase().endsWith(".md")) s = s.slice(0, -3);
  return s;
}

class Groups {
  private parent = new Map<string, string>();
  private members = new Map<string, Map<string, string>>();

  constructor(private readonly langOf: Map<string, string>) {}

  private find(slug: string): string {
    let root = slug;
    while (this.parent.get(root) !== root) {
      const next = this.parent.get(root);
      if (next === undefined) {
        this.parent.set(root, root);
        this.members.set(root, new Map([[this.langOf.get(root)!, root]]));
        return root;
      }
      root = next;
    }
    return root;
  }

  /** Merges the groups of `a` and `b` unless that would put two pages of one language together. */
  union(a: string, b: string, why: string): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return true;
    const ma = this.members.get(ra)!;
    const mb = this.members.get(rb)!;
    for (const [lang, slug] of mb) {
      const existing = ma.get(lang);
      if (existing !== undefined && existing !== slug) {
        warnOnce(
          `conflict:${[a, b].sort().join("|")}`,
          `Not linking "${a}" and "${b}" (${why}): the group already has a ${lang} page ("${existing}").`,
        );
        return false;
      }
    }
    for (const [lang, slug] of mb) ma.set(lang, slug);
    this.parent.set(rb, ra);
    this.members.delete(rb);
    return true;
  }

  groupOf(slug: string): Map<string, string> {
    return this.members.get(this.find(slug))!;
  }
}

function linkByFrontmatter(records: PageRecord[], groups: Groups, lookup: Map<string, string>) {
  const byKey = new Map<string, PageRecord[]>();
  for (const r of records) {
    if (!r.translationKey) continue;
    const key = r.translationKey.trim();
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }
  for (const [key, list] of byKey) {
    for (let i = 1; i < list.length; i++) {
      groups.union(list[0]!.slug, list[i]!.slug, `translationKey "${key}"`);
    }
  }

  for (const r of records) {
    if (!r.translations) continue;
    for (const [lang, target] of Object.entries(r.translations)) {
      if (typeof target !== "string") continue;
      const slug = lookup.get(normalizeTarget(target).toLowerCase());
      if (slug === undefined) {
        warnOnce(
          `missing-translation:${r.slug}:${lang}`,
          `"${r.slug}" declares a ${lang} translation "${target}", but no such page exists.`,
        );
        continue;
      }
      groups.union(r.slug, slug, `translations.${lang}`);
    }
  }
}

function linkByAliases(records: PageRecord[], groups: Groups) {
  // Every page is reachable by its normalized title and by its file name.
  const byName = new Map<string, PageRecord[]>();
  const add = (name: string, r: PageRecord) => {
    const key = normalizeTitle(name);
    if (!key) return;
    const list = byName.get(key) ?? [];
    if (!list.includes(r)) list.push(r);
    byName.set(key, list);
  };
  for (const r of records) {
    if (r.title) add(r.title, r);
    const file = r.slug.split("/").pop() ?? r.slug;
    if (file !== "index") add(file, r);
  }

  for (const r of records) {
    for (const alias of r.aliases ?? []) {
      if (typeof alias !== "string") continue;
      const candidates = (byName.get(normalizeTitle(alias)) ?? []).filter(
        (c) => c !== r && c.lang !== r.lang,
      );
      const perLang = new Map<string, PageRecord[]>();
      for (const c of candidates) {
        const list = perLang.get(c.lang) ?? [];
        list.push(c);
        perLang.set(c.lang, list);
      }
      for (const [lang, list] of perLang) {
        if (list.length > 1) {
          warnOnce(
            `ambiguous-alias:${r.slug}:${alias}`,
            `Alias "${alias}" of "${r.slug}" matches several ${lang} pages (${list
              .map((c) => `"${c.slug}"`)
              .join(", ")}); not linking it.`,
          );
          continue;
        }
        groups.union(r.slug, list[0]!.slug, `alias "${alias}"`);
      }
    }
  }
}

function linkByPath(records: PageRecord[], groups: Groups) {
  const byBase = new Map<string, PageRecord[]>();
  for (const r of records) {
    const list = byBase.get(r.baseSlug) ?? [];
    list.push(r);
    byBase.set(r.baseSlug, list);
  }
  for (const list of byBase.values()) {
    for (let i = 1; i < list.length; i++) {
      groups.union(list[0]!.slug, list[i]!.slug, `same path "${list[0]!.baseSlug}"`);
    }
  }
}

export function buildTranslationIndex(records: PageRecord[], opts: LinkOptions): TranslationIndex {
  const langOf = new Map<string, string>();
  const titles = new Map<string, string>();
  const lookup = new Map<string, string>();
  const unique: PageRecord[] = [];
  for (const r of records) {
    if (langOf.has(r.slug)) continue;
    langOf.set(r.slug, r.lang);
    lookup.set(r.slug.toLowerCase(), r.slug);
    if (r.title) titles.set(r.slug, r.title);
    unique.push(r);
  }

  const groups = new Groups(langOf);
  for (const strategy of opts.linking) {
    if (strategy === "frontmatter") linkByFrontmatter(unique, groups, lookup);
    else if (strategy === "aliases") linkByAliases(unique, groups);
    else if (strategy === "path") linkByPath(unique, groups);
  }

  const bySlug = new Map<string, TranslationMap>();
  const cache = new Map<Map<string, string>, TranslationMap>();
  for (const r of unique) {
    const group = groups.groupOf(r.slug);
    let map = cache.get(group);
    if (!map) {
      map = Object.fromEntries([...group.entries()].sort(([a], [b]) => a.localeCompare(b)));
      cache.set(group, map);
    }
    bySlug.set(r.slug, map);
  }
  return { bySlug, titles, langs: langOf };
}
