import type {
  DetectionStrategy,
  LanguageConfig,
  LinkingStrategy,
  MultilanguageOptions,
  ResolvedLanguage,
  ResolvedOptions,
} from "./types";
import { warnOnce } from "./util/warn";

const DETECTION: readonly DetectionStrategy[] = ["folder", "suffix", "frontmatter"];
const LINKING: readonly LinkingStrategy[] = ["frontmatter", "aliases", "path"];

/**
 * Defaults live here, not in the manifest: Quartz passes the raw YAML `options` to every
 * factory and never merges `quartz.defaultOptions` from package.json.
 */
export const defaultOptions = {
  languages: ["en"],
  defaultLanguage: "en",
  detection: [...DETECTION],
  linking: [...LINKING],
  frontmatterKeys: { lang: "lang", key: "translationKey", translations: "translations" },
  rootRedirect: "none",
  rememberChoice: true,
  seo: { hreflang: true, ogLocale: true, xDefault: "default" },
  switcher: {
    style: "links",
    label: "label",
    showCurrent: true,
    missing: "home",
    separator: "|",
  },
  missingTranslationNotice: false,
  availableTranslationNotice: false,
  fallbackPages: "none",
  rewriteCrossLanguageLinks: false,
  localizeDates: false,
  publishLanguages: [],
} satisfies MultilanguageOptions;

