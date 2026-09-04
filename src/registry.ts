import type { ResolvedOptions } from "./types";
import { buildTranslationIndex, type PageRecord, type TranslationIndex } from "./language/link";
import { toPageRecord } from "./records";

/**
 * Pages seen by the filter stage of the current build.
 *
 * Markdown transformers may run in worker threads, so cross-file knowledge cannot be
 * collected there. Filters run in the main process over every parsed file and before any
 * page is rendered, which makes them the earliest place to learn about all pages. The
 * `additionalHead` hook (hreflang, og:locale) reads from here at render time.
 */
const records = new Map<string, PageRecord>();
let index: TranslationIndex | undefined;
let indexOpts: ResolvedOptions | undefined;
let buildId: string | undefined;

export function registerFile(
  currentBuildId: string,
  data: Record<string, unknown>,
  opts: ResolvedOptions,
): void {
  if (buildId !== currentBuildId) {
    records.clear();
    buildId = currentBuildId;
  }
  const record = toPageRecord(data, opts);
  if (record) records.set(record.slug, record);
  index = undefined;
}

export function registryIndex(
  opts: ResolvedOptions,
  allSlugs?: readonly string[],
): TranslationIndex {
  if (index && indexOpts === opts) return index;
  let list = [...records.values()];
  if (allSlugs) {
    // Serve mode keeps the registry across rebuilds; drop pages that no longer exist.
    const live = new Set(allSlugs);
    list = list.filter((r) => live.has(r.slug));
  }
  index = buildTranslationIndex(list, opts);
  indexOpts = opts;
  return index;
}

export function registrySize(): number {
  return records.size;
}

/** Test helper. */
export function resetRegistry(): void {
  records.clear();
  index = undefined;
  buildId = undefined;
}
