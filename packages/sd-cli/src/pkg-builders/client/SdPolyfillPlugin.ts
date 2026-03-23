import { Plugin, PluginBuild } from "esbuild";
import compat from "core-js-compat";
import { createRequire } from "module";
import { PathUtils } from "@simplysm/sd-core-node";

const _require = createRequire(import.meta.url);

const SD_POLYFILL_NS = "sd-polyfill";
const SD_POLYFILL_FILTER = /^virtual:sd-polyfills$/;

export function SdPolyfillPlugin(browserslistQuery: string[]): Plugin {
  return {
    name: "sd-polyfill-plugin",
    setup(build: PluginBuild) {
      build.onResolve({ filter: SD_POLYFILL_FILTER }, () => ({
        path: "sd-polyfills",
        namespace: SD_POLYFILL_NS,
      }));

      build.onLoad({ filter: /.*/, namespace: SD_POLYFILL_NS }, () => {
        const { list } = compat({
          targets: browserslistQuery,
        });

        const lines: string[] = [];

        // core-js 모듈 (절대 경로로 resolve하여 소비 프로젝트의 node_modules 의존 제거)
        for (const mod of list) {
          try {
            const absPath = _require.resolve(`core-js/modules/${mod}.js`);
            lines.push(`import "${PathUtils.posix(absPath)}";`);
          } catch {
            // 모듈이 존재하지 않으면 skip (WeakRef 등 polyfill 불가 항목)
          }
        }

        // AbortController (Chrome 66+)
        try {
          const absPath = _require.resolve(
            "abortcontroller-polyfill/dist/abortcontroller-polyfill-only",
          );
          lines.push(`import "${PathUtils.posix(absPath)}";`);
        } catch {
          // skip
        }

        // ResizeObserver (Chrome 64+)
        try {
          const absPath = _require.resolve("resize-observer-polyfill");
          lines.push(`import RO from "${PathUtils.posix(absPath)}";`);
          lines.push(
            `if (typeof window !== "undefined" && !("ResizeObserver" in window)) { window.ResizeObserver = RO; }`,
          );
        } catch {
          // skip
        }

        return { contents: lines.join("\n"), loader: "js" };
      });
    },
  };
}
