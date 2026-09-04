import { createRequire } from 'module';
import { jsx, jsxs, Fragment } from 'preact/jsx-runtime';
import fs from 'fs/promises';
import path from 'path';

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

// node_modules/unist-util-is/lib/index.js
var convert = (
  // Note: overloads in JSDoc can’t yet use different `@template`s.
  /**
   * @type {(
   *   (<Condition extends string>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & {type: Condition}) &
   *   (<Condition extends Props>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Condition) &
   *   (<Condition extends TestFunction>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Predicate<Condition, Node>) &
   *   ((test?: null | undefined) => (node?: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node) &
   *   ((test?: Test) => Check)
   * )}
   */
  /**
   * @param {Test} [test]
   * @returns {Check}
   */
  (function(test) {
    if (test === null || test === void 0) {
      return ok;
    }
    if (typeof test === "function") {
      return castFactory(test);
    }
    if (typeof test === "object") {
      return Array.isArray(test) ? anyFactory(test) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        propertiesFactory(
          /** @type {Props} */
          test
        )
      );
    }
    if (typeof test === "string") {
      return typeFactory(test);
    }
    throw new Error("Expected function, string, or object as test");
  })
);
function anyFactory(tests) {
  const checks = [];
  let index2 = -1;
  while (++index2 < tests.length) {
    checks[index2] = convert(tests[index2]);
  }
  return castFactory(any);
  function any(...parameters) {
    let index3 = -1;
    while (++index3 < checks.length) {
      if (checks[index3].apply(this, parameters)) return true;
    }
    return false;
  }
}
function propertiesFactory(check) {
  const checkAsRecord = (
    /** @type {Record<string, unknown>} */
    check
  );
  return castFactory(all);
  function all(node) {
    const nodeAsRecord = (
      /** @type {Record<string, unknown>} */
      /** @type {unknown} */
      node
    );
    let key;
    for (key in check) {
      if (nodeAsRecord[key] !== checkAsRecord[key]) return false;
    }
    return true;
  }
}
function typeFactory(check) {
  return castFactory(type);
  function type(node) {
    return node && node.type === check;
  }
}
function castFactory(testFunction) {
  return check;
  function check(value, index2, parent) {
    return Boolean(
      looksLikeANode(value) && testFunction.call(
        this,
        value,
        typeof index2 === "number" ? index2 : void 0,
        parent || void 0
      )
    );
  }
}
function ok() {
  return true;
}
function looksLikeANode(value) {
  return value !== null && typeof value === "object" && "type" in value;
}

// node_modules/unist-util-visit-parents/lib/color.node.js
function color(d) {
  return "\x1B[33m" + d + "\x1B[39m";
}

// node_modules/unist-util-visit-parents/lib/index.js
var empty = [];
var CONTINUE = true;
var EXIT = false;
var SKIP = "skip";
function visitParents(tree, test, visitor, reverse) {
  let check;
  if (typeof test === "function" && typeof visitor !== "function") {
    reverse = visitor;
    visitor = test;
  } else {
    check = test;
  }
  const is2 = convert(check);
  const step = reverse ? -1 : 1;
  factory(tree, void 0, [])();
  function factory(node, index2, parents) {
    const value = (
      /** @type {Record<string, unknown>} */
      node && typeof node === "object" ? node : {}
    );
    if (typeof value.type === "string") {
      const name = (
        // `hast`
        typeof value.tagName === "string" ? value.tagName : (
          // `xast`
          typeof value.name === "string" ? value.name : void 0
        )
      );
      Object.defineProperty(visit2, "name", {
        value: "node (" + color(node.type + (name ? "<" + name + ">" : "")) + ")"
      });
    }
    return visit2;
    function visit2() {
      let result = empty;
      let subresult;
      let offset;
      let grandparents;
      if (!test || is2(node, index2, parents[parents.length - 1] || void 0)) {
        result = toResult(visitor(node, parents));
        if (result[0] === EXIT) {
          return result;
        }
      }
      if ("children" in node && node.children) {
        const nodeAsParent = (
          /** @type {UnistParent} */
          node
        );
        if (nodeAsParent.children && result[0] !== SKIP) {
          offset = (reverse ? nodeAsParent.children.length : -1) + step;
          grandparents = parents.concat(nodeAsParent);
          while (offset > -1 && offset < nodeAsParent.children.length) {
            const child = nodeAsParent.children[offset];
            subresult = factory(child, offset, grandparents)();
            if (subresult[0] === EXIT) {
              return subresult;
            }
            offset = typeof subresult[1] === "number" ? subresult[1] : offset + step;
          }
        }
      }
      return result;
    }
  }
}
function toResult(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "number") {
    return [CONTINUE, value];
  }
  return value === null || value === void 0 ? empty : [value];
}

