import { createRequire } from 'module';
import { jsx, jsxs } from 'preact/jsx-runtime';

createRequire(import.meta.url);

// node_modules/@quartz-community/utils/dist/path.js
function simplifySlug(fp) {
  const res = stripSlashes(trimSuffix(fp, "index"), true);
  return res.length === 0 ? "/" : res;
}
function joinSegments(...args) {
  if (args.length === 0) {
    return "";
  }
  let joined = args.filter((segment) => segment !== "" && segment !== "/").map((segment) => stripSlashes(segment)).join("/");
  const first = args[0];
  const last = args[args.length - 1];
  if (first?.startsWith("/")) {
    joined = "/" + joined;
  }
  if (last?.endsWith("/")) {
    joined = joined + "/";
  }
  return joined;
}
function endsWith(s, suffix) {
  return s === suffix || s.endsWith("/" + suffix);
}
function trimSuffix(s, suffix) {
  if (endsWith(s, suffix)) {
    s = s.slice(0, -suffix.length);
  }
  return s;
}
function stripSlashes(s, onlyStripPrefix) {
  if (s.startsWith("/")) {
    s = s.substring(1);
  }
  if (!onlyStripPrefix && s.endsWith("/")) {
    s = s.slice(0, -1);
  }
  return s;
}
function pathToRoot(slug2) {
  let rootPath = slug2.split("/").filter((x) => x !== "").slice(0, -1).map((_) => "..").join("/");
  if (rootPath.length === 0) {
    rootPath = ".";
  }
  return rootPath;
}
function resolveRelative(current, target) {
  const res = joinSegments(pathToRoot(current), simplifySlug(target));
  return res;
}