/** Turns a region code (`DE`) into its regional-indicator emoji (🇩🇪). */
export function flagEmoji(region: string): string | undefined {
  const r = region.toUpperCase();
  if (!/^[A-Z]{2}$/.test(r)) return undefined;
  return String.fromCodePoint(...[...r].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function normalizeSlug(value: string): string {
  let s = value.trim().replace(/^\/+|\/+$/g, "");
  if (s.endsWith(".md")) s = s.slice(0, -3);
  return s;
}

function resolveLanguage(input: LanguageConfig | string): ResolvedLanguage | undefined {
  const cfg = typeof input === "string" ? { code: input } : input;
  const code = (cfg?.code ?? "").trim().toLowerCase();
  if (!code) {
    warnOnce("language-without-code", "Ignoring a language entry without a `code`.");
    return undefined;
  }
  const label = cfg.label?.trim() || code.toUpperCase();
  const locale = cfg.locale?.trim() || code;
  const region = locale.split(/[-_]/)[1];
  return {
    code,
    label,
    native: cfg.native?.trim() || label,
    locale,
    home: cfg.home ? normalizeSlug(cfg.home) : undefined,
    flag: cfg.flag?.trim() || (region && flagEmoji(region)) || code.toUpperCase(),
  };
}

function pickEnum<T extends string>(
  key: string,
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined) return fallback;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  warnOnce(
    `enum:${key}:${String(value)}`,
    `Unknown value ${JSON.stringify(value)} for \`${key}\`; using \`${fallback}\`.`,
  );
  return fallback;
}

function pickList<T extends string>(key: string, value: unknown, allowed: readonly T[]): T[] {
  const list = Array.isArray(value) ? value : [value];
  const out: T[] = [];
  for (const v of list) {
    if (typeof v === "string" && (allowed as readonly string[]).includes(v)) {
      if (!out.includes(v as T)) out.push(v as T);
    } else {
      warnOnce(
        `list:${key}:${String(v)}`,
        `Ignoring unknown \`${key}\` entry ${JSON.stringify(v)}.`,
      );
    }
  }
  return out;
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function resolveOptions(userOpts?: MultilanguageOptions): ResolvedOptions {
  const user = userOpts ?? {};

  let languages = (user.languages ?? defaultOptions.languages)
    .map(resolveLanguage)
    .filter((l): l is ResolvedLanguage => l !== undefined);
  if (languages.length === 0) {
    warnOnce("no-languages", "No languages configured; falling back to `en`.");
    languages = [resolveLanguage("en")!];
  }
  const seen = new Set<string>();
  languages = languages.filter((l) => {
    if (seen.has(l.code)) {
      warnOnce(
        `dup-language:${l.code}`,
        `Language \`${l.code}\` is configured twice; ignoring the duplicate.`,
      );
      return false;
    }
    seen.add(l.code);
    return true;
  });

  let defaultLanguage = (user.defaultLanguage ?? "").trim().toLowerCase();
  if (!defaultLanguage) {
    defaultLanguage = languages[0]!.code;
  } else if (!seen.has(defaultLanguage)) {
    warnOnce(
      `default-language:${defaultLanguage}`,
      `\`defaultLanguage: ${defaultLanguage}\` is not in \`languages\`; using \`${languages[0]!.code}\`.`,
    );
    defaultLanguage = languages[0]!.code;
  }

  const detection =
    user.detection === undefined
      ? [...DETECTION]
      : pickList("detection", user.detection, DETECTION);
  const linking =
    user.linking === undefined ? [...LINKING] : pickList("linking", user.linking, LINKING);

  const seo = user.seo ?? {};
  const xDefault = typeof seo.xDefault === "string" ? seo.xDefault.trim().toLowerCase() : "default";
  if (xDefault !== "default" && xDefault !== "none" && !seen.has(xDefault)) {
    warnOnce(
      `x-default:${xDefault}`,
      `\`seo.xDefault: ${xDefault}\` is not a configured language; using \`default\`.`,
    );
  }

  const sw = user.switcher ?? {};
  const style = pickEnum(
    "switcher.style",
    sw.style,
    ["links", "dropdown", "flags"] as const,
    "links",
  );

  const envLangs = process.env.QUARTZ_LANGS;
  const publishSource =
    envLangs !== undefined ? envLangs.split(",") : (user.publishLanguages ?? []);
  const publishLanguages = publishSource
    .map((l) => String(l).trim().toLowerCase())
    .filter((l) => l.length > 0)
    .filter((l) => {
      if (seen.has(l)) return true;
      warnOnce(
        `publish:${l}`,
        `\`publishLanguages\` contains unknown language \`${l}\`; ignoring it.`,
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
      translations:
        user.frontmatterKeys?.translations || defaultOptions.frontmatterKeys.translations,
    },
    rootRedirect: pickEnum(
      "rootRedirect",
      user.rootRedirect,
      ["none", "default", "browser"] as const,
      "none",
    ),
    rememberChoice: pickBoolean(user.rememberChoice, true),
    seo: {
      hreflang: pickBoolean(seo.hreflang, true),
      ogLocale: pickBoolean(seo.ogLocale, true),
      xDefault: xDefault === "none" || seen.has(xDefault) ? xDefault : "default",
    },
    switcher: {
      style,
      label: pickEnum(
        "switcher.label",
        sw.label,
        ["code", "label", "native", "translatedTitle"] as const,
        "label",
      ),
      showCurrent: pickBoolean(sw.showCurrent, true),
      missing: pickEnum(
        "switcher.missing",
        sw.missing,
        ["hide", "home", "disabled"] as const,
        "home",
      ),
      separator: typeof sw.separator === "string" ? sw.separator : "|",
      title: typeof sw.title === "string" && sw.title.trim() ? sw.title.trim() : undefined,
    },
    missingTranslationNotice: pickBoolean(user.missingTranslationNotice, false),
    availableTranslationNotice: pickBoolean(user.availableTranslationNotice, false),
    fallbackPages: pickEnum(
      "fallbackPages",
      user.fallbackPages,
      ["none", "redirect"] as const,
      "none",
    ),
    rewriteCrossLanguageLinks: pickBoolean(user.rewriteCrossLanguageLinks, false),
    localizeDates: pickBoolean(user.localizeDates, false),
    publishLanguages,
  };
}

export function findLanguage(opts: ResolvedOptions, code: string): ResolvedLanguage | undefined {
  return opts.languages.find((l) => l.code === code);
}
