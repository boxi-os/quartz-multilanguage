# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-04

### Added

- Language detection per page via language folders, file suffixes or a frontmatter field, in a
  configurable priority order (`detection`), with `defaultLanguage` as fallback.
- Translation linking via `translationKey` / `translations` frontmatter, Obsidian aliases
  (compatible with the Obsidian plugin "Multilingual") and identical base paths (`linking`).
- `LanguageSwitcher` component with `links`, `dropdown` and `flags` styles, `code` / `label` /
  `native` / `translatedTitle` labels, and `hide` / `home` / `disabled` handling of missing
  translations.
- `<html lang>` from the detected language, `hreflang` + `x-default` links and `og:locale` /
  `og:locale:alternate` per page (`seo`).
- Root redirect (`rootRedirect: default | browser`) with remembered choice (`rememberChoice`).
- Client-side notices for missing or available translations in the visitor's language
  (`missingTranslationNotice`, `availableTranslationNotice`).
- Fallback redirect pages for missing translations (`fallbackPages: redirect`).
- Same-language link rewriting (`rewriteCrossLanguageLinks`).
- Client-side date localization (`localizeDates`).
- `publishLanguages` filter with `QUARTZ_LANGS` override for one build per language.
- `languageExplorerFilter` helper for the explorer's `filterFn` in `quartz.ts`.
- `static/multilanguage.json` with languages, homes and translation groups.
- Plugin UI strings in `en-US`, `de-DE`, `fr-FR`, `es-ES`.
