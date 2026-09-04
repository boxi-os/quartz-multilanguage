// Quartz resolves the factory for each manifest category by probing the exported
// functions with no arguments (`findFactory` in its config loader). Keep the exports
// limited to factories and helpers that tolerate being called without arguments.
export { MultilanguageTransformer } from "./transformer";
export { MultilanguageFilter } from "./filter";
export { MultilanguageEmitter } from "./emitter";
export { default as LanguageSwitcher } from "./components/LanguageSwitcher";
export { languageExplorerFilter } from "./explorer";

export type {
  DetectionStrategy,
  FrontmatterKeys,
  LanguageConfig,
  LinkingStrategy,
  MultilanguageFileData,
  MultilanguageOptions,
  SeoOptions,
  SwitcherOptions,
  TranslationMap,
} from "./types";
export type { TrieNodeLike } from "./explorer";
