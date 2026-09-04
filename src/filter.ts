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
      registerFile(ctx.buildId, data, opts);
      if (publish.size === 0) return true;
      const record = toPageRecord(data, opts);
      return record === undefined || publish.has(record.lang);
    },
  };
};
