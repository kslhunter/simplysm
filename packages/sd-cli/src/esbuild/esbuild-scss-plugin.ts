import type esbuild from "esbuild";
import { fileURLToPath } from "url";
import { compileScssFileAsync } from "../angular/scss-compiler";

export interface CreateScssPluginOptions {
  loadPaths: string[];
}

export function createScssPlugin(options: CreateScssPluginOptions): esbuild.Plugin {
  return {
    name: "sd-scss",
    setup(build) {
      build.onLoad({ filter: /\.scss$/ }, async (args) => {
        try {
          const result = await compileScssFileAsync(args.path, options.loadPaths);
          return {
            contents: result.css,
            loader: "css" as const,
            watchFiles: result.dependencies,
          };
        } catch (e: unknown) {
          // sass.Exception은 span 프로퍼티로 위치 정보를 제공한다
          const sassSpan = (e as any)?.span;
          const location: esbuild.PartialMessage["location"] =
            sassSpan != null
              ? {
                  file:
                    sassSpan.url != null
                      ? fileURLToPath(sassSpan.url)
                      : args.path,
                  line: sassSpan.start.line + 1, // sass: 0-based → esbuild: 1-based
                  column: sassSpan.start.column,
                }
              : undefined;

          return {
            errors: [
              {
                text: (e as any)?.sassMessage ?? (e instanceof Error ? e.message : String(e)),
                location,
              },
            ],
          };
        }
      });
    },
  };
}
