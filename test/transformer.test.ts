import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { VFile } from "vfile";
import type { BuildCtx, FullSlug } from "@quartz-community/types";
import { MultilanguageTransformer, absoluteUrl } from "../src/transformer";
import { MultilanguageFilter } from "../src/filter";
import { registrySize, resetRegistry } from "../src/registry";
import { resetWarnings } from "../src/util/warn";
import type { MultilanguageOptions } from "../src/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VNode = { type: unknown; props: Record<string, any> };

const base: MultilanguageOptions = {
  languages: [
    { code: "de", native: "Deutsch", locale: "de-DE" },
    { code: "en", native: "English", locale: "en-US" },
  ],
  defaultLanguage: "en",
};

function ctx(allSlugs: string[], baseUrl?: string): BuildCtx {
  return {
    buildId: "b1",
    argv: { directory: "content", output: "public", serve: false } as BuildCtx["argv"],
    cfg: { configuration: { baseUrl, locale: "en-US" } },
    allSlugs: allSlugs as FullSlug[],
    allFiles: [],
    incremental: false,
  };
}

function markdownFile(slug: string, frontmatter: Record<string, unknown> = {}) {
  const file = new VFile({ value: "# hi" });
  file.data.slug = slug as FullSlug;
  file.data.frontmatter = { title: "T", ...frontmatter } as never;
  return file;
}

async function runMarkdown(opts: MultilanguageOptions, file: VFile, c: BuildCtx) {
  const plugin = MultilanguageTransformer(opts);
  const processor = unified()
    .use(remarkParse)
    .use(plugin.markdownPlugins!(c) as never);
  const tree = processor.parse(file);
  await processor.run(tree, file);
  return file.data as Record<string, any>;
}

async function runHtml(opts: MultilanguageOptions, html: string, slug: string, c: BuildCtx) {
  const plugin = MultilanguageTransformer(opts);
  const file = new VFile({ value: html });
  file.data.slug = slug as FullSlug;
  file.data.frontmatter = { title: "T" } as never;
  file.data.links = [];
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(plugin.htmlPlugins!(c) as never)
    .use(rehypeStringify);
  const tree = processor.parse(file);
  const out = await processor.run(tree, file);
  return { html: processor.stringify(out as never), data: file.data as Record<string, any> };
}

