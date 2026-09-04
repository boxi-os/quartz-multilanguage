import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuartzComponentProps } from "@quartz-community/types";
import LanguageSwitcher from "../src/components/LanguageSwitcher";
import { languageExplorerFilter } from "../src/explorer";
import { resetWarnings } from "../src/util/warn";
import type { MultilanguageOptions } from "../src/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VNode = { type: unknown; props: Record<string, any> };

const base: MultilanguageOptions = {
  languages: [
    { code: "de", label: "German", native: "Deutsch", locale: "de-DE" },
    { code: "en", label: "English", native: "English", locale: "en-US" },
    { code: "fr", label: "French", native: "Français", locale: "fr-FR" },
  ],
  defaultLanguage: "en",
};

function file(slug: string, frontmatter: Record<string, unknown> = {}) {
  return { slug, frontmatter: { title: slug, ...frontmatter } };
}

const allFiles = [
  file("de/kaffee", { title: "Kaffee", translationKey: "k" }),
  file("en/coffee", { title: "Coffee", translationKey: "k" }),
  file("de/index"),
  file("en/index"),
  file("fr/index"),
  file("en/only"),
];

function makeProps(slug: string, overrides: Record<string, unknown> = {}): QuartzComponentProps {
  const fileData = allFiles.find((f) => f.slug === slug) ?? file(slug);
  return {
    ctx: { argv: { serve: false } },
    fileData,
    cfg: { pageTitle: "Site", locale: "en-US" },
    externalResources: { css: [], js: [], additionalHead: [] },
    children: [],
    tree: {},
    allFiles,
    ...overrides,
  } as unknown as QuartzComponentProps;
}

function render(opts: MultilanguageOptions, slug: string, overrides = {}): VNode | null {
  return LanguageSwitcher(opts)(makeProps(slug, overrides)) as VNode | null;
}

function items(node: VNode): VNode[] {
  const ul = (Array.isArray(node.props.children) ? node.props.children : [node.props.children])
    .flat()
    .find((c: VNode) => c?.type === "ul") as VNode;
  const li = ul.props.children as VNode[];
  // Entries are the element inside each <li>; separator <li>s carry only text and stand for themselves.
  return li.map((l) => {
    const c = l.props.children;
    const inner = Array.isArray(c) ? c[0] : c;
    return inner && typeof inner === "object" ? (inner as VNode) : l;
  });
}

function text(node: VNode): string {
  const c = node.props.children;
  return Array.isArray(c) ? c.join("") : String(c);
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  resetWarnings();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("LanguageSwitcher", () => {
  it("renders links to translations, the current language and home fallbacks", () => {
    const node = render(base, "de/kaffee", { displayClass: "desktop-only" })!;
    expect(node.type).toBe("nav");
    expect(node.props.class).toBe("desktop-only multilanguage-switcher style-links");
    expect(node.props["aria-label"]).toBe("Sprache");
    expect(node.props["data-lang"]).toBe("de");
    expect(JSON.parse(node.props["data-translations"])).toEqual({
      de: "de/kaffee",
      en: "en/coffee",
    });

    const list = items(node);
    expect(list.map((i) => i.type)).toEqual(["span", "li", "a", "li", "a"]);
    expect(list[0]!.props["aria-current"]).toBe("page");
    expect(text(list[0]!)).toBe("German");
    expect(list[1]!.props.class).toBe("separator");
    expect(list[2]!.props.href).toBe("../en/coffee");
    expect(list[2]!.props["data-lang"]).toBe("en");
    expect(list[2]!.props.hreflang).toBe("en-US");
    expect(list[4]!.props.href).toBe("../fr/");
    expect(list[4]!.props.class).toBe("fallback");
    expect(list[4]!.props.title).toBe(
      "Französisch (Startseite)".replace("Französisch", "Français"),
    );
  });

  it("supports label modes and hiding or disabling missing languages", () => {
    const codes = render(
      { ...base, switcher: { label: "code", showCurrent: false } },
      "de/kaffee",
    )!;
    expect(items(codes).map(text)).toEqual(["EN", "|", "FR"]);

    const native = render({ ...base, switcher: { label: "native", separator: "" } }, "de/kaffee")!;
    expect(items(native).map(text)).toEqual(["Deutsch", "English", "Français"]);

    const titles = render({ ...base, switcher: { label: "translatedTitle" } }, "de/kaffee")!;
    expect(items(titles).map(text)).toEqual(["Kaffee", "|", "Coffee", "|", "Français"]);

    const hidden = render({ ...base, switcher: { missing: "hide" } }, "de/kaffee")!;
    expect(items(hidden).map(text)).toEqual(["German", "|", "English"]);

    const disabled = render({ ...base, switcher: { missing: "disabled" } }, "de/kaffee")!;
    const last = items(disabled).at(-1)!;
    expect(last.type).toBe("span");
    expect(last.props.class).toBe("disabled");
    expect(last.props.title).toBe("Nicht auf Français verfügbar");
  });

  it("renders flags and a dropdown", () => {
    const flags = render({ ...base, switcher: { style: "flags" } }, "en/coffee")!;
    expect(items(flags).map(text)).toEqual(["🇩🇪", "🇺🇸", "🇫🇷"]);
    expect(items(flags)[0]!.props.title).toBe("Deutsch");

    const dropdown = render({ ...base, switcher: { style: "dropdown" } }, "en/coffee")!;
    expect(dropdown.type).toBe("details");
    const summary = dropdown.props.children[0] as VNode;
    expect(summary.type).toBe("summary");
    expect(text(summary)).toBe("English");
    expect(summary.props["aria-label"]).toBe("Language");
    expect(items(dropdown).map(text)).toEqual(["German", "English", "French"]);
  });

  it("renders nothing for single-language sites or pages without alternatives", () => {
    expect(render({ languages: ["en"] }, "en/coffee")).toBeNull();
    const nothing = render({ ...base, switcher: { missing: "hide" } }, "en/only");
    expect(nothing).toBeNull();
  });

  it("uses a custom title and works without allFiles", () => {
    const node = render({ ...base, switcher: { title: "Lang" } }, "en/only", { allFiles: [] })!;
    expect(node.props["aria-label"]).toBe("Lang");
    expect(items(node).map((i) => i.props.href ?? "")).toEqual(["../de/", "", "", "", "../fr/"]);
  });
});

describe("languageExplorerFilter", () => {
  it("keeps pages and folders of one language", () => {
    const keep = languageExplorerFilter("de", base);
    expect(keep({ slug: "de/kaffee" })).toBe(true);
    expect(keep({ slug: "en/coffee" })).toBe(false);
    expect(keep({ slug: "shared" })).toBe(false);
    expect(keep({ slug: "de", isFolder: true, children: [{ slug: "de/kaffee" }] })).toBe(true);
    expect(keep({ slug: "en", isFolder: true, children: [{ slug: "en/coffee" }] })).toBe(false);
    expect(keep({ slug: "en", isFolder: true, children: [] })).toBe(false);
    expect(keep({ slug: "misc", isFolder: true, children: [] })).toBe(true);
    expect(keep({})).toBe(true);
  });

  it("tolerates being called without arguments", () => {
    expect(typeof languageExplorerFilter()).toBe("function");
  });
});
