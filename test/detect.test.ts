import { describe, expect, it } from "vitest";
import { detectLanguage, languageSlug, matchLanguage } from "../src/language/detect";
import { resolveOptions } from "../src/options";

const opts = resolveOptions({
  languages: [
    { code: "de", locale: "de-DE" },
    { code: "en", locale: "en-US" },
  ],
  defaultLanguage: "en",
});

describe("matchLanguage", () => {
  it("matches code, locale and primary subtag case-insensitively", () => {
    expect(matchLanguage("de", opts.languages)?.code).toBe("de");
    expect(matchLanguage("DE-de", opts.languages)?.code).toBe("de");
    expect(matchLanguage("en-GB", opts.languages)?.code).toBe("en");
    expect(matchLanguage("fr", opts.languages)).toBeUndefined();
    expect(matchLanguage(42, opts.languages)).toBeUndefined();
  });
});

describe("detectLanguage", () => {
  it("detects the language folder and strips it from the base slug", () => {
    expect(detectLanguage({ slug: "de/notes/kaffee" }, opts)).toEqual({
      lang: "de",
      source: "folder",
      baseSlug: "notes/kaffee",
    });
    expect(detectLanguage({ slug: "de/index" }, opts).baseSlug).toBe("index");
  });

  it("does not treat unknown or nested folders as languages", () => {
    expect(detectLanguage({ slug: "fr/notes" }, opts).source).toBe("default");
    expect(detectLanguage({ slug: "notes/de/kaffee" }, opts).source).toBe("default");
    expect(detectLanguage({ slug: "de" }, opts).source).toBe("default");
  });

  it("detects a file suffix", () => {
    expect(detectLanguage({ slug: "notes/coffee.de" }, opts)).toEqual({
      lang: "de",
      source: "suffix",
      baseSlug: "notes/coffee",
    });
    expect(detectLanguage({ slug: "notes/v1.2" }, opts).source).toBe("default");
    expect(detectLanguage({ slug: ".de" }, opts).source).toBe("default");
  });

  it("reads the frontmatter key and falls back to the default language", () => {
    expect(detectLanguage({ slug: "notes/x", frontmatter: { lang: "de-DE" } }, opts)).toEqual({
      lang: "de",
      source: "frontmatter",
      baseSlug: "notes/x",
    });
    expect(detectLanguage({ slug: "notes/x" }, opts)).toEqual({
      lang: "en",
      source: "default",
      baseSlug: "notes/x",
    });
  });

  it("respects the strategy order and custom frontmatter keys", () => {
    const fmFirst = resolveOptions({
      languages: ["de", "en"],
      detection: ["frontmatter", "folder"],
      frontmatterKeys: { lang: "language" },
    });
    const hit = detectLanguage({ slug: "de/x", frontmatter: { language: "en" } }, fmFirst);
    expect(hit.lang).toBe("en");
    expect(hit.source).toBe("frontmatter");

    const folderOnly = resolveOptions({ languages: ["de", "en"], detection: ["folder"] });
    expect(detectLanguage({ slug: "x.de", frontmatter: { lang: "de" } }, folderOnly).lang).toBe(
      "de",
    );
    expect(detectLanguage({ slug: "x.de" }, folderOnly).source).toBe("default");
  });

  it("derives sibling slugs for folder and suffix conventions", () => {
    expect(languageSlug("notes/x", "en", "folder")).toBe("en/notes/x");
    expect(languageSlug("notes/x", "en", "suffix")).toBe("notes/x.en");
    expect(languageSlug("notes/x", "en", "frontmatter")).toBeUndefined();
    expect(languageSlug("notes/x", "en", "default")).toBeUndefined();
  });
});
