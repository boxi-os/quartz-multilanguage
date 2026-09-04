# quartz-multilanguage

Provider-agnostic instruction file for AI coding assistants working on this repository.

## Project Overview

`quartz-multilanguage` is a Quartz v5 plugin for multilingual content: language detection,
translation linking, a language switcher component, hreflang/og:locale, redirects and notices. It
implements four plugin categories (transformer, filter, emitter, component) behind one YAML entry.
See `ARCHITECTURE.md` for the lifecycle and file map, `README.md` for user-facing options.

## Files to Modify

- `src/options.ts`: option defaults and validation (single source of truth for defaults).
- `src/language/*.ts`: pure detection and linking logic — add tests in `test/` for every change.
- `src/transformer.tsx`, `src/filter.ts`, `src/emitter.ts`: Quartz hooks.
- `src/components/LanguageSwitcher.tsx` + `styles/`: the component.
- `src/scripts/multilanguage.inline.ts`: browser script.
- `src/i18n/locales/*.ts`: plugin UI strings; add a locale by copying `en-US.ts` and registering
  it in `src/i18n/index.ts`.
- `src/types.ts`: `MultilanguageOptions` (single definition, documented per field).
- `package.json` → `quartz` manifest: keep `defaultOptions` in sync with `src/options.ts`; the
  manifest must declare exactly one component.
- `test/`: vitest tests.

## Leave Alone

- `dist/`: build output. **Tracked and committed** (Quartz installs from it). Rebuild with
  `npm run build` after any change under `src/` and commit the result.
- `.github/`: CI configuration.
- `tsup.config.ts`: only touch to add native-dependency exclusions.

## Workflow

1. Change code under `src/` and add/adjust tests in `test/`.
2. `npm run check` (typecheck, lint, prettier, vitest) must pass.
3. `npm run build`, commit `dist/` together with the source change. CI rebuilds `dist/` and fails
   if the result differs from the committed one, and checks every emitted `.js` file for unbundled
   external imports.
4. Update `README.md` / `README.de.md` (options table) and `CHANGELOG.md`.

## Constraints

- Quartz calls every factory with the raw YAML `options`; manifest `defaultOptions` are not merged
  in. Keep defaults in `src/options.ts`.
- Quartz finds the factory per category by calling every exported function of `src/index.ts`
  with no arguments. Exports must tolerate that; never add a `default` export.
- Markdown transformers may run in worker threads: never rely on module state across files in
  `markdownPlugins`/`htmlPlugins`. Cross-file knowledge comes from `ctx.allSlugs`, the filter-stage
  registry (`src/registry.ts`) or `allFiles` in components.
- Import `@quartz-community/utils` via subpaths (`/path`, `/lang`, `/escape`).
- `preact` and `vfile` stay peerDependencies and external; everything else must be bundled, so
  runtime packages go into `devDependencies`. Never widen `noExternal` in `tsup.config.ts`.
- The inline script must stay a plain script (no `export`, no `declare global`), and every
  `addEventListener` needs a matching `window.addCleanup()` for SPA navigation.
- All code, comments, docs and commit messages in English; `README.de.md` mirrors `README.md`.