// node_modules/unist-util-visit/lib/index.js
function visit(tree, testOrVisitor, visitorOrReverse, maybeReverse) {
  let reverse;
  let test;
  let visitor;
  {
    test = testOrVisitor;
    visitor = visitorOrReverse;
    reverse = maybeReverse;
  }
  visitParents(tree, test, overload, reverse);
  function overload(node, parents) {
    const parent = parents[parents.length - 1];
    const index2 = parent ? parent.children.indexOf(node) : void 0;
    return visitor(node, index2, parent);
  }
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
function languageSlug(baseSlug, lang, source) {
  switch (source) {
    case "folder":
      return `${lang}/${baseSlug}`;
    case "suffix": {
      return `${baseSlug}.${lang}`;
    }
    default:
      return void 0;
  }
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
    activeLanguages: publishLanguages.length > 0 ? languages.filter((l) => publishLanguages.includes(l.code)) : languages,
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
function linkByFrontmatter(records2, groups, lookup) {
  const byKey = /* @__PURE__ */ new Map();
  for (const r of records2) {
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
  for (const r of records2) {
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
function linkByAliases(records2, groups) {
  const byName = /* @__PURE__ */ new Map();
  const add = (name, r) => {
    const key = normalizeTitle(name);
    if (!key) return;
    const list = byName.get(key) ?? [];
    if (!list.includes(r)) list.push(r);
    byName.set(key, list);
  };
  for (const r of records2) {
    if (r.title) add(r.title, r);
    const file = r.slug.split("/").pop() ?? r.slug;
    if (file !== "index") add(file, r);
  }
  for (const r of records2) {
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
function linkByPath(records2, groups) {
  const byBase = /* @__PURE__ */ new Map();
  for (const r of records2) {
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
function buildTranslationIndex(records2, opts) {
  const langOf = /* @__PURE__ */ new Map();
  const titles = /* @__PURE__ */ new Map();
  const lookup = /* @__PURE__ */ new Map();
  const unique = [];
  for (const r of records2) {
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
  const records2 = files.map((f) => toPageRecord(f, opts)).filter((r) => r !== void 0);
  const index2 = buildTranslationIndex(records2, opts);
  cache.set(files, index2);
  return index2;
}
function homeSlug(lang, opts, hasSlug) {
  const cfg = opts.languages.find((l) => l.code === lang);
  if (cfg?.home) return cfg.home;
  const prefixed = `${lang}/index`;
  if (hasSlug(prefixed)) return prefixed;
  if (lang === opts.defaultLanguage && hasSlug("index")) return "index";
  return prefixed;
}

// src/registry.ts
var records = /* @__PURE__ */ new Map();
var index;
var indexOpts;
var buildId;
function registerFile(currentBuildId, data, opts) {
  if (buildId !== currentBuildId) {
    records.clear();
    buildId = currentBuildId;
  }
  const record = toPageRecord(data, opts);
  if (record) records.set(record.slug, record);
  index = void 0;
}
function registryIndex(opts, allSlugs) {
  if (index && indexOpts === opts) return index;
  let list = [...records.values()];
  if (allSlugs) {
    const live = new Set(allSlugs);
    list = list.filter((r) => live.has(r.slug));
  }
  index = buildTranslationIndex(list, opts);
  indexOpts = opts;
  return index;
}
function registrySize() {
  return records.size;
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

// src/styles/notice.scss
var notice_default = ".multilanguage-notice {\n  margin: 0 0 1rem 0;\n  padding: 0.75rem 1rem;\n  border-left: 4px solid var(--secondary, #284b63);\n  border-radius: 5px;\n  background-color: var(--highlight, rgba(143, 159, 169, 0.15));\n}\n.multilanguage-notice p {\n  margin: 0;\n}\n.multilanguage-notice[hidden] {\n  display: none !important;\n}\n.multilanguage-notice [hidden] {\n  display: none;\n}";

// src/scripts/multilanguage.inline.ts
var multilanguage_inline_default = 'var a=window.__quartzMultilanguage,p;function y(){return document.body?.dataset?.basepath??""}function v(e){let t=e.replace(/(^|\\/)index$/,"$1");return`${y()}/${t}`}function f(e){if(!a||!e)return;let t=e.trim().toLowerCase(),n=t.split(/[-_]/)[0];return(a.languages.find(o=>o.code===t)??a.languages.find(o=>o.locale.toLowerCase()===t)??a.languages.find(o=>o.code===n))?.code}function L(){if(a?.rememberChoice)try{return f(localStorage.getItem(a.storageKey))}catch{return}}function C(){let e=L();if(e)return e;let t=navigator.languages?.length?navigator.languages:[navigator.language];for(let n of t){let i=f(n);if(i)return i}}function m(e){return a?.languages.find(t=>t.code===e)?.native??e.toUpperCase()}function b(e){return a?.languages.find(t=>t.code===e)?.locale??e}function w(){return document.body?.dataset?.slug??""}function E(){let e=document.querySelector(".multilanguage-switcher[data-lang]"),t=document.querySelector(".multilanguage-notice[data-ml-lang]");return e?.dataset.lang??t?.dataset.mlLang??f(document.documentElement.lang)??a?.defaultLanguage}async function k(e){let t=document.querySelector(".multilanguage-switcher[data-translations]");if(t?.dataset.translations)try{return JSON.parse(t.dataset.translations)}catch{}return a?(p??(p=fetch(`${y()}/${a.dataPath}`).then(i=>i.ok?i.json():void 0).catch(()=>{})),(await p)?.pages[e]?.translations??{}):{}}function S(){if(!a?.rememberChoice)return;let e=document.querySelectorAll(".multilanguage-switcher a[data-lang]");for(let t of e){let n=()=>{try{localStorage.setItem(a.storageKey,t.dataset.lang??"")}catch{}};t.addEventListener("click",n),window.addCleanup(()=>t.removeEventListener("click",n))}}function T(){let e=document.querySelectorAll("details.multilanguage-switcher");if(e.length===0)return;let t=o=>{for(let s of e)s.open&&!(o instanceof Node&&s.contains(o))&&(s.open=!1)},n=o=>t(o.target),i=o=>{o.key==="Escape"&&t()};document.addEventListener("click",n),document.addEventListener("keydown",i),window.addCleanup(()=>document.removeEventListener("click",n)),window.addCleanup(()=>document.removeEventListener("keydown",i))}async function D(){if(!a||!(a.noticeMissing||a.noticeAvailable))return;let e=document.querySelector(".multilanguage-notice");if(!e)return;e.hidden=!0;let t=E(),n=C();if(!t||!n||n===t)return;let i=a.notices?.[n];if(!i)return;let o=e.dataset.mlSlug??w(),s=await k(o),u=s[n];if(u?!a.noticeAvailable:!a.noticeMissing)return;let h=e.querySelector(".callout-content")??e;h.replaceChildren();let c=document.createElement("p");if(c.lang=b(n),u){let[d="",g=""]=i.available.split("{{}}"),l=document.createElement("strong");l.textContent=m(n);let r=document.createElement("a");r.className="internal",r.dataset.mlLink="",r.href=v(u),r.hreflang=n,r.textContent=m(n),c.append(d,l,g," ",r)}else{let[d="",g=""]=i.missing.split("{{}}"),l=Object.keys(s).length>0?Object.keys(s):[t],r=document.createElement("span");r.dataset.mlLanguages="",r.textContent=l.map(m).join(", "),c.append(d,r,g)}h.append(c),e.hidden=!1}function M(){if(!a?.localizeDates)return;let e=document.documentElement.lang||a.defaultLanguage,t;try{t=new Intl.DateTimeFormat(e,{year:"numeric",month:"short",day:"2-digit"})}catch{return}for(let n of document.querySelectorAll("time[datetime]")){if(n.dataset.mlLocalized===e)continue;let i=new Date(n.dateTime);Number.isNaN(i.getTime())||(n.textContent=t.format(i),n.dataset.mlLocalized=e)}}function q(){a&&(S(),T(),M(),D())}document.addEventListener("nav",q);\n';
var STORAGE_KEY = "multilanguage-lang";
var DATA_PATH = "static/multilanguage.json";
function fileDataOf(data, opts) {
  const stored = data.multilanguage;
  if (stored) return stored;
  const frontmatter = data.frontmatter;
  return {
    ...detectLanguage({ slug: String(data.slug ?? ""), frontmatter }, opts),
    ...readFrontmatterFields(frontmatter, opts)
  };
}
function conventionTranslations(ml, slug2, opts, hasSlug) {
  const map = { [ml.lang]: slug2 };
  for (const lang of opts.activeLanguages) {
    if (lang.code === ml.lang) continue;
    const candidates = [languageSlug(ml.baseSlug, lang.code, ml.source)];
    if (ml.source !== "default" && lang.code === opts.defaultLanguage) candidates.push(ml.baseSlug);
    if (ml.source === "default" && opts.detection.includes("folder")) {
      candidates.push(`${lang.code}/${ml.baseSlug}`);
    }
    if (ml.source === "default" && opts.detection.includes("suffix")) {
      candidates.push(`${ml.baseSlug}.${lang.code}`);
    }
    const hit = candidates.find((c) => c !== void 0 && hasSlug(c));
    if (hit) map[lang.code] = hit;
  }
  return map;
}
function absoluteUrl(baseUrl, slug2) {
  const root = `https://${baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  const simple = simplifySlug(slug2);
  return simple === "/" ? `${root}/` : `${root}/${simple}`;
}
function ogLocale(locale) {
  return locale.replace("-", "_");
}
function noticeElement(ml, slug2) {
  return {
    type: "element",
    tagName: "blockquote",
    properties: {
      className: ["callout", "multilanguage-notice"],
      dataCallout: "info",
      dataMlLang: ml.lang,
      dataMlSlug: slug2,
      hidden: true
    },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { className: ["callout-content"] },
        children: []
      }
    ]
  };
}
var MultilanguageTransformer = (userOpts) => {
  const opts = resolveOptions(userOpts);
  const wantsNotice = opts.missingTranslationNotice || opts.availableTranslationNotice;
  return {
    name: "Multilanguage",
    markdownPlugins() {
      return [
        () => (_tree, file) => {
          const data = file.data;
          const slug2 = String(data.slug ?? "");
          if (!slug2) return;
          const frontmatter = data.frontmatter;
          const detection = detectLanguage({ slug: slug2, frontmatter }, opts);
          const ml = {
            ...detection,
            ...readFrontmatterFields(frontmatter, opts)
          };
          data.multilanguage = ml;
          if (frontmatter) {
            const locale = findLanguage(opts, ml.lang)?.locale ?? ml.lang;
            if (typeof frontmatter.lang !== "string" || !frontmatter.lang.trim()) {
              frontmatter.lang = locale;
            }
          }
        }
      ];
    },
    htmlPlugins(ctx) {
      if (!opts.rewriteCrossLanguageLinks && !wantsNotice) return [];
      const slugs = new Set(ctx.allSlugs);
      const hasSlug = (s) => slugs.has(s);
      return [
        () => (tree, file) => {
          const data = file.data;
          const slug2 = String(data.slug ?? "");
          if (!slug2) return;
          const ml = fileDataOf(data, opts);
          if (opts.rewriteCrossLanguageLinks) {
            visit(tree, "element", (node) => {
              if (node.tagName !== "a") return;
              const slugKey = "data-slug" in node.properties ? "data-slug" : "dataSlug";
              const target = node.properties[slugKey];
              if (typeof target !== "string" || !target) return;
              const targetMl = detectLanguage({ slug: target }, opts);
              if (targetMl.lang === ml.lang || targetMl.source === "default") return;
              const candidates = [languageSlug(targetMl.baseSlug, ml.lang, targetMl.source)];
              if (ml.lang === opts.defaultLanguage) candidates.push(targetMl.baseSlug);
              const replacement = candidates.find(
                (c) => c !== void 0 && hasSlug(c)
              );
              if (!replacement) return;
              const href = typeof node.properties.href === "string" ? node.properties.href : "";
              const anchor = href.includes("#") ? href.slice(href.indexOf("#")) : "";
              node.properties.href = resolveRelative(slug2, replacement) + anchor;
              node.properties[slugKey] = replacement;
              const links = data.links;
              if (Array.isArray(links)) {
                const from = simplifySlug(target);
                const to = simplifySlug(replacement);
                const i = links.indexOf(from);
                if (i >= 0 && !links.includes(to)) links[i] = to;
              }
            });
          }
          if (wantsNotice && opts.activeLanguages.length > 1) {
            tree.children.unshift(noticeElement(ml, slug2));
          }
        }
      ];
    },
    externalResources(ctx) {
      const baseUrl = ctx.cfg.configuration.baseUrl;
      const slugs = new Set(ctx.allSlugs);
      const hasSlug = (s) => slugs.has(s);
      const allSlugs = ctx.allSlugs;
      const clientConfig = {
        languages: opts.activeLanguages.map((l) => ({
          code: l.code,
          label: l.label,
          native: l.native,
          locale: l.locale,
          home: homeSlug(l.code, opts, hasSlug)
        })),
        defaultLanguage: opts.defaultLanguage,
        // Sentences per visitor language; `{{}}` marks where the script inserts names/links.
        notices: Object.fromEntries(
          opts.activeLanguages.map((l) => [
            l.code,
            {
              missing: i18n(l.locale).notice.missing({ languages: "{{}}" }),
              available: i18n(l.locale).notice.available({ language: "{{}}" })
            }
          ])
        ),
        rememberChoice: opts.rememberChoice,
        storageKey: STORAGE_KEY,
        noticeMissing: opts.missingTranslationNotice,
        noticeAvailable: opts.availableTranslationNotice,
        localizeDates: opts.localizeDates,
        dataPath: DATA_PATH
      };
      if (opts.seo.hreflang && !baseUrl && opts.activeLanguages.length > 1) {
        warnOnce(
          "hreflang-baseurl",
          "`seo.hreflang` needs `configuration.baseUrl`; skipping hreflang links."
        );
      }
      const headFor = (fileData) => {
        const slug2 = String(fileData.slug ?? "");
        if (!slug2) return null;
        const ml = fileDataOf(fileData, opts);
        const record = toPageRecord(fileData, opts);
        let translations;
        if (registrySize() > 0) translations = registryIndex(opts, allSlugs).bySlug.get(slug2);
        translations ??= conventionTranslations(ml, slug2, opts, hasSlug);
        const lang = record?.lang ?? ml.lang;
        const locale = findLanguage(opts, lang)?.locale ?? lang;
        const active = new Set(opts.activeLanguages.map((l) => l.code));
        translations = Object.fromEntries(
          Object.entries(translations).filter(([code]) => code === lang || active.has(code))
        );
        const others = Object.entries(translations).filter(([code]) => code !== lang);
        const tags = [];
        if (opts.seo.ogLocale) {
          tags.push(/* @__PURE__ */ jsx("meta", { property: "og:locale", content: ogLocale(locale) }));
          for (const [code] of others) {
            const alt = findLanguage(opts, code)?.locale ?? code;
            tags.push(/* @__PURE__ */ jsx("meta", { property: "og:locale:alternate", content: ogLocale(alt) }));
          }
        }
        if (opts.seo.hreflang && baseUrl && others.length > 0) {
          for (const [code, tSlug] of Object.entries(translations)) {
            const l = findLanguage(opts, code)?.locale ?? code;
            tags.push(/* @__PURE__ */ jsx("link", { rel: "alternate", hreflang: l, href: absoluteUrl(baseUrl, tSlug) }));
          }
          const xCode = opts.seo.xDefault === "default" ? opts.defaultLanguage : opts.seo.xDefault;
          const xSlug = xCode !== "none" ? translations[xCode] : void 0;
          if (xSlug) {
            tags.push(
              /* @__PURE__ */ jsx("link", { rel: "alternate", hreflang: "x-default", href: absoluteUrl(baseUrl, xSlug) })
            );
          }
        }
        return tags.length > 0 ? /* @__PURE__ */ jsx(Fragment, { children: tags }) : null;
      };
      return {
        css: wantsNotice ? [{ content: notice_default, inline: true }] : [],
        js: [
          {
            loadTime: "afterDOMReady",
            contentType: "inline",
            script: `window.__quartzMultilanguage=${JSON.stringify(clientConfig)};
${multilanguage_inline_default}`
          }
        ],
        additionalHead: [headFor]
      };
    }
  };
};

// src/filter.ts
var MultilanguageFilter = (userOpts) => {
  const opts = resolveOptions(userOpts);
  const publish = new Set(opts.publishLanguages);
  return {
    name: "Multilanguage",
    shouldPublish(ctx, [, file]) {
      const data = file.data;
      if (publish.size > 0) {
        const record = toPageRecord(data, opts);
        if (record !== void 0 && !publish.has(record.lang)) return false;
      }
      registerFile(ctx.buildId, data, opts);
      return true;
    }
  };
};

// node_modules/@quartz-community/utils/dist/escape.js
function escapeHTML(unsafe) {
  return unsafe.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// src/emitter.ts
async function write(ctx, slug2, ext, content) {
  const target = joinSegments(ctx.argv.output, slug2 + ext);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
  return target;
}
function redirectHtml(args) {
  const url = escapeHTML(args.url);
  return `<!DOCTYPE html>
<html lang="${escapeHTML(args.lang)}">
<head>
<meta charset="utf-8">
<title>${escapeHTML(args.title)}</title>
<link rel="canonical" href="${url}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body><p><a href="${url}">${escapeHTML(args.text)}</a></p></body>
</html>
`;
}
function rootRedirectHtml(opts, homes, baseUrl) {
  const def = homes.find((h) => h.code === opts.defaultLanguage) ?? homes[0];
  const t = i18n(def.locale);
  const links = homes.map(
    (h) => `<li><a href="${escapeHTML(h.href)}" hreflang="${escapeHTML(h.locale)}" lang="${escapeHTML(h.locale)}">${escapeHTML(h.native)}</a></li>`
  ).join("\n");
  const root = baseUrl ? `https://${baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}` : void 0;
  const alternates = root ? homes.map((h) => {
    const target = h.href.replace(/^\.\//, "");
    return `<link rel="alternate" hreflang="${escapeHTML(h.locale)}" href="${escapeHTML(`${root}/${target}`)}">`;
  }).join("\n") : "";
  const byCode = JSON.stringify(Object.fromEntries(homes.map((h) => [h.code, h.href])));
  const byLocale = JSON.stringify(
    Object.fromEntries(homes.map((h) => [h.locale.toLowerCase(), h.code]))
  );
  const stored = opts.rememberChoice ? `try{stored=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});}catch(e){}` : "";
  const script = opts.rootRedirect === "browser" ? `<script>(function(){
var homes=${byCode},locales=${byLocale},stored=null;${stored}
var cands=[stored].concat(navigator.languages||[navigator.language]);
for(var i=0;i<cands.length;i++){var c=cands[i];if(!c)continue;c=String(c).toLowerCase();
var p=c.split(/[-_]/)[0];var code=homes[c]?c:(locales[c]||(homes[p]?p:null));
if(code){location.replace(homes[code]);return;}}
location.replace(${JSON.stringify(def.href)});})();</script>` : `<script>location.replace(${JSON.stringify(def.href)});</script>`;
  return `<!DOCTYPE html>
<html lang="${escapeHTML(def.locale)}">
<head>
<meta charset="utf-8">
<title>${escapeHTML(t.redirect.title)}</title>
<link rel="canonical" href="${escapeHTML(def.href)}">
${alternates}
<noscript><meta http-equiv="refresh" content="0; url=${escapeHTML(def.href)}"></noscript>
${script}
</head>
<body>
<ul>
${links}
</ul>
</body>
</html>
`;
}
function buildSiteData(records2, opts, hasSlug) {
  const index2 = buildTranslationIndex(records2, opts);
  const pages = {};
  for (const r of records2) {
    const translations = index2.bySlug.get(r.slug);
    const entry = { lang: r.lang };
    if (translations && Object.keys(translations).length > 1) entry.translations = translations;
    pages[r.slug] = entry;
  }
  return {
    version: 1,
    defaultLanguage: opts.defaultLanguage,
    languages: opts.activeLanguages.map((l) => ({
      code: l.code,
      label: l.label,
      native: l.native,
      locale: l.locale,
      home: homeSlug(l.code, opts, hasSlug)
    })),
    pages
  };
}
var MultilanguageEmitter = (userOpts) => {
  const opts = resolveOptions(userOpts);
  async function* run(ctx, content) {
    const records2 = content.map(([, file]) => toPageRecord(file.data, opts)).filter((r) => r !== void 0);
    const slugs = /* @__PURE__ */ new Set([...ctx.allSlugs, ...records2.map((r) => r.slug)]);
    const hasSlug = (s) => slugs.has(s);
    const baseUrl = ctx.cfg.configuration.baseUrl;
    const siteData = buildSiteData(records2, opts, hasSlug);
    yield await write(ctx, DATA_PATH.replace(/\.json$/, ""), ".json", JSON.stringify(siteData));
    if (opts.rootRedirect !== "none" && !hasSlug("index") && opts.activeLanguages.length > 0) {
      const homes = opts.activeLanguages.map((l) => ({
        code: l.code,
        native: l.native,
        locale: l.locale,
        href: resolveRelative(
          "index",
          homeSlug(l.code, opts, hasSlug)
        )
      }));
      yield await write(ctx, "index", ".html", rootRedirectHtml(opts, homes, baseUrl));
    }
    if (opts.fallbackPages === "redirect") {
      const emitted = /* @__PURE__ */ new Set();
      const lower = new Set([...slugs].map((s) => s.toLowerCase()));
      for (const r of records2) {
        const source = r.source;
        if (source !== "folder" && source !== "suffix") continue;
        if (r.baseSlug === "index" || r.baseSlug.endsWith("/index")) continue;
        const group = siteData.pages[r.slug]?.translations ?? { [r.lang]: r.slug };
        for (const lang of opts.activeLanguages) {
          if (group[lang.code]) continue;
          const candidate = languageSlug(r.baseSlug, lang.code, source);
          if (!candidate || emitted.has(candidate) || lower.has(candidate.toLowerCase())) continue;
          const defaultTarget = group[opts.defaultLanguage];
          const target = defaultTarget && opts.activeLanguages.some((l) => l.code === opts.defaultLanguage) ? defaultTarget : r.slug;
          const targetLang = findLanguage(opts, siteData.pages[target]?.lang ?? r.lang);
          const t = i18n(targetLang?.locale);
          emitted.add(candidate);
          yield await write(
            ctx,
            candidate,
            ".html",
            redirectHtml({
              title: t.redirect.title,
              url: resolveRelative(candidate, target),
              lang: targetLang?.locale ?? "en",
              text: t.redirect.text({ language: targetLang?.native ?? target })
            })
          );
        }
      }
    }
  }
  return {
    name: "Multilanguage",
    emit: run,
    partialEmit: run
  };
};

// node_modules/@quartz-community/utils/dist/lang.js
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// src/components/styles/language-switcher.scss
var language_switcher_default = '@charset "UTF-8";\n.multilanguage-switcher {\n  font-size: 0.9rem;\n  line-height: 1.5;\n}\n.multilanguage-switcher ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.35rem;\n}\n.multilanguage-switcher li {\n  margin: 0;\n}\n.multilanguage-switcher a {\n  text-decoration: none;\n  color: var(--darkgray);\n}\n.multilanguage-switcher a:hover {\n  color: var(--secondary);\n}\n.multilanguage-switcher a.fallback {\n  opacity: 0.7;\n}\n.multilanguage-switcher .current {\n  font-weight: 700;\n  color: var(--dark);\n}\n.multilanguage-switcher .disabled {\n  color: var(--gray);\n  cursor: default;\n}\n.multilanguage-switcher .separator {\n  color: var(--gray);\n  user-select: none;\n}\n.multilanguage-switcher.style-flags {\n  font-size: 1.1rem;\n}\n.multilanguage-switcher.style-flags ul {\n  gap: 0.25rem;\n}\n.multilanguage-switcher.style-dropdown {\n  position: relative;\n}\n.multilanguage-switcher.style-dropdown summary {\n  cursor: pointer;\n  list-style: none;\n  display: inline-block;\n  padding: 0.15rem 0.5rem;\n  border: 1px solid var(--lightgray);\n  border-radius: 5px;\n  color: var(--darkgray);\n}\n.multilanguage-switcher.style-dropdown summary::-webkit-details-marker {\n  display: none;\n}\n.multilanguage-switcher.style-dropdown summary::after {\n  content: " \u25BE";\n  color: var(--gray);\n}\n.multilanguage-switcher.style-dropdown[open] summary {\n  border-color: var(--gray);\n}\n.multilanguage-switcher.style-dropdown ul {\n  position: absolute;\n  z-index: 10;\n  min-width: 100%;\n  margin-top: 0.25rem;\n  padding: 0.25rem 0;\n  flex-direction: column;\n  align-items: stretch;\n  gap: 0;\n  background-color: var(--light);\n  border: 1px solid var(--lightgray);\n  border-radius: 5px;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);\n}\n.multilanguage-switcher.style-dropdown li {\n  padding: 0.15rem 0.75rem;\n  white-space: nowrap;\n}\n.multilanguage-switcher.style-dropdown li:hover {\n  background-color: var(--highlight);\n}';
function labelFor(lang, targetSlug, opts, index2) {
  if (opts.switcher.style === "flags") return lang.flag;
  switch (opts.switcher.label) {
    case "code":
      return lang.code.toUpperCase();
    case "native":
      return lang.native;
    case "translatedTitle":
      return targetSlug && index2.titles.get(targetSlug) || lang.native;
    default:
      return lang.label;
  }
}
function switcherEntries(slug2, currentLang, translations, opts, index2, hasSlug) {
  const entries = [];
  for (const lang of opts.activeLanguages) {
    const target = translations[lang.code];
    const text = labelFor(lang, target, opts, index2);
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
    if (!slug2 || opts.activeLanguages.length < 2) return null;
    const files = Array.isArray(allFiles) ? allFiles : [];
    const index2 = indexFromFiles(files, opts);
    const hasSlug = (s) => index2.langs.has(s) || s === slug2;
    const record = toPageRecord(fileData, opts);
    const currentLang = record?.lang ?? opts.defaultLanguage;
    const translations = index2.bySlug.get(slug2) ?? { [currentLang]: slug2 };
    const entries = switcherEntries(slug2, currentLang, translations, opts, index2, hasSlug);
    if (!entries.some((e) => e.kind !== "current")) return null;
    const current = findLanguage(opts, currentLang);
    const t = i18n(current?.locale);
    const title = switcher.title ?? t.switcher.title;
    const currentText = labelFor(current ?? opts.activeLanguages[0], slug2, opts, index2);
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

// src/explorer.ts
function languageExplorerFilter(lang, userOpts) {
  const opts = resolveOptions(userOpts);
  const wanted = (lang ?? opts.defaultLanguage).trim().toLowerCase();
  const slugOf = (node) => node.slug ?? (node.slugSegments ? node.slugSegments.join("/") : "");
  const matches = (node) => {
    const slug2 = slugOf(node);
    if (!slug2) return true;
    if (node.isFolder || node.children && node.children.length > 0) {
      const kids = node.children ?? [];
      if (kids.length > 0) return kids.some(matches);
      const first = slug2.split("/")[0]?.toLowerCase();
      const isLangFolder = opts.languages.some((l) => l.code === first);
      return !isLangFolder || first === wanted;
    }
    return detectLanguage({ slug: slug2 }, opts).lang === wanted;
  };
  return matches;
}

export { LanguageSwitcher_default as LanguageSwitcher, MultilanguageEmitter, MultilanguageFilter, MultilanguageTransformer, languageExplorerFilter };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map