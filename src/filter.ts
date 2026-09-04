import type { QuartzFilterPlugin } from "@quartz-community/types";
import type { MultilanguageOptions } from "./types";
import { resolveOptions } from "./options";
import { registerFile } from "./registry";
import { toPageRecord } from "./records";

/**
 * Two jobs: record every page for the render-time `hreflang` lookup (see `registry.ts`),
 * and drop pages whose language is not in `publishLanguages`.
 */
export const MultilanguageFilter: QuartzFilterPlugin<MultilanguageOptions> = (userOpts) => {
  const opts = resolveOptions(userOpts);
  const publish = new Set(opts.publishLanguages);
  return {
    name: "Multilanguage",
    shouldPublish(ctx, [, file]) {
      const data = file.data as Record<string, unknown>;
      if (publish.size > 0) {
        const record = toPageRecord(data, opts);
        if (record !== undefined && !publish.has(record.lang)) return false;
      }
      // Only published pages enter the registry, so hreflang never points at dropped pages.
      registerFile(ctx.buildId, data, opts);
      return true;
    },
  };
};
