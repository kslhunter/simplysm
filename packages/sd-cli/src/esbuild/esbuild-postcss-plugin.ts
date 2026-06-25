import type esbuild from "esbuild";
import type { AcceptedPlugin } from "postcss";
import postcss from "postcss";
import { fsx } from "@simplysm/core-node";
import path from "path";
import { createRequire } from "module";
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { err as errNs } from "@simplysm/core-common";

export interface CreatePostcssPluginOptions {
  /** 이미 로딩된 PostCSS 플러그인 인스턴스 배열 */
  plugins: AcceptedPlugin[];
}

/**
 * PostCSS 플러그인 설정 튜플([name, options])을 패키지 기준으로 로딩해 인스턴스 배열로 변환한다.
 */
export function loadPostcssPlugins(
  pkgDir: string,
  postcssPlugins: [string, (object | string)?][] | undefined,
): AcceptedPlugin[] | undefined {
  if (postcssPlugins == null || postcssPlugins.length === 0) return undefined;
  const req = createRequire(path.join(pkgDir, "package.json"));
  return postcssPlugins.map(([pluginName, pluginOpts]) => {
    const pluginFn = req(pluginName);
    const fn = pluginFn.default ?? pluginFn;
    return pluginOpts != null ? fn(pluginOpts) : fn;
  });
}

export function createPostcssPlugin(options: CreatePostcssPluginOptions): esbuild.Plugin {
  return {
    name: "sd-postcss",
    setup(build) {
      build.onEnd(async (result) => {
        if (options.plugins.length === 0) return;
        if (result.metafile == null) return;

        const processor = postcss(options.plugins);
        const outputFiles = Object.keys(result.metafile.outputs);

        // .css 파일 처리
        for (const file of outputFiles) {
          if (!file.endsWith(".css")) continue;

          try {
            const css = await fsx.read(file);
            const processed = await processor.process(css, { from: file });
            await fsx.write(file, processed.css);
          } catch (e: unknown) {
            result.errors.push({
              id: "",
              pluginName: "sd-postcss",
              text: `PostCSS error in ${file}: ${errNs.message(e)}`,
              location: null,
              notes: [],
              detail: undefined,
            });
          }
        }

        // .js 파일 처리 — ɵɵdefineComponent 내 styles 배열의 문자열에 PostCSS 적용
        for (const file of outputFiles) {
          if (!file.endsWith(".js")) continue;

          try {
            const code = await fsx.read(file);
            if (!code.includes("styles")) continue;

            const ast = acorn.parse(code, {
              ecmaVersion: "latest",
              sourceType: "module",
            });

            // styles 배열 내 문자열 리터럴의 위치와 PostCSS 결과를 수집
            const replacements: Array<{ start: number; end: number; text: string }> = [];

            walk.ancestor(ast, {
              Property(node: any, _state: any, ancestors: any[]) {
                // key가 "styles"이고 value가 ArrayExpression인 Property만 대상
                if (node.key.type !== "Identifier" || node.key.name !== "styles") return;
                if (node.value.type !== "ArrayExpression") return;

                // ancestors에서 ɵɵdefineComponent 호출을 확인
                const inDefineComponent = ancestors.some(
                  (a: any) =>
                    a.type === "CallExpression" &&
                    a.callee?.type === "MemberExpression" &&
                    a.callee.property?.type === "Identifier" &&
                    a.callee.property.name === "\u0275\u0275defineComponent",
                );
                if (!inDefineComponent) return;

                for (const element of node.value.elements) {
                  if (element == null) continue;
                  if (element.type !== "Literal" || typeof element.value !== "string") continue;

                  replacements.push({
                    start: element.start,
                    end: element.end,
                    text: element.value,
                  });
                }
              },
            });

            if (replacements.length === 0) continue;

            // PostCSS 적용 — 정방향 청크 배열 + join
            const sorted = replacements.sort((a, b) => a.start - b.start);
            const chunks: string[] = [];
            let cursor = 0;

            for (const rep of sorted) {
              chunks.push(code.slice(cursor, rep.start));
              const processed = await processor.process(rep.text, { from: file });
              chunks.push(JSON.stringify(processed.css));
              cursor = rep.end;
            }
            chunks.push(code.slice(cursor));
            const modified = chunks.join("");

            await fsx.write(file, modified);
          } catch (e: unknown) {
            result.errors.push({
              id: "",
              pluginName: "sd-postcss",
              text: `PostCSS error in ${file}: ${errNs.message(e)}`,
              location: null,
              notes: [],
              detail: undefined,
            });
          }
        }
      });
    },
  };
}
