# quartz-multilanguage

Multilingual content for [Quartz](https://quartz.jzhao.xyz) v5. Quartz itself knows one `locale`
per site; this plugin adds everything needed to publish the same notes in several languages from
one vault.

**📖 The handbook is at [boxi-os.github.io/quartz-multilanguage](https://boxi-os.github.io/quartz-multilanguage/)** —
nine chapters in English and German, with every option explained by example and the reasoning behind
the awkward parts. This README is the short version.

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
    layout:
      position: header
      group: toolbar
```

`order` only matters for `rewriteCrossLanguageLinks` — see
[7.2](https://boxi-os.github.io/quartz-multilanguage/en/7-notices/02-links-between-languages).

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

Everything else — how content is laid out, how translations find each other, the switcher, SEO,
redirects, notices and building one site per language — is in the handbook:

| Chapter                                                                                   |                                                                  |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [1 Getting started](https://boxi-os.github.io/quartz-multilanguage/en/1-getting-started/) | What Quartz does alone, your first bilingual site, the six parts |
| [2 Detection](https://boxi-os.github.io/quartz-multilanguage/en/2-detection/)             | Folder, suffix, frontmatter — and the base path                  |
| [3 Linking](https://boxi-os.github.io/quartz-multilanguage/en/3-linking/)                 | `translationKey`, aliases, path, and what to do when it fails    |
| [4 The switcher](https://boxi-os.github.io/quartz-multilanguage/en/4-switcher/)           | Shapes, labels, missing translations                             |
| [5 Addresses](https://boxi-os.github.io/quartz-multilanguage/en/5-addresses/)             | `hreflang`, `x-default`, `og:locale`, `html lang`                |
| [6 Redirects](https://boxi-os.github.io/quartz-multilanguage/en/6-redirects/)             | The start page, fallback pages                                   |
| [7 Notices and links](https://boxi-os.github.io/quartz-multilanguage/en/7-notices/)       | The two notices, cross-language links, dates                     |
| [8 Building](https://boxi-os.github.io/quartz-multilanguage/en/8-building/)               | One site for all, or one per language                            |
| [9 Reference](https://boxi-os.github.io/quartz-multilanguage/en/9-reference/)             | Every option, the explorer filter, the limits                    |

A German version of this README is in [README.de.md](README.de.md); the handbook is bilingual too.

## Development

```bash
npm install
npm run check   # typecheck + lint + format + tests
npm run build   # writes dist/ (committed, Quartz installs from it)
```

`dist/` is committed on purpose. After changing anything under `src/`, run `npm run build` and
commit the updated `dist/`.

## How this was built

A hobby project. The plugin came out of work on
[QuartzControl](https://github.com/boxi-os/QuartzControl), but it stands on its own in any Quartz 5
project.

One thing I want to be open about: the code was written mostly with
[Claude Code](https://claude.com/claude-code); the commits say so with a `Co-Authored-By` line. I
am aware that vibe coding is a contested subject, and I do not want to hide anything here.

## How well is the code checked?

`npm run check` runs the typecheck, the linter, the formatter, 58 tests and the build; CI does
the same on every push. That is not a guarantee, but it is something you can run yourself before you
trust the plugin.

## License

MIT
