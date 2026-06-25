import type esbuild from "esbuild";
import { fileURLToPath } from "url";
import { compileScssFileAsync } from "../angular/scss-compiler";
import { err as errNs } from "@simplysm/core-common";

export interface CreateScssPluginOptions {
  loadPaths: string[];
}

export function createScssPlugin(options: CreateScssPluginOptions): esbuild.Plugin {
  // 진입 scss별 직전 성공 컴파일의 의존성 목록.
  // 컴파일 실패 시 sass가 loadedUrls를 제공하지 않으므로, 마지막으로 알려진
  // 의존성을 watchFiles로 재사용해 import 체인 전체가 watch에서 빠지지 않게 한다.
  const lastDependencies = new Map<string, string[]>();

  return {
    name: "sd-scss",
    setup(build) {
      build.onLoad({ filter: /\.scss$/ }, async (args) => {
        try {
          const result = await compileScssFileAsync(args.path, options.loadPaths);
          lastDependencies.set(args.path, result.dependencies);
          return {
            contents: result.css,
            loader: "css" as const,
            watchFiles: result.dependencies,
          };
        } catch (e: unknown) {
          // sass.Exception은 span 프로퍼티로 위치 정보를 제공한다
          const sassSpan = (e as any)?.span;
          const errorFile =
            sassSpan?.url != null ? fileURLToPath(sassSpan.url) : undefined;
          const location: esbuild.PartialMessage["location"] =
            sassSpan != null
              ? {
                  file: errorFile ?? args.path,
                  line: sassSpan.start.line + 1, // sass: 0-based → esbuild: 1-based
                  column: sassSpan.start.column,
                }
              : undefined;

          // 컴파일이 실패하면 loadedUrls를 얻을 수 없어 의존성 목록이 비게 된다.
          // 직전 성공 시의 의존성 + 진입 파일 + 에러 위치 파일을 watch 대상으로 보존해
          // 해당 파일을 수정하면 rebuild가 다시 트리거되도록 한다.
          const watchFiles = [
            ...(lastDependencies.get(args.path) ?? []),
            args.path,
            ...(errorFile != null ? [errorFile] : []),
          ];

          return {
            errors: [
              {
                text: (e as any)?.sassMessage ?? errNs.message(e),
                location,
              },
            ],
            watchFiles: Array.from(new Set(watchFiles)),
          };
        }
      });
    },
  };
}