// src/util/warn.ts
var warned = /* @__PURE__ */ new Set();
function warnOnce(key, message) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[multilanguage] ${message}`);
}

// src/options.ts
var DETECTION = ["folder", "suffix", "frontmatter"];
var LINKING = ["frontmatter", "aliases", "path"];
var defaultOptions = {
  languages: ["en"],
  frontmatterKeys: { lang: "lang", key: "translationKey", translations: "translations" }};
function flagEmoji(region) {
  const r = region.toUpperCase();
  if (!/^[A-Z]{2}$/.test(r)) return void 0;
  return String.fromCodePoint(...[...r].map((c) => 127462 + c.charCodeAt(0) - 65));
}
function normalizeSlug(value) {
  let s = value.trim().replace(/^\/+|\/+$/g, "");
  if (s.endsWith(".md")) s = s.slice(0, -3);
  return s;
}
function resolveLanguage(input) {
  const cfg = typeof input === "string" ? { code: input } : input;
  const code = (cfg?.code ?? "").trim().toLowerCase();
  if (!code) {
    warnOnce("language-without-code", "Ignoring a language entry without a `code`.");
    return void 0;
  }
  const label = cfg.label?.trim() || code.toUpperCase();
  const locale = cfg.locale?.trim() || code;
  const region = locale.split(/[-_]/)[1];
  return {
    code,
    label,
    native: cfg.native?.trim() || label,
    locale,
    home: cfg.home ? normalizeSlug(cfg.home) : void 0,
    flag: cfg.flag?.trim() || region && flagEmoji(region) || code.toUpperCase()
  };
}
function pickEnum(key, value, allowed, fallback) {
  if (value === void 0) return fallback;
  if (typeof value === "string" && allowed.includes(value)) {
    return value;
  }
  warnOnce(
    `enum:${key}:${String(value)}`,
    `Unknown value ${JSON.stringify(value)} for \`${key}\`; using \`${fallback}\`.`
  );
  return fallback;
}
function pickList(key, value, allowed) {
  const list = Array.isArray(value) ? value : [value];
  const out = [];
  for (const v of list) {
    if (typeof v === "string" && allowed.includes(v)) {
      if (!out.includes(v)) out.push(v);
    } else {
      warnOnce(
        `list:${key}:${String(v)}`,
        `Ignoring unknown \`${key}\` entry ${JSON.stringify(v)}.`
      );
    }
  }
  return out;
}
function pickBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}
function resolveOptions(userOpts) {
  const user = userOpts ?? {};
  let languages = (user.languages ?? defaultOptions.languages).map(resolveLanguage).filter((l) => l !== void 0);
  if (languages.length === 0) {
    warnOnce("no-languages", "No languages configured; falling back to `en`.");
    languages = [resolveLanguage("en")];
  }
  const seen = /* @__PURE__ */ new Set();
  languages = languages.filter((l) => {
    if (seen.has(l.code)) {
      warnOnce(
        `dup-language:${l.code}`,
        `Language \`${l.code}\` is configured twice; ignoring the duplicate.`
      );
      return false;
    }
    seen.add(l.code);
    return true;
  });
  let defaultLanguage = (user.defaultLanguage ?? "").trim().toLowerCase();
  if (!defaultLanguage) {
    defaultLanguage = languages[0].code;
  } else if (!seen.has(defaultLanguage)) {
    warnOnce(
      `default-language:${defaultLanguage}`,
      `\`defaultLanguage: ${defaultLanguage}\` is not in \`languages\`; using \`${languages[0].code}\`.`
    );
    defaultLanguage = languages[0].code;
  }
  const detection = user.detection === void 0 ? [...DETECTION] : pickList("detection", user.detection, DETECTION);
  const linking = user.linking === void 0 ? [...LINKING] : pickList("linking", user.linking, LINKING);
  const seo = user.seo ?? {};
  const xDefault = typeof seo.xDefault === "string" ? seo.xDefault.trim().toLowerCase() : "default";
  if (xDefault !== "default" && xDefault !== "none" && !seen.has(xDefault)) {
    warnOnce(
      `x-default:${xDefault}`,
      `\`seo.xDefault: ${xDefault}\` is not a configured language; using \`default\`.`
    );
  }
  const sw = user.switcher ?? {};
  const style = pickEnum(
    "switcher.style",
    sw.style,
    ["links", "dropdown", "flags"],
    "links"
  );
  const envLangs = process.env.QUARTZ_LANGS;
  const publishSource = envLangs !== void 0 ? envLangs.split(",") : user.publishLanguages ?? [];
  const publishLanguages = publishSource.map((l) => String(l).trim().toLowerCase()).filter((l) => l.length > 0).filter((l) => {
    if (seen.has(l)) return true;
    warnOnce(
      `publish:${l}`,
      `\`publishLanguages\` contains unknown language \`${l}\`; ignoring it.`
    );
    return false;
  });
  return {
    languages,
    defaultLanguage,
    detection,
    linking,
    frontmatterKeys: {
      lang: user.frontmatterKeys?.lang || defaultOptions.frontmatterKeys.lang,
      key: user.frontmatterKeys?.key || defaultOptions.frontmatterKeys.key,
      translations: user.frontmatterKeys?.translations || defaultOptions.frontmatterKeys.translations
    },
    rootRedirect: pickEnum(
      "rootRedirect",
      user.rootRedirect,
      ["none", "default", "browser"],
      "none"
    ),
    rememberChoice: pickBoolean(user.rememberChoice, true),
    seo: {
      hreflang: pickBoolean(seo.hreflang, true),
      ogLocale: pickBoolean(seo.ogLocale, true),
      xDefault: xDefault === "none" || seen.has(xDefault) ? xDefault : "default"
    },
    switcher: {
      style,
      label: pickEnum(
        "switcher.label",
        sw.label,
        ["code", "label", "native", "translatedTitle"],
        "label"
      ),
      showCurrent: pickBoolean(sw.showCurrent, true),
      missing: pickEnum(
        "switcher.missing",
        sw.missing,
        ["hide", "home", "disabled"],
        "home"
      ),
      separator: typeof sw.separator === "string" ? sw.separator : "|",
      title: typeof sw.title === "string" && sw.title.trim() ? sw.title.trim() : void 0
    },
    missingTranslationNotice: pickBoolean(user.missingTranslationNotice, false),
    availableTranslationNotice: pickBoolean(user.availableTranslationNotice, false),
    fallbackPages: pickEnum(
      "fallbackPages",
      user.fallbackPages,
      ["none", "redirect"],
      "none"
    ),
    rewriteCrossLanguageLinks: pickBoolean(user.rewriteCrossLanguageLinks, false),
    localizeDates: pickBoolean(user.localizeDates, false),
    publishLanguages
  };
}
function findLanguage(opts, code) {
  return opts.languages.find((l) => l.code === code);
}

