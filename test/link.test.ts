import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildTranslationIndex,
  normalizeTarget,
  normalizeTitle,
  type PageRecord,
} from "../src/language/link";
import { resetWarnings } from "../src/util/warn";

const all = { linking: ["frontmatter", "aliases", "path"] as const };

function page(slug: string, lang: string, extra: Partial<PageRecord> = {}): PageRecord {
  const base = slug.startsWith(`${lang}/`) ? slug.slice(lang.length + 1) : slug;
  return { slug, lang, baseSlug: base, ...extra };
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  resetWarnings();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("normalizers", () => {
  it("normalizes titles for comparison", () => {
    expect(normalizeTitle(" Kaffee  Bohnen ")).toBe("kaffee-bohnen");
    expect(normalizeTitle("kaffee_bohnen")).toBe("kaffee-bohnen");
    expect(normalizeTitle("Café")).toBe(normalizeTitle("Café".normalize("NFD")));
  });

  it("normalizes frontmatter translation targets", () => {
    expect(normalizeTarget("[[en/coffee|Coffee]]")).toBe("en/coffee");
    expect(normalizeTarget("/en/coffee.md")).toBe("en/coffee");
    expect(normalizeTarget(" en/coffee/ ")).toBe("en/coffee");
  });
});

describe("buildTranslationIndex", () => {
  it("links pages by path", () => {
    const index = buildTranslationIndex(
      [page("de/notes/kaffee", "de"), page("en/notes/kaffee", "en"), page("en/other", "en")],
      { linking: ["path"] },
    );
    expect(index.bySlug.get("de/notes/kaffee")).toEqual({
      de: "de/notes/kaffee",
      en: "en/notes/kaffee",
    });
    expect(index.bySlug.get("en/other")).toEqual({ en: "en/other" });
    expect(index.bySlug.get("de/notes/kaffee")).toBe(index.bySlug.get("en/notes/kaffee"));
  });

  it("links the default language without a folder to prefixed pages", () => {
    const index = buildTranslationIndex(
      [page("notes/coffee", "en"), page("de/notes/coffee", "de")],
      { linking: ["path"] },
    );
    expect(index.bySlug.get("notes/coffee")).toEqual({ de: "de/notes/coffee", en: "notes/coffee" });
  });

  it("links by translationKey and by explicit translations", () => {
    const index = buildTranslationIndex(
      [
        page("de/kaffee", "de", { translationKey: "coffee" }),
        page("en/coffee", "en", { translationKey: "coffee" }),
        page("fr/cafe", "fr", { translations: { en: "[[en/coffee]]" } }),
      ],
      { linking: ["frontmatter"] },
    );
    expect(index.bySlug.get("fr/cafe")).toEqual({
      de: "de/kaffee",
      en: "en/coffee",
      fr: "fr/cafe",
    });
  });

  it("resolves translation targets case-insensitively and warns about missing ones", () => {
    const index = buildTranslationIndex(
      [
        page("de/kaffee", "de", { translations: { en: "EN/Coffee", fr: "fr/nope" } }),
        page("en/coffee", "en"),
      ],
      { linking: ["frontmatter"] },
    );
    expect(index.bySlug.get("de/kaffee")).toEqual({ de: "de/kaffee", en: "en/coffee" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"fr/nope"'));
  });

  it("links by aliases matching titles or file names in other languages", () => {
    const index = buildTranslationIndex(
      [
        page("de/kaffee", "de", { title: "Kaffee", aliases: ["Coffee"] }),
        page("en/coffee", "en", { title: "Coffee" }),
        page("fr/cafe", "fr", { title: "Café", aliases: ["kaffee"] }),
      ],
      { linking: ["aliases"] },
    );
    expect(index.bySlug.get("en/coffee")).toEqual({
      de: "de/kaffee",
      en: "en/coffee",
      fr: "fr/cafe",
    });
  });

  it("ignores ambiguous aliases and same-language matches", () => {
    const index = buildTranslationIndex(
      [
        page("de/kaffee", "de", { aliases: ["Coffee"] }),
        page("en/coffee", "en", { title: "Coffee" }),
        page("en/drinks/coffee", "en", { title: "Coffee" }),
        page("de/other", "de", { title: "Coffee" }),
      ],
      { linking: ["aliases"] },
    );
    expect(index.bySlug.get("de/kaffee")).toEqual({ de: "de/kaffee" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("matches several en pages"));
  });

  it("refuses to merge two pages of the same language and warns once", () => {
    const index = buildTranslationIndex(
      [
        page("de/a", "de", { translationKey: "k" }),
        page("de/b", "de", { translationKey: "k" }),
        page("en/a", "en", { translationKey: "k" }),
      ],
      all,
    );
    expect(index.bySlug.get("de/a")).toEqual({ de: "de/a", en: "en/a" });
    expect(index.bySlug.get("de/b")).toEqual({ de: "de/b" });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("applies strategies in order so frontmatter wins over path", () => {
    const index = buildTranslationIndex(
      [
        page("de/x", "de", { translationKey: "k" }),
        page("en/y", "en", { translationKey: "k" }),
        page("en/x", "en"),
      ],
      all,
    );
    expect(index.bySlug.get("de/x")).toEqual({ de: "de/x", en: "en/y" });
    expect(index.bySlug.get("en/x")).toEqual({ en: "en/x" });
  });

  it("keeps titles and languages for lookups", () => {
    const index = buildTranslationIndex([page("de/x", "de", { title: "X" })], all);
    expect(index.titles.get("de/x")).toBe("X");
    expect(index.langs.get("de/x")).toBe("de");
  });
});
