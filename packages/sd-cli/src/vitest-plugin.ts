import type { Plugin } from "vite";
import path from "path";
import ts from "typescript";
import { NgtscProgram, type AngularLibraryHostExtensions } from "./utils/angular-build";
import { compileScssString, compileScssFile } from "./utils/scss-compiler";

export interface AngularVitestPluginOptions {
  /** Angular 패키지의 tsconfig.json 절대 경로 */
  tsconfig: string;
  /** monorepo 워크스페이스 루트 경로. 미지정 시 tsconfig 기준 상위 2단계를 사용한다 */
  cwd?: string;
}

export function angularVitestPlugin(options: AngularVitestPluginOptions): Plugin {
  const compiledFiles = new Map<string, { js: string; map?: string }>();

  return {
    name: "angular-vitest",
    enforce: "pre",

    async buildStart() {
      const configFile = ts.readConfigFile(options.tsconfig, ts.sys.readFile);
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        ts.sys.resolvePath(options.tsconfig + "/.."),
      );

      // src/ 파일 + fixture 파일 (Angular 컴파일이 필요한 파일)
      const sourceFiles = parsedConfig.fileNames.filter(
        (f) => f.includes("/src/") || f.includes(".fixture."),
      );

      const compilerOptions: ts.CompilerOptions = {
        ...parsedConfig.options,
        noEmit: false,
        declaration: false,
        declarationMap: false,
        sourceMap: false,
        inlineSourceMap: true,
        inlineSources: true,
      };

      const host = ts.createCompilerHost(compilerOptions);

      // AngularLibraryHostExtensions duck-typing
      const hostExt = host as ts.CompilerHost & AngularLibraryHostExtensions;
      hostExt.readResource = (fileName: string) => ts.sys.readFile(fileName) ?? "";

      const pkgDir = ts.sys.resolvePath(options.tsconfig + "/..");
      const cwd = options.cwd ?? ts.sys.resolvePath(pkgDir + "/../..");
      const loadPaths = [
        path.join(pkgDir, "scss"),
        path.join(cwd, "node_modules"),
      ];

      hostExt.transformResource = (data, context) => {
        if (context.type !== "style") return Promise.resolve(null);

        if (context.resourceFile != null && context.resourceFile.endsWith(".scss")) {
          const result = compileScssFile(context.resourceFile, loadPaths);
          return Promise.resolve({ content: result.css });
        }

        if (context.resourceFile != null) {
          // .css 등 비-SCSS 파일 -> null 반환 (readResource가 처리)
          return Promise.resolve(null);
        }

        // 인라인 스타일 -- SCSS로 시도, 순수 CSS면 그대로 통과
        const result = compileScssString(data, context.containingFile, loadPaths);
        return Promise.resolve({ content: result.css });
      };

      // writeFile 인터셉트 — 메모리에 수집 (inline sourcemap이므로 .js만 수집)
      let currentSourcePath = "";
      host.writeFile = (fileName: string, data: string) => {
        if (fileName.endsWith(".js")) {
          compiledFiles.set(currentSourcePath, { js: data });
        }
      };

      // NgtscProgram 생성 + AOT 컴파일
      const program = new NgtscProgram(
        sourceFiles,
        compilerOptions,
        hostExt,
      );
      await program.compiler.analyzeAsync();
      const { transformers } = program.compiler.prepareEmit();
      const tsProgram = program.getTsProgram();

      // per-file emit
      for (const filePath of sourceFiles) {
        const sf = tsProgram.getSourceFile(filePath);
        if (sf == null) continue;

        currentSourcePath = normalizePath(filePath);
        tsProgram.emit(sf, host.writeFile, undefined, false, transformers);
      }
    },

    transform(_code: string, id: string) {
      if (!id.endsWith(".ts") || id.includes("node_modules")) {
        return undefined;
      }

      const compiled = compiledFiles.get(normalizePath(id));
      if (compiled == null) {
        return undefined;
      }

      return { code: compiled.js, map: compiled.map };
    },
  };
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}