function flatten(node: unknown): VNode[] {
  if (!node || typeof node !== "object") return [];
  const n = node as VNode;
  const kids = n.props?.children;
  const list = Array.isArray(kids) ? kids : kids ? [kids] : [];
  return typeof n.type === "string" ? [n, ...list.flatMap(flatten)] : list.flatMap(flatten);
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  resetWarnings();
  resetRegistry();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("markdown stage", () => {
  it("stores language data and sets frontmatter.lang", async () => {
    const data = await runMarkdown(base, markdownFile("de/notes/x"), ctx([]));
    expect(data.multilanguage).toEqual({
      lang: "de",
      source: "folder",
      baseSlug: "notes/x",
      translationKey: undefined,
      translations: undefined,
    });
    expect(data.frontmatter.lang).toBe("de-DE");
  });

  it("keeps an explicit frontmatter lang and reads translation fields", async () => {
    const data = await runMarkdown(
      base,
      markdownFile("x", { lang: "de", translationKey: " k ", translations: { EN: "en/x" } }),
      ctx([]),
    );
    expect(data.frontmatter.lang).toBe("de");
    expect(data.multilanguage.lang).toBe("de");
    expect(data.multilanguage.translationKey).toBe("k");
    expect(data.multilanguage.translations).toEqual({ en: "en/x" });
  });
});

describe("html stage", () => {
  it("returns no plugins when nothing is enabled", () => {
    expect(MultilanguageTransformer(base).htmlPlugins!(ctx([]))).toEqual([]);
  });

  it("rewrites cross-language links when a same-language page exists", async () => {
    const c = ctx(["de/a", "de/b", "en/b", "en/c"]);
    const { html, data } = await runHtml(
      { ...base, rewriteCrossLanguageLinks: true },
      '<a href="../../en/b#top" class="internal" data-slug="en/b">b</a>' +
        '<a href="../../en/c" class="internal" data-slug="en/c">c</a>' +
        '<a href="https://x.test" class="external">x</a>',
      "de/a",
      c,
    );
    expect(html).toContain('href="../de/b#top"');
    expect(html).toContain('data-slug="de/b"');
    expect(html).toContain('data-slug="en/c"');
    expect(data.links).toEqual([]);
  });

  it("handles the raw data-slug property name written by crawl-links", async () => {
    const plugin = MultilanguageTransformer({ ...base, rewriteCrossLanguageLinks: true });
    const [rehypePlugin] = plugin.htmlPlugins!(ctx(["de/a", "de/b", "en/b"])) as [() => unknown];
    const run = rehypePlugin() as (tree: unknown, file: VFile) => void;
    const file = new VFile({ value: "" });
    file.data.slug = "de/a" as FullSlug;
    const anchor = {
      type: "element",
      tagName: "a",
      properties: { href: "../en/b", "data-slug": "en/b", className: ["internal"] },
      children: [],
    };
    run({ type: "root", children: [anchor] }, file);
    expect(anchor.properties["data-slug"]).toBe("de/b");
    expect(anchor.properties.href).toBe("../de/b");
  });

  it("lets the default language fall back to un-prefixed pages", async () => {
    const c = ctx(["a", "b", "de/b"]);
    const { html } = await runHtml(
      { ...base, rewriteCrossLanguageLinks: true },
      '<a class="internal" href="./de/b" data-slug="de/b">b</a>',
      "a",
      c,
    );
    expect(html).toContain('data-slug="b"');
  });

  it("injects a hidden notice with one paragraph per other language", async () => {
    const { html } = await runHtml(
      { ...base, missingTranslationNotice: true, availableTranslationNotice: true },
      "<p>body</p>",
      "de/a",
      ctx(["de/a"]),
    );
    expect(html.startsWith("<blockquote")).toBe(true);
    expect(html).toContain('class="callout multilanguage-notice"');
    expect(html).toContain('data-ml-lang="de"');
    expect(html).toContain('data-ml-slug="de/a"');
    // No text in the tree: it would leak into descriptions and the search index.
    expect(html).toContain('<div class="callout-content"></div></blockquote><p>body</p>');
    expect(html).not.toContain("available");
  });
});

describe("externalResources", () => {
  it("ships the client script with its configuration", () => {
    const res = MultilanguageTransformer({ ...base, localizeDates: true }).externalResources!(
      ctx(["de/index", "index"]),
    )!;
    expect(res.js).toHaveLength(1);
    const js = res.js![0] as { script: string; loadTime: string };
    expect(js.loadTime).toBe("afterDOMReady");
    expect(js.script).toContain("window.__quartzMultilanguage=");
    const cfgJson = js.script.split("\n")[0]!.replace("window.__quartzMultilanguage=", "");
    const cfg = JSON.parse(cfgJson.replace(/;$/, ""));
    expect(cfg.languages.map((l: { home: string }) => l.home)).toEqual(["de/index", "index"]);
    expect(cfg.localizeDates).toBe(true);
    expect(cfg.notices.de.missing).toBe("Diese Seite ist nur auf {{}} verfügbar.");
    expect(cfg.notices.en.available).toBe("This page is also available in {{}}.");
    expect(res.css).toEqual([]);
  });

  it("renders hreflang and og:locale from the registry", () => {
    const c = ctx(["de/kaffee", "en/coffee", "en/only"], "https://example.org/");
    const opts = { ...base, seo: { xDefault: "en" } };
    const filter = MultilanguageFilter(opts);
    const files = [
      markdownFile("de/kaffee", { translationKey: "k" }),
      markdownFile("en/coffee", { translationKey: "k" }),
      markdownFile("en/only"),
    ];
    for (const f of files) filter.shouldPublish(c, [{} as never, f]);

    const res = MultilanguageTransformer(opts).externalResources!(c)!;
    const headFor = res.additionalHead![0] as (d: unknown) => VNode | null;
    const tags = flatten(headFor(files[0]!.data));
    const links = tags.filter((t) => t.type === "link").map((t) => t.props);
    const metas = tags.filter((t) => t.type === "meta").map((t) => t.props);
    expect(metas).toEqual([
      { property: "og:locale", content: "de_DE" },
      { property: "og:locale:alternate", content: "en_US" },
    ]);
    expect(links).toEqual([
      { rel: "alternate", hreflang: "de-DE", href: "https://example.org/de/kaffee" },
      { rel: "alternate", hreflang: "en-US", href: "https://example.org/en/coffee" },
      { rel: "alternate", hreflang: "x-default", href: "https://example.org/en/coffee" },
    ]);

    // A page without translations gets og:locale only.
    const only = flatten(headFor(files[2]!.data));
    expect(only.filter((t) => t.type === "link")).toHaveLength(0);
    expect(only.filter((t) => t.type === "meta")).toHaveLength(1);
  });

  it("falls back to the slug convention without a registry and skips hreflang without baseUrl", () => {
    const c = ctx(["de/x", "en/x"]);
    const res = MultilanguageTransformer(base).externalResources!(c)!;
    const headFor = res.additionalHead![0] as (d: unknown) => VNode | null;
    const tags = flatten(headFor({ slug: "de/x", frontmatter: {} }));
    expect(tags.filter((t) => t.type === "link")).toHaveLength(0);
    expect(tags.filter((t) => t.type === "meta").map((t) => t.props.content)).toEqual([
      "de_DE",
      "en_US",
    ]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("baseUrl"));
  });

  it("builds absolute URLs", () => {
    expect(absoluteUrl("example.org", "index")).toBe("https://example.org/");
    expect(absoluteUrl("https://example.org/sub/", "de/index")).toBe("https://example.org/sub/de/");
    expect(absoluteUrl("example.org", "de/notes/x")).toBe("https://example.org/de/notes/x");
  });
});

describe("filter", () => {
  it("publishes everything by default and only selected languages otherwise", () => {
    const c = ctx([]);
    const all = MultilanguageFilter(base);
    expect(all.shouldPublish(c, [{} as never, markdownFile("de/x")])).toBe(true);

    const deOnly = MultilanguageFilter({ ...base, publishLanguages: ["de"] });
    resetRegistry();
    expect(deOnly.shouldPublish(c, [{} as never, markdownFile("de/x")])).toBe(true);
    expect(deOnly.shouldPublish(c, [{} as never, markdownFile("en/x")])).toBe(false);
    expect(deOnly.shouldPublish(c, [{} as never, markdownFile("x")])).toBe(false);
    expect(registrySize()).toBe(1);
  });
});
