import type { Element, Root, Text } from "hast";
import type { FullSlug, QuartzTransformerPlugin } from "@quartz-community/types";
import { resolveRelative, simplifySlug } from "@quartz-community/utils/path";
import { visit } from "unist-util-visit";
import type {
  MultilanguageFileData,
  MultilanguageOptions,
  ResolvedOptions,
  TranslationMap,
} from "./types";
import { detectLanguage, languageSlug } from "./language/detect";
import { findLanguage, resolveOptions } from "./options";
import { homeSlug, readFrontmatterFields, toPageRecord } from "./records";
import { registryIndex, registrySize } from "./registry";
import { i18n } from "./i18n";
import { warnOnce } from "./util/warn";
import noticeStyle from "./styles/notice.scss";
// @ts-expect-error: bundled to a browser-ready string by the inline-script loader in tsup.config.ts
import clientScript from "./scripts/multilanguage.inline";

type Frontmatter = Record<string, unknown>;

export const STORAGE_KEY = "multilanguage-lang";
export const DATA_PATH = "static/multilanguage.json";

function fileDataOf(data: Record<string, unknown>, opts: ResolvedOptions): MultilanguageFileData {
  const stored = data.multilanguage as MultilanguageFileData | undefined;
  if (stored) return stored;
  const frontmatter = data.frontmatter as Frontmatter | undefined;
  return {
    ...detectLanguage({ slug: String(data.slug ?? ""), frontmatter }, opts),
    ...readFrontmatterFields(frontmatter, opts),
  };
}

/** Translations derived from the slug convention alone (folder / suffix); works without an index. */
export function conventionTranslations(
  ml: MultilanguageFileData,
  slug: string,
  opts: ResolvedOptions,
  hasSlug: (s: string) => boolean,
): TranslationMap {
  const map: TranslationMap = { [ml.lang]: slug };
  for (const lang of opts.languages) {
    if (lang.code === ml.lang) continue;
    const candidates = [languageSlug(ml.baseSlug, lang.code, ml.source)];
    if (ml.source !== "default" && lang.code === opts.defaultLanguage) candidates.push(ml.baseSlug);
    if (ml.source === "default" && opts.detection.includes("folder")) {
      candidates.push(`${lang.code}/${ml.baseSlug}`);
    }
    if (ml.source === "default" && opts.detection.includes("suffix")) {
      candidates.push(`${ml.baseSlug}.${lang.code}`);
    }
    const hit = candidates.find((c): c is string => c !== undefined && hasSlug(c));
    if (hit) map[lang.code] = hit;
  }
  return map;
}

