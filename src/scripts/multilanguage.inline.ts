/**
 * Client-side part of quartz-multilanguage. Injected on every page by the transformer's
 * `externalResources`; the configuration is written to `window.__quartzMultilanguage`
 * right before this script.
 */
type ClientLanguage = { code: string; label: string; native: string; locale: string; home: string };
type ClientConfig = {
  languages: ClientLanguage[];
  defaultLanguage: string;
  rememberChoice: boolean;
  storageKey: string;
  noticeMissing: boolean;
  noticeAvailable: boolean;
  localizeDates: boolean;
  dataPath: string;
};
type PageData = { lang: string; translations?: Record<string, string> };
type SiteData = { pages: Record<string, PageData> };

// No `declare global` here: the inline-script loader strips `export` statements, so this
// file must stay a script, not a module.
const cfg: ClientConfig | undefined = (
  window as unknown as { __quartzMultilanguage?: ClientConfig }
).__quartzMultilanguage;
let siteData: Promise<SiteData | undefined> | undefined;

function basePath(): string {
  return document.body?.dataset?.basepath ?? "";
}

function slugToPath(slug: string): string {
  const trimmed = slug.replace(/(^|\/)index$/, "$1");
  return `${basePath()}/${trimmed}`;
}

function matchCode(value: string | null | undefined): string | undefined {
  if (!cfg || !value) return undefined;
  const v = value.trim().toLowerCase();
  const primary = v.split(/[-_]/)[0];
  const hit =
    cfg.languages.find((l) => l.code === v) ??
    cfg.languages.find((l) => l.locale.toLowerCase() === v) ??
    cfg.languages.find((l) => l.code === primary);
  return hit?.code;
}

function storedChoice(): string | undefined {
  if (!cfg?.rememberChoice) return undefined;
  try {
    return matchCode(localStorage.getItem(cfg.storageKey));
  } catch {
    return undefined;
  }
}

function preferredLanguage(): string | undefined {
  const stored = storedChoice();
  if (stored) return stored;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const c of candidates) {
    const code = matchCode(c);
    if (code) return code;
  }
  return undefined;
}

function nativeName(code: string): string {
  return cfg?.languages.find((l) => l.code === code)?.native ?? code.toUpperCase();
}

function currentSlug(): string {
  return document.body?.dataset?.slug ?? "";
}

function pageLanguage(): string | undefined {
  const switcher = document.querySelector<HTMLElement>(".multilanguage-switcher[data-lang]");
  const notice = document.querySelector<HTMLElement>(".multilanguage-notice[data-ml-lang]");
  return (
    switcher?.dataset.lang ??
    notice?.dataset.mlLang ??
    matchCode(document.documentElement.lang) ??
    cfg?.defaultLanguage
  );
}

async function translationsFor(slug: string): Promise<Record<string, string>> {
  const switcher = document.querySelector<HTMLElement>(
    ".multilanguage-switcher[data-translations]",
  );
  if (switcher?.dataset.translations) {
    try {
      return JSON.parse(switcher.dataset.translations) as Record<string, string>;
    } catch {
      // fall through to the site data
    }
  }
  if (!cfg) return {};
  siteData ??= fetch(`${basePath()}/${cfg.dataPath}`)
    .then((r) => (r.ok ? (r.json() as Promise<SiteData>) : undefined))
    .catch(() => undefined);
  const data = await siteData;
  return data?.pages[slug]?.translations ?? {};
}

function rememberOnClick(): void {
  if (!cfg?.rememberChoice) return;
  const links = document.querySelectorAll<HTMLAnchorElement>(
    ".multilanguage-switcher a[data-lang]",
  );
  for (const link of links) {
    const handler = () => {
      try {
        localStorage.setItem(cfg.storageKey, link.dataset.lang ?? "");
      } catch {
        // storage unavailable (private mode, quota); nothing to do
      }
    };
    link.addEventListener("click", handler);
    window.addCleanup(() => link.removeEventListener("click", handler));
  }
}

function setupDropdowns(): void {
  const menus = document.querySelectorAll<HTMLDetailsElement>("details.multilanguage-switcher");
  if (menus.length === 0) return;
  const closeAll = (except?: EventTarget | null) => {
    for (const menu of menus) {
      if (menu.open && !(except instanceof Node && menu.contains(except))) menu.open = false;
    }
  };
  const onClick = (e: MouseEvent) => closeAll(e.target);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeAll();
  };
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  window.addCleanup(() => document.removeEventListener("click", onClick));
  window.addCleanup(() => document.removeEventListener("keydown", onKey));
}

async function showNotice(): Promise<void> {
  if (!cfg || !(cfg.noticeMissing || cfg.noticeAvailable)) return;
  const notice = document.querySelector<HTMLElement>(".multilanguage-notice");
  if (!notice) return;
  notice.hidden = true;

  const lang = pageLanguage();
  const preferred = preferredLanguage();
  if (!lang || !preferred || preferred === lang) return;

  const slug = notice.dataset.mlSlug ?? currentSlug();
  const translations = await translationsFor(slug);
  const target = translations[preferred];
  const variant = target ? "available" : "missing";
  if (variant === "available" && !cfg.noticeAvailable) return;
  if (variant === "missing" && !cfg.noticeMissing) return;

  for (const p of notice.querySelectorAll<HTMLElement>("[data-ml-for]")) {
    p.hidden = !(p.dataset.mlFor === preferred && p.dataset.mlVariant === variant);
  }
  const active = notice.querySelector<HTMLElement>(
    `[data-ml-for="${preferred}"][data-ml-variant="${variant}"]`,
  );
  if (!active) return;

  if (variant === "available" && target) {
    const link = active.querySelector<HTMLAnchorElement>("a[data-ml-link]");
    if (link) {
      link.href = slugToPath(target);
      link.textContent = nativeName(preferred);
      link.hreflang = preferred;
    }
  } else {
    const span = active.querySelector<HTMLElement>("[data-ml-languages]");
    if (span) {
      const available = Object.keys(translations).length > 0 ? Object.keys(translations) : [lang];
      span.textContent = available.map(nativeName).join(", ");
    }
  }
  notice.hidden = false;
}

function localizeDates(): void {
  if (!cfg?.localizeDates) return;
  const lang = document.documentElement.lang || cfg.defaultLanguage;
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat(lang, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return;
  }
  for (const el of document.querySelectorAll<HTMLTimeElement>("time[datetime]")) {
    if (el.dataset.mlLocalized === lang) continue;
    const date = new Date(el.dateTime);
    if (Number.isNaN(date.getTime())) continue;
    el.textContent = format.format(date);
    el.dataset.mlLocalized = lang;
  }
}

function setup(): void {
  if (!cfg) return;
  rememberOnClick();
  setupDropdowns();
  localizeDates();
  void showNotice();
}

document.addEventListener("nav", setup);
