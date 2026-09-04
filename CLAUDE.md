# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`quartz-multilanguage` is a [Quartz](https://quartz.jzhao.xyz) v5 community plugin for multilingual
content. It combines a **transformer** (language detection, `<html lang>`, hreflang/og:locale,
link rewriting, notice injection), a **filter** (page registry, `publishLanguages`), an
**emitter** (`static/multilanguage.json`, root redirect, fallback redirects) and one
**component** (`LanguageSwitcher`). The scaffold follows the sibling project `quartz-layout-box`
(same tooling, `dist/` committed, installed via `github:`).

`AGENTS.md` (workflow and constraints) and `ARCHITECTURE.md` (lifecycle, file map) are the detailed
references; `README.md` documents all options for users.

## Commands

```bash
npm install          # install deps
npm run build        # tsup build -> dist/ (must be committed after changes to src/)
npm run dev          # tsup --watch
npm run typecheck    # tsc --noEmit
npm run lint         # eslint . --max-warnings=0
npm run format       # prettier . --check (use `prettier . --write` to fix)
npm test             # vitest run
npm run check        # typecheck + lint + format + test (run before submitting)
```

Run a single test file: `npx vitest run test/link.test.ts`
Run tests matching a name: `npx vitest run -t "aliases"`

## Architecture

- `src/options.ts` — `resolveOptions()` merges the raw YAML options with the code defaults and
  validates enums (warnings via `warnOnce`). Every factory calls it; defaults live **only** here.
- `src/language/detect.ts` — pure `detectLanguage(slug, frontmatter)` → `{ lang, source, baseSlug }`
  and `languageSlug()` (inverse for folder/suffix). `src/language/link.ts` — pure
  `buildTranslationIndex(records)` (union-find with per-language conflict guard).
- `src/records.ts` — `toPageRecord(fileData)` bridges vfile data to the pure functions;
  `indexFromFiles(allFiles)` caches by array identity (Quartz reuses `allFiles` per build).
- `src/registry.ts` — pages seen by the **filter** stage of the current build. Markdown
  transformers may run in worker threads, so cross-file knowledge is collected in the filter (main
  process, runs before any page renders) and read by the render-time `additionalHead` hook.
- `src/transformer.tsx` — `markdownPlugins` (writes `file.data.multilanguage`, fills
  `frontmatter.lang`), `htmlPlugins` (link rewriting via `data-slug`, notice callout),
  `externalResources` (client script + config, notice CSS, `additionalHead` → hreflang/og:locale).
- `src/filter.ts`, `src/emitter.ts`, `src/components/LanguageSwitcher.tsx`, `src/explorer.ts`.
- `src/scripts/multilanguage.inline.ts` — browser script (preference detection, remember choice,
  notices, dropdown close, date localization). Injected by the transformer, not the component, so
  it runs even when the switcher is not placed. Must stay a script (no `export`, no
  `declare global`): the loader strips exports.
- `src/i18n/` — the plugin's own UI strings (`en-US`, `de-DE`, `fr-FR`, `es-ES`).

### How Quartz wires the plugin (verified against Quartz v5 `config-loader.ts`)

- `category: ["transformer","filter","emitter","component"]`. For each processing category Quartz
  calls `findFactory()`: no `default` export, so it **probes every exported function with no
  arguments** and keeps the one whose instance has the category's hook (`markdownPlugins` /
  `shouldPublish` / `emit`). Keep `src/index.ts` exports limited to factories and helpers that
  tolerate being called without arguments; never add a `default` export (it would be used for all
  categories).
- The component is registered from `./components` under `LanguageSwitcher` and the plugin name.
  The YAML `layout` block resolves by **plugin name only**, so the plugin must expose exactly one
  component.
- All factories receive the same raw YAML `options`; manifest `defaultOptions` are **not** merged.
- Emit order: `ComponentResources` → `PageTypeDispatcher` (renders pages) → other emitters. Our
  emitter therefore runs **after** pages are rendered; nothing rendered may depend on it.

### Build system (`tsup.config.ts`)

- Entry points `index`, `types`, `components/index`; everything bundled except `preact`,
  `@jackyzha0/quartz`, `vfile` (singleton externals). `.scss` → CSS string, `.inline.ts` → bundled
  browser JS string. `vitest.config.ts` mirrors both loaders for tests.
- `dist/` is committed; Quartz treats the plugin as pre-built and only symlinks the peers, so every
  runtime dependency (`@quartz-community/*`, `unist-util-visit`, `github-slugger`) must stay in
  `devDependencies` to be bundled. CI verifies this (`verify-dist-bundling`).

## Claude-Skills in diesem Projekt

Skills werden projektlokal unter `.claude/skills/` bereitgestellt, nie global. Skills, die nicht
projektspezifisch sind, liegen im gemeinsamen Store `~/.agents/skills/` und werden hierher verlinkt;
die Symlinks sind in `.gitignore` ausgenommen, weil sie absolute Pfade enthalten:

    ln -s ~/.agents/skills/projekt-dokumentieren .claude/skills/projekt-dokumentieren

Verfügbare Skills im Store: `ls ~/.agents/skills/`
