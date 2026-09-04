// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Runs the browser script the way Quartz does: compiled to plain JS, evaluated once per page
 * load, driven by the `nav` event. jsdom provides window/document/localStorage.
 */
type ClientConfig = {
  languages: { code: string; label: string; native: string; locale: string; home: string }[];
  defaultLanguage: string;
  rememberChoice: boolean;
  storageKey: string;
  noticeMissing: boolean;
  noticeAvailable: boolean;
  localizeDates: boolean;
  dataPath: string;
  notices: Record<string, { missing: string; available: string }>;
};

const cfg: ClientConfig = {
  languages: [
    { code: "de", label: "German", native: "Deutsch", locale: "de-DE", home: "de/index" },
    { code: "en", label: "English", native: "English", locale: "en-US", home: "en/index" },
  ],
  defaultLanguage: "en",
  rememberChoice: true,
  storageKey: "multilanguage-lang",
  noticeMissing: true,
  noticeAvailable: true,
  localizeDates: true,
  dataPath: "static/multilanguage.json",
  notices: {
    de: {
      missing: "Diese Seite ist nur auf {{}} verfügbar.",
      available: "Diese Seite gibt es auch auf {{}}.",
    },
    en: {
      missing: "This page is only available in {{}}.",
      available: "This page is also available in {{}}.",
    },
  },
};

const cleanups: (() => void)[] = [];

function setLanguages(langs: string[]) {
  Object.defineProperty(window.navigator, "languages", { value: langs, configurable: true });
  Object.defineProperty(window.navigator, "language", { value: langs[0], configurable: true });
}

function mount(translations: Record<string, string>) {
  document.documentElement.lang = "de-DE";
  document.body.dataset.slug = "de/notizen/kaffee";
  document.body.dataset.basepath = "";
  document.body.innerHTML = `
    <nav class="multilanguage-switcher style-links" data-lang="de"
         data-translations='${JSON.stringify(translations)}'>
      <ul><li><a href="../../en/notes/coffee" data-lang="en">English</a></li></ul>
    </nav>
    <article>
      <blockquote class="callout multilanguage-notice" data-ml-lang="de" data-ml-slug="de/notizen/kaffee" hidden>
        <div class="callout-content"></div>
      </blockquote>
      <p class="content-meta"><time datetime="2026-01-04T23:00:00.000Z">Jan 05, 2026</time></p>
    </article>`;
}

async function nav() {
  for (const fn of cleanups.splice(0)) fn();
  document.dispatchEvent(new CustomEvent("nav", { detail: { url: "de/notizen/kaffee" } }) as never);
  await new Promise((r) => setTimeout(r, 0));
}

beforeAll(() => {
  // Neither jsdom under vitest nor Node's shadowing global provide a usable localStorage
  // here, so install a minimal in-memory Storage on both window and globalThis.
  const store = new Map<string, string>();
  const memoryStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  for (const target of [globalThis, window]) {
    Object.defineProperty(target, "localStorage", { value: memoryStorage, configurable: true });
  }
  (window as unknown as { __quartzMultilanguage: ClientConfig }).__quartzMultilanguage = cfg;
  window.addCleanup = (fn) => cleanups.push(fn as () => void);
  const source = fs.readFileSync(
    path.join(__dirname, "../src/scripts/multilanguage.inline.ts"),
    "utf8",
  );
  // esbuild refuses to run inside jsdom's realm, so strip types with the TypeScript compiler.
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  });
  new Function(outputText)();
});

beforeEach(() => {
  localStorage.clear();
  cfg.noticeMissing = true;
  cfg.noticeAvailable = true;
  cfg.localizeDates = true;
  cfg.rememberChoice = true;
});