// src/language/detect.ts
function matchLanguage(value, languages) {
  if (typeof value !== "string") return void 0;
  const v = value.trim().toLowerCase();
  if (!v) return void 0;
  return languages.find((l) => l.code === v) ?? languages.find((l) => l.locale.toLowerCase() === v) ?? languages.find((l) => l.code === v.split(/[-_]/)[0]);
}
function fromFolder(slug2, langs) {
  const idx = slug2.indexOf("/");
  if (idx <= 0) return void 0;
  const lang = matchCode(slug2.slice(0, idx), langs);
  if (!lang) return void 0;
  const rest = slug2.slice(idx + 1);
  return { lang: lang.code, source: "folder", baseSlug: rest === "" ? "index" : rest };
}
function fromSuffix(slug2, langs) {
  const cut = slug2.lastIndexOf("/");
  const dir = cut >= 0 ? slug2.slice(0, cut + 1) : "";
  const name = cut >= 0 ? slug2.slice(cut + 1) : slug2;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return void 0;
  const lang = matchCode(name.slice(dot + 1), langs);
  if (!lang) return void 0;
  return { lang: lang.code, source: "suffix", baseSlug: dir + name.slice(0, dot) };
}
function matchCode(value, langs) {
  const v = value.toLowerCase();
  return langs.find((l) => l.code === v);
}
function detectLanguage(input, opts) {
  for (const strategy of opts.detection) {
    let hit;
    if (strategy === "folder") {
      hit = fromFolder(input.slug, opts.languages);
    } else if (strategy === "suffix") {
      hit = fromSuffix(input.slug, opts.languages);
    } else if (strategy === "frontmatter") {
      const lang = matchLanguage(input.frontmatter?.[opts.frontmatterKeys.lang], opts.languages);
      if (lang) hit = { lang: lang.code, source: "frontmatter", baseSlug: input.slug };
    }
    if (hit) return hit;
  }
  return { lang: opts.defaultLanguage, source: "default", baseSlug: input.slug };
}

// src/language/link.ts
function normalizeTitle(value) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[\s_-]+/g, "-");
}
function normalizeTarget(value) {
  let s = value.trim();
  const wiki = /^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/.exec(s);
  if (wiki) s = wiki[1].trim();
  s = s.replace(/^\/+|\/+$/g, "");
  if (s.toLowerCase().endsWith(".md")) s = s.slice(0, -3);
  return s;
}
var Groups = class {
  constructor(langOf) {
    this.langOf = langOf;
  }
  langOf;
  parent = /* @__PURE__ */ new Map();
  members = /* @__PURE__ */ new Map();
  find(slug2) {
    let root = slug2;
    while (this.parent.get(root) !== root) {
      const next = this.parent.get(root);
      if (next === void 0) {
        this.parent.set(root, root);
        this.members.set(root, /* @__PURE__ */ new Map([[this.langOf.get(root), root]]));
        return root;
      }
      root = next;
    }
    return root;
  }
  /** Merges the groups of `a` and `b` unless that would put two pages of one language together. */
  union(a, b, why) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return true;
    const ma = this.members.get(ra);
    const mb = this.members.get(rb);
    for (const [lang, slug2] of mb) {
      const existing = ma.get(lang);
      if (existing !== void 0 && existing !== slug2) {
        warnOnce(
          `conflict:${[a, b].sort().join("|")}`,
          `Not linking "${a}" and "${b}" (${why}): the group already has a ${lang} page ("${existing}").`
        );
        return false;
      }
    }
    for (const [lang, slug2] of mb) ma.set(lang, slug2);
    this.parent.set(rb, ra);
    this.members.delete(rb);
    return true;
  }
  groupOf(slug2) {
    return this.members.get(this.find(slug2));
  }
};
function linkByFrontmatter(records, groups, lookup) {
  const byKey = /* @__PURE__ */ new Map();
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
      groups.union(list[0].slug, list[i].slug, `translationKey "${key}"`);
    }
  }
  for (const r of records) {
    if (!r.translations) continue;
    for (const [lang, target] of Object.entries(r.translations)) {
      if (typeof target !== "string") continue;
      const slug2 = lookup.get(normalizeTarget(target).toLowerCase());
      if (slug2 === void 0) {
        warnOnce(
          `missing-translation:${r.slug}:${lang}`,
          `"${r.slug}" declares a ${lang} translation "${target}", but no such page exists.`
        );
        continue;
      }
      groups.union(r.slug, slug2, `translations.${lang}`);
    }
  }
}
function linkByAliases(records, groups) {
  const byName = /* @__PURE__ */ new Map();
  const add = (name, r) => {
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
        (c) => c !== r && c.lang !== r.lang
      );
      const perLang = /* @__PURE__ */ new Map();
      for (const c of candidates) {
        const list = perLang.get(c.lang) ?? [];
        list.push(c);
        perLang.set(c.lang, list);
      }
      for (const [lang, list] of perLang) {
        if (list.length > 1) {
          warnOnce(
            `ambiguous-alias:${r.slug}:${alias}`,
            `Alias "${alias}" of "${r.slug}" matches several ${lang} pages (${list.map((c) => `"${c.slug}"`).join(", ")}); not linking it.`
          );
          continue;
        }
        groups.union(r.slug, list[0].slug, `alias "${alias}"`);
      }
    }
  }
}
function linkByPath(records, groups) {
  const byBase = /* @__PURE__ */ new Map();
  for (const r of records) {
    const list = byBase.get(r.baseSlug) ?? [];
    list.push(r);
    byBase.set(r.baseSlug, list);
  }
  for (const list of byBase.values()) {
    for (let i = 1; i < list.length; i++) {
      groups.union(list[0].slug, list[i].slug, `same path "${list[0].baseSlug}"`);
    }
  }
}
function buildTranslationIndex(records, opts) {
  const langOf = /* @__PURE__ */ new Map();
  const titles = /* @__PURE__ */ new Map();
  const lookup = /* @__PURE__ */ new Map();
  const unique = [];
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
  const bySlug = /* @__PURE__ */ new Map();
  const cache2 = /* @__PURE__ */ new Map();
  for (const r of unique) {
    const group = groups.groupOf(r.slug);
    let map = cache2.get(group);
    if (!map) {
      map = Object.fromEntries([...group.entries()].sort(([a], [b]) => a.localeCompare(b)));
      cache2.set(group, map);
    }
    bySlug.set(r.slug, map);
  }
  return { bySlug, titles, langs: langOf };
}

