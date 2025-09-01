import esbuild from "esbuild";
import path from "path";
import os from "os";
import { JavaScriptTransformer } from "@angular/build/src/tools/esbuild/javascript-transformer";
import { FsUtils, PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { SdCliPerformanceTimer } from "../../utils/sd-cli-performance-time";
import { SdCliConvertMessageUtils } from "../../utils/sd-cli-convert-message.utils";
import { ISdCliNgPluginResultCache } from "../../types/build-plugin.types";
import { ISdTsCompilerResult } from "../../types/ts-compiler.types";
import { SdTsCompiler } from "../../ts-compiler/sd-ts-compiler";
import { ScopePathSet } from "../commons/scope-path";

export function createSdNgPlugin(conf: {
  pkgPath: TNormPath;
  dev: boolean;
  emitOnly: boolean;
  noEmit: boolean;
  modifiedFileSet: Set<TNormPath>;
  result: ISdCliNgPluginResultCache;
  watchScopePathSet: ScopePathSet;
}): esbuild.Plugin {
  let perf: SdCliPerformanceTimer;
  const logger = SdLogger.get(["simplysm", "sd-cli", "createSdNgPlugin"]);

  const debug = (...msg: any[]) => {
    logger.debug(`[${path.basename(conf.pkgPath)}]`, ...msg);
  };

  return {
    name: "sd-ng-compile",
    setup: (build: esbuild.PluginBuild) => {
      const tsCompiler = new SdTsCompiler({
        pkgPath: conf.pkgPath,
        additionalOptions: { declaration: false },
        isDevMode: conf.dev,
        isForBundle: true,
        isEmitOnly: conf.emitOnly,
        isNoEmit: conf.noEmit,
        watchScopePathSet: conf.watchScopePathSet,
      });

      let tsCompileResult: ISdTsCompilerResult;
      const outputContentsCacheMap = new Map<TNormPath, Uint8Array>();

      //-- js babel transformer
      const javascriptTransformer = new JavaScriptTransformer(
        {
          thirdPartySourcemaps: conf.dev,
          sourcemap: conf.dev,
          jit: false,
          advancedOptimizations: !conf.dev,
        },
        Math.floor((os.cpus().length * 2) / 3),
      );

      let cssStore = new Map<TNormPath, Buffer>();

      //---------------------------

      build.onStart(async () => {
        perf = new SdCliPerformanceTimer("esbuild");

        const res = await perf.run("typescript build", async () => {
          for (const modifiedFile of conf.modifiedFileSet) {
            outputContentsCacheMap.delete(modifiedFile);
          }

          tsCompileResult = await tsCompiler.compileAsync(conf.modifiedFileSet);

          cssStore.clear();

          conf.result.watchFileSet = tsCompileResult.watchFileSet;
          conf.result.affectedFileSet = tsCompileResult.affectedFileSet;

          const tsEsbuildResult = SdCliConvertMessageUtils.convertToEsbuildFromBuildMessages(
            tsCompileResult.messages,
            conf.pkgPath,
          );
          //-- return err/warn
          return {
            errors: [
              ...tsEsbuildResult.errors,
              ...Array.from(tsCompileResult.stylesheetBundlingResultMap.values())
                .flatMap((item) => item.errors)
                .filterExists(),
            ].filterExists(),
            warnings: [
              ...tsEsbuildResult.warnings,
              ...Array.from(tsCompileResult.stylesheetBundlingResultMap.values())
                .flatMap((item) => item.warnings)
                .filterExists(),
            ],
          };
        });

        perf.start("esbuild transform & bundling");
        return res;
      });

      build.onResolve({ filter: /\.css$/ }, (args) => {
        if (args.path.startsWith("sd-css-asset:")) return;
        return {
          path: path.resolve(args.resolveDir, args.path),
          namespace: "sd-css",
        };
      });

      build.onLoad({ filter: /\.css$/, namespace: "sd-css" }, async (args) => {
        const code = /* language=javascript */ `
import href from "sd-css-asset:${PathUtils.posix(args.path)}"
(function __sdEnsureStyle(href) {
  let link = document.querySelector('link[data-sd-style="' + href + '"]');
  if (link) return;
  link = document.createElement('link');
  link.rel = 'stylesheet';
  link.setAttribute('data-sd-style', href);
  link.href = href;
  document.head.appendChild(link);
})(href);`;

        if (FsUtils.exists(args.path)) {
          const css = await FsUtils.readFileBufferAsync(args.path);
          cssStore.set(PathUtils.norm(args.path), css);
        }

        return { contents: code, loader: "js", resolveDir: path.dirname(args.path) };
      });

      build.onResolve({ filter: /^sd-css-asset:/ }, (args) => {
        const real = args.path.replace(/^sd-css-asset:/, "");
        return { path: real, namespace: "sd-css-asset" };
      });

      build.onLoad({ filter: /\.css$/, namespace: "sd-css-asset" }, (args) => {
        const cssContent =
          cssStore.get(PathUtils.norm(args.path)) ??
          cssStore.get(PathUtils.norm(args.path.replace(/[\\\/]src[\\\/]/, "\\dist\\")));
        if (cssContent == null) {
          return { errors: [{ text: `Missing CSS for ${PathUtils.norm(args.path)}` }] };
        }

        return {
          contents: cssContent,
          loader: "file",
          resolveDir: path.dirname(args.path),
        };
      });

      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        const emittedFiles = tsCompileResult.emittedFilesCacheMap.get(PathUtils.norm(args.path));

        try {
          const css = emittedFiles?.single((item) => Boolean(item.outAbsPath?.endsWith(".css")));
          if (css) {
            cssStore.set(PathUtils.norm(css.outAbsPath!), Buffer.from(css.text));
          }
        } catch (err) {
          return {
            errors: [
              {
                text:
                  (err?.message ?? String(err)) +
                  "\n" +
                  emittedFiles?.map((item) => "- " + item.outAbsPath).join("\n"),
              },
            ],
          };
        }

        const output = outputContentsCacheMap.get(PathUtils.norm(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const contents = emittedFiles?.last()?.text ?? "";

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        const newContents = await perf.run("esbuild transform:js:*.ts", async () => {
          return await javascriptTransformer.transformData(args.path, contents, true, sideEffects);
        });

        outputContentsCacheMap.set(PathUtils.norm(args.path), newContents);

        return { contents: newContents, loader: "js" };
      });

      build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
        conf.result.watchFileSet!.add(PathUtils.norm(args.path));

        const output = outputContentsCacheMap.get(PathUtils.norm(args.path));
        if (output != null) {
          return { contents: output, loader: "js" };
        }

        const { sideEffects } = await build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: build.initialOptions.absWorkingDir ?? "",
        });

        try {
          const newContents = await perf.run("esbuild transform:js:*.js", async () => {
            /*return /\.min\.[cm]?js$/.test(args.path)
              ? await FsUtils.readFileBufferAsync(args.path)
              : await javascriptTransformer.transformFile(args.path, false, sideEffects);*/

            const contents = await FsUtils.readFileBufferAsync(args.path);

            return args.path.includes("node_modules") && !args.path.includes("angular")
              ? contents
              : await javascriptTransformer.transformData(
                  args.path,
                  contents.toString(),
                  false,
                  sideEffects,
                );
          });

          outputContentsCacheMap.set(PathUtils.norm(args.path), newContents);

          return {
            contents: newContents,
            loader: "js",
          };
        } catch (err) {
          return { errors: [{ text: err?.message ?? String(err) }] };
          /*return {
            contents: `console.error(${JSON.stringify(err.message)});`,
            loader: "js",
          };*/
        }
      });

      const otherLoaderFilter = new RegExp(
        "(" +
          Object.keys(build.initialOptions.loader ?? {})
            .map((ext) => "\\" + ext)
            .join("|") +
          ")$",
      );
      build.onLoad({ filter: otherLoaderFilter }, (args) => {
        conf.result.watchFileSet!.add(PathUtils.norm(args.path));
        return null;
      });

      build.onEnd((result) => {
        perf.end("esbuild transform & bundling");
        debug(perf.toString());

        for (const stylesheetBundlingResult of tsCompileResult.stylesheetBundlingResultMap.values()) {
          if ("outputFiles" in stylesheetBundlingResult) {
            result.outputFiles ??= [];
            result.outputFiles.push(...stylesheetBundlingResult.outputFiles);

            if (result.metafile) {
              result.metafile.inputs = {
                ...result.metafile.inputs,
                ...stylesheetBundlingResult.metafile.inputs,
              };
              result.metafile.outputs = {
                ...result.metafile.outputs,
                ...stylesheetBundlingResult.metafile.outputs,
              };
            }
          }
        }

        conf.result.outputFiles = result.outputFiles;
        conf.result.metafile = result.metafile;

        conf.modifiedFileSet.clear();
      });
    },
  };
}
