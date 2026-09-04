import type {
  FullSlug,
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types";
import { resolveRelative } from "@quartz-community/utils/path";
import type { MultilanguageOptions, ResolvedLanguage, ResolvedOptions } from "../types";
import { findLanguage, resolveOptions } from "../options";
import { homeSlug, indexFromFiles, toPageRecord } from "../records";
import type { TranslationIndex } from "../language/link";
import { i18n } from "../i18n";
import { classNames } from "../util/lang";
import style from "./styles/language-switcher.scss";

type Entry =
  | { kind: "current"; lang: ResolvedLanguage; text: string }
  | { kind: "link"; lang: ResolvedLanguage; text: string; href: string; fallback: boolean }
  | { kind: "disabled"; lang: ResolvedLanguage; text: string };

function labelFor(
  lang: ResolvedLanguage,
  targetSlug: string | undefined,
  opts: ResolvedOptions,
  index: TranslationIndex,
): string {
  if (opts.switcher.style === "flags") return lang.flag;
  switch (opts.switcher.label) {
    case "code":
      return lang.code.toUpperCase();
    case "native":
      return lang.native;
    case "translatedTitle":
      return (targetSlug && index.titles.get(targetSlug)) || lang.native;
    default:
      return lang.label;
  }
}

export function switcherEntries(
  slug: string,
  currentLang: string,
  translations: Record<string, string>,
  opts: ResolvedOptions,
  index: TranslationIndex,
  hasSlug: (s: string) => boolean,
): Entry[] {
  const entries: Entry[] = [];
  for (const lang of opts.activeLanguages) {
    const target = translations[lang.code];
    const text = labelFor(lang, target, opts, index);
    if (lang.code === currentLang) {
      if (opts.switcher.showCurrent) entries.push({ kind: "current", lang, text });
      continue;
    }
    if (target) {
      const href = resolveRelative(slug as FullSlug, target as FullSlug) as string;
      entries.push({ kind: "link", lang, text, href, fallback: false });
      continue;
    }
    if (opts.switcher.missing === "hide") continue;
    if (opts.switcher.missing === "disabled") {
      entries.push({ kind: "disabled", lang, text });
      continue;
    }
    const home = homeSlug(lang.code, opts, hasSlug);
    const href = resolveRelative(slug as FullSlug, home as FullSlug) as string;
    entries.push({ kind: "link", lang, text, href, fallback: true });
  }
  return entries;
}

export default ((userOpts?: MultilanguageOptions) => {
  const opts = resolveOptions(userOpts);
  const { switcher } = opts;

  const LanguageSwitcher: QuartzComponent = (props: QuartzComponentProps) => {
    const { fileData, allFiles, displayClass } = props;
    const slug = typeof fileData.slug === "string" ? fileData.slug : "";
    if (!slug || opts.activeLanguages.length < 2) return null;

    const files = (Array.isArray(allFiles) ? allFiles : []) as Record<string, unknown>[];
    const index = indexFromFiles(files, opts);
    const hasSlug = (s: string) => index.langs.has(s) || s === slug;
    const record = toPageRecord(fileData, opts);
    const currentLang = record?.lang ?? opts.defaultLanguage;
    const translations = index.bySlug.get(slug) ?? { [currentLang]: slug };

    const entries = switcherEntries(slug, currentLang, translations, opts, index, hasSlug);
    if (!entries.some((e) => e.kind !== "current")) return null;

    const current = findLanguage(opts, currentLang);
    const t = i18n(current?.locale);
    const title = switcher.title ?? t.switcher.title;
    const currentText = labelFor(current ?? opts.activeLanguages[0]!, slug, opts, index);

    const items: unknown[] = [];
    entries.forEach((entry, i) => {
      if (i > 0 && switcher.style === "links" && switcher.separator) {
        items.push(
          <li class="separator" aria-hidden="true">
            {switcher.separator}
          </li>,
        );
      }
      const flagTitle = switcher.style === "flags" ? entry.lang.native : undefined;
      if (entry.kind === "current") {
        items.push(
          <li>
            <span class="current" aria-current="page" lang={entry.lang.locale} title={flagTitle}>
              {entry.text}
            </span>
          </li>,
        );
      } else if (entry.kind === "disabled") {
        items.push(
          <li>
            <span
              class="disabled"
              aria-disabled="true"
              lang={entry.lang.locale}
              title={t.switcher.unavailable({ language: entry.lang.native })}
            >
              {entry.text}
            </span>
          </li>,
        );
      } else {
        items.push(
          <li>
            <a
              href={entry.href}
              class={entry.fallback ? "fallback" : undefined}
              hreflang={entry.lang.locale}
              lang={entry.lang.locale}
              data-lang={entry.lang.code}
              title={
                entry.fallback ? t.switcher.homeOf({ language: entry.lang.native }) : flagTitle
              }
            >
              {entry.text}
            </a>
          </li>,
        );
      }
    });

    const cls = classNames(displayClass, "multilanguage-switcher", `style-${switcher.style}`);
    const data = {
      "data-lang": currentLang,
      "data-translations": JSON.stringify(translations),
    };

    if (switcher.style === "dropdown") {
      return (
        <details class={cls} {...data}>
          <summary aria-label={title} title={title}>
            {currentText}
          </summary>
          <ul>{items}</ul>
        </details>
      );
    }

    return (
      <nav class={cls} aria-label={title} {...data}>
        <ul>{items}</ul>
      </nav>
    );
  };

  LanguageSwitcher.css = style;
  return LanguageSwitcher;
}) satisfies QuartzComponentConstructor<MultilanguageOptions>;