// src/records.ts
function asStringArray(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  return void 0;
}
function asStringRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k.trim().toLowerCase()] = v;
  }
  return out;
}
function readFrontmatterFields(frontmatter, opts) {
  const key = frontmatter?.[opts.frontmatterKeys.key];
  const translations = asStringRecord(frontmatter?.[opts.frontmatterKeys.translations]);
  return {
    translationKey: typeof key === "string" && key.trim() ? key.trim() : void 0,
    translations
  };
}
function toPageRecord(data, opts) {
  const slug2 = data.slug;
  if (typeof slug2 !== "string" || !slug2) return void 0;
  const frontmatter = data.frontmatter && typeof data.frontmatter === "object" ? data.frontmatter : void 0;
  const stored = data.multilanguage;
  const detection = stored ?? detectLanguage({ slug: slug2, frontmatter }, opts);
  const fields = stored ?? readFrontmatterFields(frontmatter, opts);
  return {
    slug: slug2,
    lang: detection.lang,
    baseSlug: detection.baseSlug,
    source: detection.source,
    title: typeof frontmatter?.title === "string" ? frontmatter.title : void 0,
    aliases: asStringArray(frontmatter?.aliases),
    translationKey: fields.translationKey,
    translations: fields.translations
  };
}
var cache = /* @__PURE__ */ new WeakMap();
function indexFromFiles(files, opts) {
  const hit = cache.get(files);
  if (hit) return hit;
  const records = files.map((f) => toPageRecord(f, opts)).filter((r) => r !== void 0);
  const index = buildTranslationIndex(records, opts);
  cache.set(files, index);
  return index;
}
function homeSlug(lang, opts, hasSlug) {
  const cfg = opts.languages.find((l) => l.code === lang);
  if (cfg?.home) return cfg.home;
  const prefixed = `${lang}/index`;
  if (hasSlug(prefixed)) return prefixed;
  if (lang === opts.defaultLanguage && hasSlug("index")) return "index";
  return prefixed;
}

// src/i18n/locales/en-US.ts
var en_US_default = {
  switcher: {
    title: "Language",
    homeOf: ({ language }) => `${language} (home page)`,
    unavailable: ({ language }) => `Not available in ${language}`
  },
  notice: {
    missing: ({ languages }) => `This page is only available in ${languages}.`,
    available: ({ language }) => `This page is also available in ${language}:`
  },
  redirect: {
    title: "Redirecting\u2026",
    text: ({ language }) => `Continue in ${language}`
  }
};

// src/i18n/locales/de-DE.ts
var deDE = {
  switcher: {
    title: "Sprache",
    homeOf: ({ language }) => `${language} (Startseite)`,
    unavailable: ({ language }) => `Nicht auf ${language} verf\xFCgbar`
  },
  notice: {
    missing: ({ languages }) => `Diese Seite ist nur auf ${languages} verf\xFCgbar.`,
    available: ({ language }) => `Diese Seite gibt es auch auf ${language}:`
  },
  redirect: {
    title: "Weiterleitung\u2026",
    text: ({ language }) => `Weiter auf ${language}`
  }
};
var de_DE_default = deDE;

