import type { MultilanguageOptions } from "./types";
import { detectLanguage } from "./language/detect";
import { resolveOptions } from "./options";

/** The subset of the explorer's `FileTrieNode` this helper needs. */
export interface TrieNodeLike {
  slug?: string;
  slugSegments?: string[];
  isFolder?: boolean;
  children?: TrieNodeLike[];
}

/**
 * Builds a `filterFn` for the explorer plugin that keeps only pages of one language.
 * The explorer accepts functions only from `quartz.ts`, not from YAML:
 *
 * ```ts
 * import { languageExplorerFilter } from "./.quartz/plugins/quartz-multilanguage"
 * Explorer({ filterFn: languageExplorerFilter("de", { languages: ["de", "en"] }) })
 * ```
 *
 * Folder nodes are kept when they contain at least one page of the language, so the
 * language folder itself and folders without pages stay visible only if needed.
 */
export function languageExplorerFilter(
  lang?: string,
  userOpts?: MultilanguageOptions,
): (node: TrieNodeLike) => boolean {
  const opts = resolveOptions(userOpts);
  const wanted = (lang ?? opts.defaultLanguage).trim().toLowerCase();

  const slugOf = (node: TrieNodeLike): string =>
    node.slug ?? (node.slugSegments ? node.slugSegments.join("/") : "");

  const matches = (node: TrieNodeLike): boolean => {
    const slug = slugOf(node);
    if (!slug) return true;
    if (node.isFolder || (node.children && node.children.length > 0)) {
      const kids = node.children ?? [];
      if (kids.length > 0) return kids.some(matches);
      // A folder whose first segment is a language code belongs to that language.
      const first = slug.split("/")[0]?.toLowerCase();
      const isLangFolder = opts.languages.some((l) => l.code === first);
      return !isLangFolder || first === wanted;
    }
    return detectLanguage({ slug }, opts).lang === wanted;
  };

  return matches;
}
