import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VFile } from "vfile";
import type { BuildCtx, FullSlug, ProcessedContent } from "@quartz-community/types";
import { MultilanguageEmitter, redirectHtml, rootRedirectHtml } from "../src/emitter";
import { resolveOptions } from "../src/options";
import { resetWarnings } from "../src/util/warn";
import type { MultilanguageOptions } from "../src/types";

const base: MultilanguageOptions = {
  languages: [
    { code: "de", native: "Deutsch", locale: "de-DE" },
    { code: "en", native: "English", locale: "en-US" },
  ],
  defaultLanguage: "en",
};

let out: string;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetWarnings();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  out = fs.mkdtempSync(path.join(os.tmpdir(), "multilanguage-"));
});
afterEach(() => {
  warn.mockRestore();
  fs.rmSync(out, { recursive: true, force: true });
});

function content(slug: string, frontmatter: Record<string, unknown> = {}): ProcessedContent {
  const file = new VFile({ value: "" });
  file.data.slug = slug as FullSlug;
  file.data.frontmatter = { title: slug, ...frontmatter } as never;
  return [{ type: "root", children: [] }, file];
}

function ctx(pages: ProcessedContent[], baseUrl?: string): BuildCtx {
  return {
    buildId: "b1",
    argv: { directory: "content", output: out, serve: false } as BuildCtx["argv"],
    cfg: { configuration: { baseUrl } },
    allSlugs: pages.map(([, f]) => f.data.slug!),
    allFiles: [],
    incremental: false,
  };
}

async function run(opts: MultilanguageOptions, pages: ProcessedContent[], baseUrl?: string) {
  const emitter = MultilanguageEmitter(opts);
  const files: string[] = [];
  for await (const f of emitter.emit(ctx(pages, baseUrl), pages, {
    css: [],
    js: [],
    additionalHead: [],
  }) as AsyncGenerator<string>) {
    files.push(path.relative(out, f));
  }
  return files;
}

function read(rel: string): string {
  return fs.readFileSync(path.join(out, rel), "utf8");
}

describe("MultilanguageEmitter", () => {
  it("writes the site data with translations", async () => {
    const files = await run(base, [
      content("de/kaffee", { translationKey: "k" }),
      content("en/coffee", { translationKey: "k" }),
      content("en/only"),
      content("index"),
    ]);
    expect(files).toEqual(["static/multilanguage.json"]);
    const data = JSON.parse(read("static/multilanguage.json"));
    expect(data.defaultLanguage).toBe("en");
    expect(data.languages.map((l: { home: string }) => l.home)).toEqual(["de/index", "index"]);
    expect(data.pages["de/kaffee"]).toEqual({
      lang: "de",
      translations: { de: "de/kaffee", en: "en/coffee" },
    });
    expect(data.pages["en/only"]).toEqual({ lang: "en" });
  });

  it("emits a root redirect only when no root index exists", async () => {
    const withIndex = await run({ ...base, rootRedirect: "browser" }, [content("index")]);
    expect(withIndex).not.toContain("index.html");

    const files = await run(
      { ...base, rootRedirect: "browser" },
      [content("de/index"), content("en/index")],
      "example.org",
    );
    expect(files).toContain("index.html");
    const html = read("index.html");
    expect(html).toContain('<html lang="en-US">');
    expect(html).toContain('href="./en/"');
    expect(html).toContain('href="./de/"');
    expect(html).toContain("navigator.languages");
    expect(html).toContain('localStorage.getItem("multilanguage-lang")');
    expect(html).toContain('hreflang="de-DE" href="https://example.org/de/"');
    expect(html).toContain('<noscript><meta http-equiv="refresh" content="0; url=./en/">');
  });

  it("uses a plain redirect for rootRedirect: default without remembering", async () => {
    await run({ ...base, rootRedirect: "default", rememberChoice: false }, [content("en/index")]);
    const html = read("index.html");
    expect(html).toContain('location.replace("./en/")');
    expect(html).not.toContain("navigator.languages");
    expect(html).not.toContain("localStorage");
  });

  it("emits fallback redirects for missing translations", async () => {
    const files = await run({ ...base, fallbackPages: "redirect" }, [
      content("en/coffee"),
      content("de/kaffee", { translationKey: "k" }),
      content("en/tea", { translationKey: "k" }),
      content("en/notes/index"),
      content("de/index"),
      content("x.en"),
    ]);
    expect(files.sort()).toEqual(
      ["de/coffee.html", "de/notes/index.html", "static/multilanguage.json", "x.de.html"]
        .filter((f) => f !== "de/notes/index.html")
        .sort(),
    );
    const html = read("de/coffee.html");
    expect(html).toContain('<html lang="en-US">');
    expect(html).toContain('href="../en/coffee"');
    expect(html).toContain('content="0; url=../en/coffee"');
    expect(html).toContain("Continue in English");
    expect(read("x.de.html")).toContain('href="./x.en"');
  });
});

describe("html helpers", () => {
  it("escapes redirect targets", () => {
    const html = redirectHtml({ title: "<t>", url: '../a"b', lang: "en", text: "go" });
    expect(html).toContain("<title>&lt;t&gt;</title>");
    expect(html).toContain('href="../a&quot;b"');
  });

  it("renders a language list on the root redirect", () => {
    const html = rootRedirectHtml(
      resolveOptions({ ...base, rootRedirect: "default" }),
      [
        { code: "de", native: "Deutsch", locale: "de-DE", href: "./de/" },
        { code: "en", native: "English", locale: "en-US", href: "./en/" },
      ],
      undefined,
    );
    expect(html).toContain('<a href="./de/" hreflang="de-DE" lang="de-DE">Deutsch</a>');
    expect(html).not.toContain('rel="alternate"');
  });
});