// src/i18n/locales/fr-FR.ts
var frFR = {
  switcher: {
    title: "Langue",
    homeOf: ({ language }) => `${language} (page d\u2019accueil)`,
    unavailable: ({ language }) => `Non disponible en ${language}`
  },
  notice: {
    missing: ({ languages }) => `Cette page n\u2019est disponible qu\u2019en ${languages}.`,
    available: ({ language }) => `Cette page est aussi disponible en ${language} :`
  },
  redirect: {
    title: "Redirection\u2026",
    text: ({ language }) => `Continuer en ${language}`
  }
};
var fr_FR_default = frFR;

// src/i18n/locales/es-ES.ts
var esES = {
  switcher: {
    title: "Idioma",
    homeOf: ({ language }) => `${language} (p\xE1gina de inicio)`,
    unavailable: ({ language }) => `No disponible en ${language}`
  },
  notice: {
    missing: ({ languages }) => `Esta p\xE1gina solo est\xE1 disponible en ${languages}.`,
    available: ({ language }) => `Esta p\xE1gina tambi\xE9n est\xE1 disponible en ${language}:`
  },
  redirect: {
    title: "Redirigiendo\u2026",
    text: ({ language }) => `Continuar en ${language}`
  }
};
var es_ES_default = esES;

// src/i18n/index.ts
var locales = {
  "en-US": en_US_default,
  "de-DE": de_DE_default,
  "fr-FR": fr_FR_default,
  "es-ES": es_ES_default
};
function i18n(locale) {
  if (!locale) return en_US_default;
  const exact = locales[locale];
  if (exact) return exact;
  const primary = locale.toLowerCase().split(/[-_]/)[0];
  for (const [key, value] of Object.entries(locales)) {
    if (key.toLowerCase().split("-")[0] === primary) return value;
  }
  return en_US_default;
}

