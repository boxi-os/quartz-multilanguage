# Architecture Reference

Machine-readable architecture overview for `quartz-multilanguage`, a Quartz v5 plugin with a
transformer, a filter, an emitter and one component.

## Plugin Lifecycle

1. **Loading**: Quartz reads the `quartz` manifest in `package.json`
   (`category: ["transformer","filter","emitter","component"]`), imports `dist/index.js` and
   probes its exported functions per category (`findFactory`): `MultilanguageTransformer`,
   `MultilanguageFilter`, `MultilanguageEmitter`. The component `LanguageSwitcher` is loaded from
   `dist/components/index.js` and registered under its export name and the plugin name.
2. **Initialization**: every factory receives the same raw YAML `options` and runs
   `resolveOptions()` (`src/options.ts`).
3. **Parse** (possibly in worker threads): `markdownPlugins` detects the language of each file from
   its slug and frontmatter (`src/language/detect.ts`), stores `file.data.multilanguage` and sets
   `frontmatter.lang`. `htmlPlugins` (optional) rewrites cross-language links using `data-slug` and
   `ctx.allSlugs`, and prepends the hidden notice callout.
4. **Filter** (main process): `shouldPublish` records every page in `src/registry.ts` and applies
   `publishLanguages`.
5. **Render**: `Head` calls the transformer's `additionalHead` function per page with `fileData`;
   it builds the translation group from the registry (fallback: slug convention) and returns
   hreflang / og:locale tags. `LanguageSwitcher` builds the same index from `allFiles`
   (`indexFromFiles`, cached by array identity) and renders links. The transformer's
   `externalResources` injects the browser script with its configuration on every page.
6. **Emit** (after pages are rendered): the emitter writes `static/multilanguage.json`, the root
   `index.html` redirect (if no root index page exists) and fallback redirect pages.
7. **Browser**: `multilanguage.inline.ts` reads the remembered / browser language, stores explicit
   choices, shows the notice variant for the visitor's language (translations from the switcher's
   `data-translations` or `static/multilanguage.json`), closes dropdowns and localizes dates.

## Data Model

- `MultilanguageFileData` (`file.data.multilanguage`): `lang`, `baseSlug`, `source`
  (`folder` | `suffix` | `frontmatter` | `default`), `translationKey?`, `translations?`.
- `PageRecord` (`src/language/link.ts`): the subset of file data needed for linking.
- `TranslationIndex`: `bySlug` (slug → `{ lang: slug }` group including itself), `titles`, `langs`.
- `static/multilanguage.json` (`SiteData`): languages with homes, `pages[slug] = { lang, translations? }`.

## Build System

`tsup` bundles three entry points (`index`, `types`, `components/index`) to `dist/`. Left external
are only the singletons that must resolve to the host's instance: `preact`, `vfile` and
`@jackyzha0/quartz`. Everything else is inlined — `@quartz-community/utils`, `unist-util-visit`,
`github-slugger` — because Quartz never installs a pre-built plugin's `dependencies`, only its
`peerDependencies`; runtime packages therefore live in `devDependencies`. `.scss` imports compile to
CSS strings, `.inline.ts` imports bundle to browser JS strings. `vitest.config.ts` provides the same
string loaders for tests. `dist/` is committed.

## Directory Structure

- `src/`
  - `index.ts`: main entry (factories, component, `languageExplorerFilter`, types).
  - `types.ts`: `MultilanguageOptions`, resolved types, `MultilanguageFileData`, vfile augmentation.
  - `options.ts`: defaults, `resolveOptions()`, `flagEmoji()`, `findLanguage()`.
  - `language/detect.ts`, `language/link.ts`: pure detection and linking.
  - `records.ts`: vfile data → `PageRecord`, `indexFromFiles()`, `homeSlug()`.
  - `registry.ts`: filter-stage page registry for render-time lookups.
  - `transformer.tsx`, `filter.ts`, `emitter.ts`: Quartz hooks.
  - `components/LanguageSwitcher.tsx`, `components/styles/language-switcher.scss`,
    `components/index.ts`.
  - `scripts/multilanguage.inline.ts`: browser script. `styles/notice.scss`: notice fallback CSS.
  - `explorer.ts`: `languageExplorerFilter()` for `quartz.ts`.
  - `i18n/`: plugin UI strings.
  - `util/warn.ts` (`warnOnce`), `util/lang.ts` (`classNames`), `build/validate-manifest.ts`.
- `test/`: vitest tests (`detect`, `link`, `options`, `transformer` incl. filter, `emitter`,
  `switcher` incl. explorer helper).
- `dist/`: build output (committed).
- `package.json`: manifest (`quartz` field) and dependencies. `tsup.config.ts`: build configuration.