describe("client script", () => {
  it("shows the 'available' notice for a browser language with a translation", async () => {
    setLanguages(["en-US", "en"]);
    mount({ de: "de/notizen/kaffee", en: "en/notes/coffee" });
    await nav();
    const notice = document.querySelector<HTMLElement>(".multilanguage-notice")!;
    expect(notice.hidden).toBe(false);
    const p = notice.querySelector<HTMLElement>("p")!;
    expect(p.lang).toBe("en-US");
    expect(p.textContent).toBe("This page is also available in English.");
    expect(notice.querySelector("[data-ml-languages]")).toBeNull();
    const link = p.querySelector<HTMLAnchorElement>("a[data-ml-link]")!;
    expect(link.getAttribute("href")).toBe("/en/notes/coffee");
    expect(link.hreflang).toBe("en");
  });

  it("shows the 'missing' notice listing the available languages", async () => {
    setLanguages(["en-GB"]);
    mount({ de: "de/notizen/kaffee" });
    await nav();
    const notice = document.querySelector<HTMLElement>(".multilanguage-notice")!;
    expect(notice.hidden).toBe(false);
    expect(notice.querySelector("p")!.textContent).toBe("This page is only available in Deutsch.");
    expect(notice.querySelector("[data-ml-languages]")!.textContent).toBe("Deutsch");
    expect(notice.querySelector("a[data-ml-link]")).toBeNull();
  });

  it("stays hidden when the visitor prefers the page language or notices are off", async () => {
    setLanguages(["de-AT"]);
    mount({ de: "de/notizen/kaffee" });
    await nav();
    expect(document.querySelector<HTMLElement>(".multilanguage-notice")!.hidden).toBe(true);

    setLanguages(["en"]);
    cfg.noticeMissing = false;
    mount({ de: "de/notizen/kaffee" });
    await nav();
    expect(document.querySelector<HTMLElement>(".multilanguage-notice")!.hidden).toBe(true);
  });

  it("prefers the remembered choice over the browser language", async () => {
    setLanguages(["de"]);
    localStorage.setItem(cfg.storageKey, "en");
    mount({ de: "de/notizen/kaffee", en: "en/notes/coffee" });
    await nav();
    expect(document.querySelector<HTMLElement>(".multilanguage-notice")!.hidden).toBe(false);
  });

  it("remembers a click on a switcher link", async () => {
    setLanguages(["de"]);
    mount({ de: "de/notizen/kaffee", en: "en/notes/coffee" });
    await nav();
    const link = document.querySelector<HTMLAnchorElement>(".multilanguage-switcher a")!;
    link.addEventListener("click", (e) => e.preventDefault());
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(localStorage.getItem(cfg.storageKey)).toBe("en");

    cfg.rememberChoice = false;
    localStorage.clear();
    mount({ de: "de/notizen/kaffee", en: "en/notes/coffee" });
    await nav();
    const again = document.querySelector<HTMLAnchorElement>(".multilanguage-switcher a")!;
    again.addEventListener("click", (e) => e.preventDefault());
    again.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(localStorage.getItem(cfg.storageKey)).toBeNull();
  });

  it("re-formats <time> elements in the page language", async () => {
    setLanguages(["de"]);
    mount({ de: "de/notizen/kaffee" });
    await nav();
    const time = document.querySelector<HTMLTimeElement>("time")!;
    const expected = new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date("2026-01-04T23:00:00.000Z"));
    expect(time.textContent).toBe(expected);
    expect(time.textContent).not.toBe("Jan 05, 2026");
    expect(time.dataset.mlLocalized).toBe("de-DE");
  });

  it("syncs <html lang> with the page language after SPA navigation", async () => {
    setLanguages(["de"]);
    mount({ de: "de/notizen/kaffee" });
    document.documentElement.lang = "en-US"; // stale value left by the previous page
    await nav();
    expect(document.documentElement.lang).toBe("de-DE");
  });

  it("registers cleanups for every listener", async () => {
    setLanguages(["de"]);
    mount({ de: "de/notizen/kaffee", en: "en/notes/coffee" });
    await nav();
    expect(cleanups.length).toBeGreaterThan(0);
  });
});