// node_modules/@quartz-community/utils/dist/lang.js
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// src/components/styles/language-switcher.scss
var language_switcher_default = '@charset "UTF-8";\n.multilanguage-switcher {\n  font-size: 0.9rem;\n  line-height: 1.5;\n}\n.multilanguage-switcher ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.35rem;\n}\n.multilanguage-switcher li {\n  margin: 0;\n}\n.multilanguage-switcher a {\n  text-decoration: none;\n  color: var(--darkgray);\n}\n.multilanguage-switcher a:hover {\n  color: var(--secondary);\n}\n.multilanguage-switcher a.fallback {\n  opacity: 0.7;\n}\n.multilanguage-switcher .current {\n  font-weight: 700;\n  color: var(--dark);\n}\n.multilanguage-switcher .disabled {\n  color: var(--gray);\n  cursor: default;\n}\n.multilanguage-switcher .separator {\n  color: var(--gray);\n  user-select: none;\n}\n.multilanguage-switcher.style-flags {\n  font-size: 1.1rem;\n}\n.multilanguage-switcher.style-flags ul {\n  gap: 0.25rem;\n}\n.multilanguage-switcher.style-dropdown {\n  position: relative;\n}\n.multilanguage-switcher.style-dropdown summary {\n  cursor: pointer;\n  list-style: none;\n  display: inline-block;\n  padding: 0.15rem 0.5rem;\n  border: 1px solid var(--lightgray);\n  border-radius: 5px;\n  color: var(--darkgray);\n}\n.multilanguage-switcher.style-dropdown summary::-webkit-details-marker {\n  display: none;\n}\n.multilanguage-switcher.style-dropdown summary::after {\n  content: " \u25BE";\n  color: var(--gray);\n}\n.multilanguage-switcher.style-dropdown[open] summary {\n  border-color: var(--gray);\n}\n.multilanguage-switcher.style-dropdown ul {\n  position: absolute;\n  z-index: 10;\n  min-width: 100%;\n  margin-top: 0.25rem;\n  padding: 0.25rem 0;\n  flex-direction: column;\n  align-items: stretch;\n  gap: 0;\n  background-color: var(--light);\n  border: 1px solid var(--lightgray);\n  border-radius: 5px;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);\n}\n.multilanguage-switcher.style-dropdown li {\n  padding: 0.15rem 0.75rem;\n  white-space: nowrap;\n}\n.multilanguage-switcher.style-dropdown li:hover {\n  background-color: var(--highlight);\n}';
function labelFor(lang, targetSlug, opts, index) {
  if (opts.switcher.style === "flags") return lang.flag;
  switch (opts.switcher.label) {
    case "code":
      return lang.code.toUpperCase();
    case "native":
      return lang.native;
    case "translatedTitle":
      return targetSlug && index.titles.get(targetSlug) || lang.native;
    default:
      return lang.label;
  }
}
function switcherEntries(slug2, currentLang, translations, opts, index, hasSlug) {
  const entries = [];
  for (const lang of opts.languages) {
    const target = translations[lang.code];
    const text = labelFor(lang, target, opts, index);
    if (lang.code === currentLang) {
      if (opts.switcher.showCurrent) entries.push({ kind: "current", lang, text });
      continue;
    }
    if (target) {
      const href2 = resolveRelative(slug2, target);
      entries.push({ kind: "link", lang, text, href: href2, fallback: false });
      continue;
    }
    if (opts.switcher.missing === "hide") continue;
    if (opts.switcher.missing === "disabled") {
      entries.push({ kind: "disabled", lang, text });
      continue;
    }
    const home = homeSlug(lang.code, opts, hasSlug);
    const href = resolveRelative(slug2, home);
    entries.push({ kind: "link", lang, text, href, fallback: true });
  }
  return entries;
}
var LanguageSwitcher_default = ((userOpts) => {
  const opts = resolveOptions(userOpts);
  const { switcher } = opts;
  const LanguageSwitcher = (props) => {
    const { fileData, allFiles, displayClass } = props;
    const slug2 = typeof fileData.slug === "string" ? fileData.slug : "";
    if (!slug2 || opts.languages.length < 2) return null;
    const files = Array.isArray(allFiles) ? allFiles : [];
    const index = indexFromFiles(files, opts);
    const hasSlug = (s) => index.langs.has(s) || s === slug2;
    const record = toPageRecord(fileData, opts);
    const currentLang = record?.lang ?? opts.defaultLanguage;
    const translations = index.bySlug.get(slug2) ?? { [currentLang]: slug2 };
    const entries = switcherEntries(slug2, currentLang, translations, opts, index, hasSlug);
    if (!entries.some((e) => e.kind !== "current")) return null;
    const current = findLanguage(opts, currentLang);
    const t = i18n(current?.locale);
    const title = switcher.title ?? t.switcher.title;
    const currentText = labelFor(current ?? opts.languages[0], slug2, opts, index);
    const items = [];
    entries.forEach((entry, i) => {
      if (i > 0 && switcher.style === "links" && switcher.separator) {
        items.push(
          /* @__PURE__ */ jsx("li", { class: "separator", "aria-hidden": "true", children: switcher.separator })
        );
      }
      const flagTitle = switcher.style === "flags" ? entry.lang.native : void 0;
      if (entry.kind === "current") {
        items.push(
          /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("span", { class: "current", "aria-current": "page", lang: entry.lang.locale, title: flagTitle, children: entry.text }) })
        );
      } else if (entry.kind === "disabled") {
        items.push(
          /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
            "span",
            {
              class: "disabled",
              "aria-disabled": "true",
              lang: entry.lang.locale,
              title: t.switcher.unavailable({ language: entry.lang.native }),
              children: entry.text
            }
          ) })
        );
      } else {
        items.push(
          /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
            "a",
            {
              href: entry.href,
              class: entry.fallback ? "fallback" : void 0,
              hreflang: entry.lang.locale,
              lang: entry.lang.locale,
              "data-lang": entry.lang.code,
              title: entry.fallback ? t.switcher.homeOf({ language: entry.lang.native }) : flagTitle,
              children: entry.text
            }
          ) })
        );
      }
    });
    const cls = classNames(displayClass, "multilanguage-switcher", `style-${switcher.style}`);
    const data = {
      "data-lang": currentLang,
      "data-translations": JSON.stringify(translations)
    };
    if (switcher.style === "dropdown") {
      return /* @__PURE__ */ jsxs("details", { class: cls, ...data, children: [
        /* @__PURE__ */ jsx("summary", { "aria-label": title, title, children: currentText }),
        /* @__PURE__ */ jsx("ul", { children: items })
      ] });
    }
    return /* @__PURE__ */ jsx("nav", { class: cls, "aria-label": title, ...data, children: /* @__PURE__ */ jsx("ul", { children: items }) });
  };
  LanguageSwitcher.css = language_switcher_default;
  return LanguageSwitcher;
});

export { LanguageSwitcher_default as LanguageSwitcher };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map