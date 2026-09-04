# quartz-multilanguage

Multilingual content for [Quartz](https://quartz.jzhao.xyz) v5. Quartz itself knows one `locale`
per site; this plugin adds everything needed to publish the same notes in several languages from
one vault:

- Language detection per page: language folders (`de/…`), file suffixes (`note.de.md`) or a
  frontmatter field, in any priority order
- Linking of translations: explicit (`translationKey`, `translations`), via Obsidian aliases
  (compatible with the Obsidian plugin "Multilingual") or implicitly by identical paths
- A language switcher component: text links, dropdown or flags; labels as code, name, native
  name or the translated page title
- `<html lang>`, `hreflang`/`x-default` links and `og:locale` per page
- Redirect from `/` to a language home, by browser language and remembered choice
- Optional notices ("only available in English" / "also available in German"), fallback
  redirects for missing translations, same-language link rewriting, localized dates
- Publish only some languages (`publishLanguages`, `QUARTZ_LANGS`) for one build per language

Eine deutsche Version dieser Dokumentation steht in [README.de.md](README.de.md).

## Installation

```bash
npx quartz plugin add github:boxi-os/quartz-multilanguage
```

Then add the plugin to `quartz.config.yaml`. One entry configures the transformer, filter,
emitter and the `LanguageSwitcher` component together; `layout` places the switcher.

```yaml
plugins:
  - source: github:boxi-os/quartz-multilanguage
    enabled: true
    order: 65 # after crawl-links (60), so link rewriting sees resolved links
    options:
      languages:
        - { code: de, label: German, native: Deutsch, locale: de-DE }
        - { code: en, label: English, native: English, locale: en-US }
      defaultLanguage: en
      rootRedirect: browser
      switcher:
        style: links
        label: native
    layout:
      position: left
      group: toolbar
      priority: 32
```

`order` matters only for `rewriteCrossLanguageLinks`; language detection works at any order
above the frontmatter plugin (`note-properties`, order 5).

## Content layout

Pick one or more conventions. Detection strategies are tried in the order of `detection`
(default: `folder`, `suffix`, `frontmatter`); a page that matches none belongs to
`defaultLanguage`.

```
content/
  de/
    index.md
    notizen/kaffee.md          # folder: language "de", base path "notizen/kaffee"
  en/
    index.md
    notes/coffee.md            # folder: language "en", base path "notes/coffee"
  guide.md                     # no match: defaultLanguage ("en"), base path "guide"
  guide.de.md                  # suffix: language "de", base path "guide"
  legal.md                     # frontmatter `lang: fr`
```

Translations of one page are linked by the strategies in `linking` (default: `frontmatter`,
`aliases`, `path`):

| Strategy      | Links pages when…                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontmatter` | they share a `translationKey`, or one lists the others under `translations` (`translations: { en: en/notes/coffee }`, wikilinks allowed).                                              |
| `aliases`     | an alias of one page equals the title or file name of a page in another language. This is what the Obsidian plugin "Multilingual" writes, so translated note names link automatically. |
| `path`        | the base path (slug without language folder or suffix) is identical, e.g. `de/notes/coffee` and `en/notes/coffee`, or `guide.md` and `guide.de.md`.                                    |

A group never holds two pages of the same language; a conflicting link is skipped with a
warning. Earlier strategies win.

Every page ends up with `fileData.multilanguage` (`lang`, `baseSlug`, `source`,
`translationKey`, `translations`) and, if it had none, `frontmatter.lang` set to the language's
`locale`, which Quartz renders as `<html lang>`.

## Options

| Option                       | Type                                                 | Default                                  | Description                                                                                                        |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `languages`                  | `(string \| Language)[]`                             | `["en"]`                                 | Languages of the site, see below. Strings are codes.                                                               |
| `defaultLanguage`            | `string`                                             | first language                           | Language of pages that match no detection strategy.                                                                |
| `detection`                  | `("folder" \| "suffix" \| "frontmatter")[]`          | all three                                | Detection strategies in priority order. `[]` puts every page in the default language.                              |
| `linking`                    | `("frontmatter" \| "aliases" \| "path")[]`           | all three                                | Linking strategies in priority order.                                                                              |
| `frontmatterKeys`            | `{ lang, key, translations }`                        | `lang`, `translationKey`, `translations` | Frontmatter keys read by the plugin.                                                                               |
| `rootRedirect`               | `"none" \| "default" \| "browser"`                   | `"none"`                                 | Write `index.html` at the site root redirecting to a language home. Only when the vault has no root `index.md`.    |
| `rememberChoice`             | `boolean`                                            | `true`                                   | Store the language chosen in the switcher in `localStorage`; the root redirect honours it.                         |
| `seo.hreflang`               | `boolean`                                            | `true`                                   | `<link rel="alternate" hreflang>` for every translation. Needs `configuration.baseUrl`.                            |
| `seo.ogLocale`               | `boolean`                                            | `true`                                   | `og:locale` and `og:locale:alternate`.                                                                             |
| `seo.xDefault`               | `"default" \| "none" \| <code>`                      | `"default"`                              | Which translation `x-default` points to.                                                                           |
| `switcher.style`             | `"links" \| "dropdown" \| "flags"`                   | `"links"`                                | Appearance of the switcher.                                                                                        |
| `switcher.label`             | `"code" \| "label" \| "native" \| "translatedTitle"` | `"label"`                                | Text of each entry. `translatedTitle` shows the target page's title.                                               |
| `switcher.showCurrent`       | `boolean`                                            | `true`                                   | Show the current language as a highlighted, non-link entry.                                                        |
| `switcher.missing`           | `"hide" \| "home" \| "disabled"`                     | `"home"`                                 | Languages without a translation of the current page: hide, link to their home, or show greyed out.                 |
| `switcher.separator`         | `string`                                             | `"\|"`                                   | Separator between entries in `links` style. Empty string for none.                                                 |
| `switcher.title`             | `string`                                             | translated "Language"                    | Accessible name of the switcher.                                                                                   |
| `missingTranslationNotice`   | `boolean`                                            | `false`                                  | Show "This page is only available in …" when the page has no translation in the visitor's language.                |
| `availableTranslationNotice` | `boolean`                                            | `false`                                  | Show "This page is also available in …" with a link when a translation in the visitor's language exists.           |
| `fallbackPages`              | `"none" \| "redirect"`                               | `"none"`                                 | Write redirect pages where a translation is missing (`de/coffee` → `en/coffee`) for folder and suffix conventions. |
| `rewriteCrossLanguageLinks`  | `boolean`                                            | `false`                                  | Rewrite links that point to another language's page when the same page exists in the page's language.              |
| `localizeDates`              | `boolean`                                            | `false`                                  | Re-format `<time datetime>` elements (content-meta dates) client-side in the page language.                        |
| `publishLanguages`           | `string[]`                                           | `[]` (all)                               | Only publish these languages. `QUARTZ_LANGS=de,en` overrides at build time.                                        |

A language entry:

| Field    | Description                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| `code`   | Code used in folders, suffixes and frontmatter, e.g. `de`. Required.                                                  |
| `label`  | Display name, e.g. `German`. Defaults to the upper-cased code.                                                        |
| `native` | Name in the language itself, e.g. `Deutsch`. Defaults to `label`. Used for `switcher.label: native` and in notices.   |
| `locale` | BCP 47 locale for `<html lang>`, `hreflang` and `og:locale`, e.g. `de-DE`. Defaults to `code`.                        |
| `home`   | Slug of the language's home page. Defaults to `<code>/index` if it exists, else `index` for the default language.     |
| `flag`   | Text or emoji for `switcher.style: flags`. Defaults to the flag of the locale's region (`de-DE` → 🇩🇪), else the code. |

Defaults live in the plugin code; Quartz passes the raw YAML options through.

## Language switcher

The component renders one entry per configured language:

```html
<nav
  class="multilanguage-switcher style-links"
  aria-label="Language"
  data-lang="de"
  data-translations="…"
>
  <ul>
    <li><span class="current" aria-current="page" lang="de-DE">Deutsch</span></li>
    <li class="separator" aria-hidden="true">|</li>
    <li><a href="../en/notes/coffee" hreflang="en-US" lang="en-US" data-lang="en">English</a></li>
    <li class="separator" aria-hidden="true">|</li>
    <li>
      <a
        href="../fr/"
        class="fallback"
        hreflang="fr-FR"
        lang="fr-FR"
        data-lang="fr"
        title="Français (home page)"
        >Français</a
      >
    </li>
  </ul>
</nav>
```

`style: dropdown` renders a `<details>` element (works without JavaScript; the plugin's script
closes it on outside clicks and Escape). `style: flags` shows `flag` with the native name as
tooltip. The switcher renders nothing on single-language sites and on pages that have no other
entry to show.

Place it in the toolbar next to search and dark mode (`position: left`, `group: toolbar`) or
anywhere else. Styles are minimal and use the theme variables; override them in
`quartz/styles/custom.scss` via `.multilanguage-switcher`.

## SEO

With `configuration.baseUrl` set, every page that has translations gets

```html
<link rel="alternate" hreflang="de-DE" href="https://example.org/de/notizen/kaffee" />
<link rel="alternate" hreflang="en-US" href="https://example.org/en/notes/coffee" />
<link rel="alternate" hreflang="x-default" href="https://example.org/en/notes/coffee" />
<meta property="og:locale" content="de_DE" />
<meta property="og:locale:alternate" content="en_US" />
```

Translations are looked up from the pages seen during the build's filter stage; for folder and
suffix conventions the plugin falls back to the slugs alone, so hreflang works even without it.

## Root redirect

Quartz serves `content/index.md` at `/`. If you keep one home page per language instead
(`de/index.md`, `en/index.md`), set `rootRedirect` and the plugin writes a small `index.html`:

- `default`: redirects to the default language's home.
- `browser`: picks the first of the remembered choice and `navigator.languages` that matches a
  configured language, then falls back to the default. Includes a `<noscript>` meta refresh and a
  plain list of language links.

## Notices

`missingTranslationNotice` and `availableTranslationNotice` insert a hidden callout at the top of
every page. The plugin's script compares the page language with the visitor's preferred language
(remembered choice, then browser language) and shows the matching text in the visitor's language.
Texts come from the plugin's own translations (`en-US`, `de-DE`, `fr-FR`, `es-ES`; others fall
back to English). The callout uses the `callout` class, so the Obsidian callout styles apply when
that plugin is enabled.

## Fallback redirects

With `fallbackPages: redirect`, a page that exists only as `en/notes/coffee` also gets
`de/notes/coffee/index.html`, redirecting to the English page (with `noindex`). This keeps links
and bookmarks that follow the folder or suffix convention working. Folder index pages are skipped
so the folder-page plugin's listings are never overwritten.

## Cross-language links

Obsidian resolves `[[coffee]]` to the shortest matching path, which may be the other language's
copy. With `rewriteCrossLanguageLinks: true` a link from a German page to `en/notes/coffee` is
rewritten to `de/notes/coffee` when that page exists (folder and suffix conventions only). Give
the plugin an `order` above `crawl-links` (60) for this.

## Dates

`localizeDates: true` re-formats every `<time datetime>` element in the browser with
`Intl.DateTimeFormat` in the page language, using the same format as Quartz's `formatDate`.
Without it, dates follow the site-wide `locale`.

## One build per language

`publishLanguages: [de]` (or `QUARTZ_LANGS=de npx quartz build`) drops every other language
before rendering. Combine it with a per-build `quartz.config.yaml` (`locale`, `baseUrl`) to deploy
fully localized sites, including the UI strings of all other plugins, which always follow the
site-wide `locale`.

## Explorer

The explorer plugin accepts a `filterFn` only from `quartz.ts`. The plugin exports a helper:

```ts
// quartz.ts
import { languageExplorerFilter } from "./.quartz/plugins/quartz-multilanguage";

Explorer({ filterFn: languageExplorerFilter("de", { languages: ["de", "en"] }) });
```

## Obsidian "Multilingual"

The Obsidian community plugin [Multilingual](https://github.com/leolazou/obsidian-multilingual)
stores translated note names as plain `aliases`. The `aliases` linking strategy matches those
against titles and file names of pages in other languages, so `de/Kaffee.md` (alias `Coffee`) and
`en/Coffee.md` are linked without any extra frontmatter. `switcher.label: translatedTitle` then
shows "Coffee" on the German page and "Kaffee" on the English one.

## Limitations

- UI strings of other plugins (explorer title, "Backlinks", dates in content-meta) follow the
  site-wide `locale`. Use one build per language for fully localized UI.
- `dir` (right-to-left) is global in Quartz; the plugin does not change it per page.
- The search index spans all languages.
- Pages detected only via frontmatter have no slug convention, so fallback redirects and link
  rewriting do not apply to them; hreflang and the switcher still work.

## Development

```bash
npm install
npm run check   # typecheck + lint + format + tests
npm run build   # writes dist/ (committed, Quartz installs from it)
```

`dist/` is committed on purpose. After changing anything under `src/`, run `npm run build` and
commit the updated `dist/`.

## License

MIT