export function absoluteUrl(baseUrl: string, slug: string): string {
  const root = `https://${baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  const simple = simplifySlug(slug as FullSlug) as string;
  return simple === "/" ? `${root}/` : `${root}/${simple}`;
}

function ogLocale(locale: string): string {
  return locale.replace("-", "_");
}

/** Splits a translated sentence around a placeholder into HAST nodes with an element in between. */
function sentence(text: string, placeholder: string, inner: Element): (Text | Element)[] {
  const [before = "", after = ""] = text.split(placeholder);
  const nodes: (Text | Element)[] = [];
  if (before) nodes.push({ type: "text", value: before });
  nodes.push(inner);
  if (after) nodes.push({ type: "text", value: after });
  return nodes;
}

const PLACEHOLDER = "{{}}"; // never part of a translation

function noticeElement(ml: MultilanguageFileData, slug: string, opts: ResolvedOptions): Element {
  const paragraphs: Element[] = [];
  for (const lang of opts.languages) {
    if (lang.code === ml.lang) continue;
    const t = i18n(lang.locale);
    if (opts.missingTranslationNotice) {
      paragraphs.push({
        type: "element",
        tagName: "p",
        properties: {
          dataMlFor: lang.code,
          dataMlVariant: "missing",
          lang: lang.locale,
          hidden: true,
        },
        children: sentence(t.notice.missing({ languages: PLACEHOLDER }), PLACEHOLDER, {
          type: "element",
          tagName: "span",
          properties: { dataMlLanguages: "" },
          children: [],
        }),
      });
    }
    if (opts.availableTranslationNotice) {
      paragraphs.push({
        type: "element",
        tagName: "p",
        properties: {
          dataMlFor: lang.code,
          dataMlVariant: "available",
          lang: lang.locale,
          hidden: true,
        },
        children: [
          ...sentence(t.notice.available({ language: PLACEHOLDER }), PLACEHOLDER, {
            type: "element",
            tagName: "strong",
            properties: {},
            children: [{ type: "text", value: lang.native }],
          }),
          { type: "text", value: " " },
          {
            type: "element",
            tagName: "a",
            properties: { dataMlLink: "", href: "#", className: ["internal"] },
            children: [{ type: "text", value: lang.native }],
          },
        ],
      });
    }
  }
  return {
    type: "element",
    tagName: "blockquote",
    properties: {
      className: ["callout", "multilanguage-notice"],
      dataCallout: "info",
      dataMlLang: ml.lang,
      dataMlSlug: slug,
      hidden: true,
    },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { className: ["callout-content"] },
        children: paragraphs,
      },
    ],
  };
}

export const MultilanguageTransformer: QuartzTransformerPlugin<MultilanguageOptions> = (
  userOpts,
) => {
  const opts = resolveOptions(userOpts);
  const wantsNotice = opts.missingTranslationNotice || opts.availableTranslationNotice;

  return {
    name: "Multilanguage",

    markdownPlugins() {
      return [
        () => (_tree, file) => {
          const data = file.data as Record<string, unknown>;
          const slug = String(data.slug ?? "");
          if (!slug) return;
          const frontmatter = data.frontmatter as Frontmatter | undefined;
          const detection = detectLanguage({ slug, frontmatter }, opts);
          const ml: MultilanguageFileData = {
            ...detection,
            ...readFrontmatterFields(frontmatter, opts),
          };
          data.multilanguage = ml;

          // Quartz renders `<html lang>` from `frontmatter.lang`; fill it in when the page
          // does not set it itself, using the BCP 47 locale of the detected language.
          if (frontmatter) {
            const locale = findLanguage(opts, ml.lang)?.locale ?? ml.lang;
            if (typeof frontmatter.lang !== "string" || !frontmatter.lang.trim()) {
              frontmatter.lang = locale;
            }
          }
        },
      ];
    },

    htmlPlugins(ctx) {
      if (!opts.rewriteCrossLanguageLinks && !wantsNotice) return [];
      const slugs = new Set<string>(ctx.allSlugs);
      const hasSlug = (s: string) => slugs.has(s);

      return [
        () => (tree: Root, file) => {
          const data = file.data as Record<string, unknown>;
          const slug = String(data.slug ?? "");
          if (!slug) return;
          const ml = fileDataOf(data, opts);

          if (opts.rewriteCrossLanguageLinks) {
            visit(tree, "element", (node: Element) => {
              if (node.tagName !== "a") return;
              const target = node.properties?.dataSlug;
              if (typeof target !== "string" || !target) return;
              const targetMl = detectLanguage({ slug: target }, opts);
              if (targetMl.lang === ml.lang || targetMl.source === "default") return;

              const candidates = [languageSlug(targetMl.baseSlug, ml.lang, targetMl.source)];
              if (ml.lang === opts.defaultLanguage) candidates.push(targetMl.baseSlug);
              const replacement = candidates.find(
                (c): c is string => c !== undefined && hasSlug(c),
              );
              if (!replacement) return;

              const href = typeof node.properties.href === "string" ? node.properties.href : "";
              const anchor = href.includes("#") ? href.slice(href.indexOf("#")) : "";
              node.properties.href =
                resolveRelative(slug as FullSlug, replacement as FullSlug) + anchor;
              node.properties.dataSlug = replacement;

              const links = data.links;
              if (Array.isArray(links)) {
                const from = simplifySlug(target as FullSlug) as string;
                const to = simplifySlug(replacement as FullSlug) as string;
                const i = links.indexOf(from);
                if (i >= 0 && !links.includes(to)) links[i] = to;
              }
            });
          }

          if (wantsNotice && opts.languages.length > 1) {
            tree.children.unshift(noticeElement(ml, slug, opts));
          }
        },
      ];
    },

    externalResources(ctx) {
      const baseUrl = ctx.cfg.configuration.baseUrl;
      const slugs = new Set<string>(ctx.allSlugs);
      const hasSlug = (s: string) => slugs.has(s);
      const allSlugs = ctx.allSlugs;

      const clientConfig = {
        languages: opts.languages.map((l) => ({
          code: l.code,
          label: l.label,
          native: l.native,
          locale: l.locale,
          home: homeSlug(l.code, opts, hasSlug),
        })),
        defaultLanguage: opts.defaultLanguage,
        rememberChoice: opts.rememberChoice,
        storageKey: STORAGE_KEY,
        noticeMissing: opts.missingTranslationNotice,
        noticeAvailable: opts.availableTranslationNotice,
        localizeDates: opts.localizeDates,
        dataPath: DATA_PATH,
      };

      if (opts.seo.hreflang && !baseUrl && opts.languages.length > 1) {
        warnOnce(
          "hreflang-baseurl",
          "`seo.hreflang` needs `configuration.baseUrl`; skipping hreflang links.",
        );
      }

      const headFor = (fileData: Record<string, unknown>) => {
        const slug = String(fileData.slug ?? "");
        if (!slug) return null;
        const ml = fileDataOf(fileData, opts);
        const record = toPageRecord(fileData, opts);
        let translations: TranslationMap | undefined;
        if (registrySize() > 0) translations = registryIndex(opts, allSlugs).bySlug.get(slug);
        translations ??= conventionTranslations(ml, slug, opts, hasSlug);
        const lang = record?.lang ?? ml.lang;
        const locale = findLanguage(opts, lang)?.locale ?? lang;
        const others = Object.entries(translations).filter(([code]) => code !== lang);

        const tags: unknown[] = [];
        if (opts.seo.ogLocale) {
          tags.push(<meta property="og:locale" content={ogLocale(locale)} />);
          for (const [code] of others) {
            const alt = findLanguage(opts, code)?.locale ?? code;
            tags.push(<meta property="og:locale:alternate" content={ogLocale(alt)} />);
          }
        }
        if (opts.seo.hreflang && baseUrl && others.length > 0) {
          for (const [code, tSlug] of Object.entries(translations)) {
            const l = findLanguage(opts, code)?.locale ?? code;
            tags.push(<link rel="alternate" hreflang={l} href={absoluteUrl(baseUrl, tSlug)} />);
          }
          const xCode = opts.seo.xDefault === "default" ? opts.defaultLanguage : opts.seo.xDefault;
          const xSlug = xCode !== "none" ? translations[xCode] : undefined;
          if (xSlug) {
            tags.push(
              <link rel="alternate" hreflang="x-default" href={absoluteUrl(baseUrl, xSlug)} />,
            );
          }
        }
        return tags.length > 0 ? <>{tags}</> : null;
      };

      return {
        css: wantsNotice ? [{ content: noticeStyle as string, inline: true }] : [],
        js: [
          {
            loadTime: "afterDOMReady",
            contentType: "inline",
            script: `window.__quartzMultilanguage=${JSON.stringify(clientConfig)};\n${clientScript as string}`,
          },
        ],
        additionalHead: [headFor],
      };
    },
  };
};
