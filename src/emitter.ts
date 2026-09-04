import fs from "node:fs/promises";
import path from "node:path";
import type {
  BuildCtx,
  FilePath,
  FullSlug,
  ProcessedContent,
  QuartzEmitterPlugin,
} from "@quartz-community/types";
import { escapeHTML } from "@quartz-community/utils/escape";
import { joinSegments, resolveRelative } from "@quartz-community/utils/path";
import type { MultilanguageOptions, ResolvedOptions, TranslationMap } from "./types";
import { buildTranslationIndex, type PageRecord } from "./language/link";
import { languageSlug } from "./language/detect";
import { findLanguage, resolveOptions } from "./options";
import { homeSlug, toPageRecord } from "./records";
import { i18n } from "./i18n";
import { DATA_PATH, STORAGE_KEY } from "./transformer";

async function write(ctx: BuildCtx, slug: string, ext: string, content: string): Promise<FilePath> {
  const target = joinSegments(ctx.argv.output, slug + ext) as FilePath;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
  return target;
}

export function redirectHtml(args: {
  title: string;
  url: string;
  lang: string;
  text: string;
}): string {
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

export interface HomeLink {
  code: string;
  native: string;
  locale: string;
  /** Relative to the site root, e.g. `./de/`. */
  href: string;
}

export function rootRedirectHtml(
  opts: ResolvedOptions,
  homes: HomeLink[],
  baseUrl: string | undefined,
): string {
  const def = homes.find((h) => h.code === opts.defaultLanguage) ?? homes[0]!;
  const t = i18n(def.locale);
  const links = homes
    .map(
      (h) =>
        `<li><a href="${escapeHTML(h.href)}" hreflang="${escapeHTML(h.locale)}" lang="${escapeHTML(h.locale)}">${escapeHTML(h.native)}</a></li>`,
    )
    .join("\n");
  const root = baseUrl
    ? `https://${baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
    : undefined;
  const alternates = root
    ? homes
        .map((h) => {
          const target = h.href.replace(/^\.\//, "");
          return `<link rel="alternate" hreflang="${escapeHTML(h.locale)}" href="${escapeHTML(`${root}/${target}`)}">`;
        })
        .join("\n")
    : "";

  const byCode = JSON.stringify(Object.fromEntries(homes.map((h) => [h.code, h.href])));
  const byLocale = JSON.stringify(
    Object.fromEntries(homes.map((h) => [h.locale.toLowerCase(), h.code])),
  );
  const stored = opts.rememberChoice
    ? `try{stored=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});}catch(e){}`
    : "";
  const script =
    opts.rootRedirect === "browser"
      ? `<script>(function(){
var homes=${byCode},locales=${byLocale},stored=null;${stored}
var cands=[stored].concat(navigator.languages||[navigator.language]);
for(var i=0;i<cands.length;i++){var c=cands[i];if(!c)continue;c=String(c).toLowerCase();
var p=c.split(/[-_]/)[0];var code=homes[c]?c:(locales[c]||(homes[p]?p:null));
if(code){location.replace(homes[code]);return;}}
location.replace(${JSON.stringify(def.href)});})();</script>`
      : `<script>location.replace(${JSON.stringify(def.href)});</script>`;

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

export interface SiteData {
  version: 1;
  defaultLanguage: string;
  languages: { code: string; label: string; native: string; locale: string; home: string }[];
  pages: Record<string, { lang: string; translations?: TranslationMap }>;
}

export function buildSiteData(
  records: PageRecord[],
  opts: ResolvedOptions,
  hasSlug: (s: string) => boolean,
): SiteData {
  const index = buildTranslationIndex(records, opts);
  const pages: SiteData["pages"] = {};
  for (const r of records) {
    const translations = index.bySlug.get(r.slug);
    const entry: { lang: string; translations?: TranslationMap } = { lang: r.lang };
    if (translations && Object.keys(translations).length > 1) entry.translations = translations;
    pages[r.slug] = entry;
  }
  return {
    version: 1,
    defaultLanguage: opts.defaultLanguage,
    languages: opts.languages.map((l) => ({
      code: l.code,
      label: l.label,
      native: l.native,
      locale: l.locale,
      home: homeSlug(l.code, opts, hasSlug),
    })),
    pages,
  };
}

export const MultilanguageEmitter: QuartzEmitterPlugin<MultilanguageOptions> = (userOpts) => {
  const opts = resolveOptions(userOpts);

  async function* run(ctx: BuildCtx, content: ProcessedContent[]): AsyncGenerator<FilePath> {
    const records = content
      .map(([, file]) => toPageRecord(file.data as Record<string, unknown>, opts))
      .filter((r): r is PageRecord => r !== undefined);
    const slugs = new Set<string>([...ctx.allSlugs, ...records.map((r) => r.slug)]);
    const hasSlug = (s: string) => slugs.has(s);
    const baseUrl = ctx.cfg.configuration.baseUrl;

    const siteData = buildSiteData(records, opts, hasSlug);
    yield await write(ctx, DATA_PATH.replace(/\.json$/, ""), ".json", JSON.stringify(siteData));

    if (opts.rootRedirect !== "none" && !hasSlug("index")) {
      const homes: HomeLink[] = opts.languages.map((l) => ({
        code: l.code,
        native: l.native,
        locale: l.locale,
        href: resolveRelative(
          "index" as FullSlug,
          homeSlug(l.code, opts, hasSlug) as FullSlug,
        ) as string,
      }));
      yield await write(ctx, "index", ".html", rootRedirectHtml(opts, homes, baseUrl));
    }

    if (opts.fallbackPages === "redirect") {
      const emitted = new Set<string>();
      const lower = new Set([...slugs].map((s) => s.toLowerCase()));
      for (const r of records) {
        const source = r.source;
        if (source !== "folder" && source !== "suffix") continue;
        // Folder listings live at `<folder>/index`; the folder-page plugin may emit them
        // without listing them in allSlugs, so never write a redirect there.
        if (r.baseSlug === "index" || r.baseSlug.endsWith("/index")) continue;
        const group = siteData.pages[r.slug]?.translations ?? { [r.lang]: r.slug };
        for (const lang of opts.languages) {
          if (group[lang.code]) continue;
          const candidate = languageSlug(r.baseSlug, lang.code, source);
          if (!candidate || emitted.has(candidate) || lower.has(candidate.toLowerCase())) continue;
          const target = group[opts.defaultLanguage] ?? r.slug;
          const targetLang = findLanguage(opts, siteData.pages[target]?.lang ?? r.lang);
          const t = i18n(targetLang?.locale);
          emitted.add(candidate);
          yield await write(
            ctx,
            candidate,
            ".html",
            redirectHtml({
              title: t.redirect.title,
              url: resolveRelative(candidate as FullSlug, target as FullSlug) as string,
              lang: targetLang?.locale ?? "en",
              text: t.redirect.text({ language: targetLang?.native ?? target }),
            }),
          );
        }
      }
    }
  }

  return {
    name: "Multilanguage",
    emit: run,
    partialEmit: run,
  };
};
