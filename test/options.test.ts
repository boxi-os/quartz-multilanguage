import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flagEmoji, resolveOptions } from "../src/options";
import { resetWarnings } from "../src/util/warn";

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  resetWarnings();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  delete process.env.QUARTZ_LANGS;
});
afterEach(() => {
  warn.mockRestore();
  delete process.env.QUARTZ_LANGS;
});

describe("resolveOptions", () => {
  it("fills defaults", () => {
    const opts = resolveOptions();
    expect(opts.languages).toEqual([
      { code: "en", label: "EN", native: "EN", locale: "en", home: undefined, flag: "EN" },
    ]);
    expect(opts.defaultLanguage).toBe("en");
    expect(opts.detection).toEqual(["folder", "suffix", "frontmatter"]);
    expect(opts.linking).toEqual(["frontmatter", "aliases", "path"]);
    expect(opts.switcher).toMatchObject({ style: "links", label: "label", missing: "home" });
    expect(opts.seo).toEqual({ hreflang: true, ogLocale: true, xDefault: "default" });
  });

  it("normalizes language entries", () => {
    const opts = resolveOptions({
      languages: ["DE", { code: "en", label: "English", locale: "en-GB", home: "/en/start/" }],
    });
    expect(opts.languages[0]).toMatchObject({
      code: "de",
      label: "DE",
      native: "DE",
      locale: "de",
    });
    expect(opts.languages[1]).toMatchObject({
      code: "en",
      native: "English",
      locale: "en-GB",
      home: "en/start",
      flag: "🇬🇧",
    });
    expect(opts.defaultLanguage).toBe("de");
  });

  it("warns and recovers from bad input", () => {
    const opts = resolveOptions({
      languages: ["de", "de", { code: "" } as never],
      defaultLanguage: "fr",
      detection: ["folder", "bogus" as never],
      rootRedirect: "sometimes" as never,
      seo: { xDefault: "fr" },
      publishLanguages: ["de", "xx"],
    });
    expect(opts.languages.map((l) => l.code)).toEqual(["de"]);
    expect(opts.defaultLanguage).toBe("de");
    expect(opts.detection).toEqual(["folder"]);
    expect(opts.rootRedirect).toBe("none");
    expect(opts.seo.xDefault).toBe("default");
    expect(opts.publishLanguages).toEqual(["de"]);
    expect(warn.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it("accepts a language code for xDefault and an empty detection list", () => {
    const opts = resolveOptions({
      languages: ["de", "en"],
      seo: { xDefault: "EN" },
      detection: [],
    });
    expect(opts.seo.xDefault).toBe("en");
    expect(opts.detection).toEqual([]);
  });

  it("lets QUARTZ_LANGS override publishLanguages", () => {
    process.env.QUARTZ_LANGS = "en, de";
    const opts = resolveOptions({ languages: ["de", "en"], publishLanguages: ["de"] });
    expect(opts.publishLanguages).toEqual(["en", "de"]);
  });

  it("derives flag emoji from regions", () => {
    expect(flagEmoji("de")).toBe("🇩🇪");
    expect(flagEmoji("419")).toBeUndefined();
  });
});
