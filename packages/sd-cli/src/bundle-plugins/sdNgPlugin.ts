import esbuild from "esbuild";
import {FsUtil} from "@simplysm/sd-core-node";
import ts from "typescript";
import path from "path";
import {convertTypeScriptDiagnostic} from "@angular-devkit/build-angular/src/tools/esbuild/angular/diagnostics";
import {AngularCompilerHost} from "@angular-devkit/build-angular/src/tools/esbuild/angular/angular-host";
import {
  ComponentStylesheetBundler
} from "@angular-devkit/build-angular/src/tools/esbuild/angular/component-stylesheets";
import {transformSupportedBrowsersToTargets} from "@angular-devkit/build-angular/src/tools/esbuild/utils";
import browserslist from "browserslist";
import {StringUtil} from "@simplysm/sd-core-common";
import {NgtscProgram, OptimizeFor} from "@angular/compiler-cli";
import {createHash} from "crypto";
import {JavaScriptTransformer} from "@angular-devkit/build-angular/src/tools/esbuild/javascript-transformer";
import os from "os";

export function sdNgPlugin(conf: {
  pkgPath: string;
  dev: boolean;
  modifiedFileSet: Set<string>;
  result: INgResultCache;
}): esbuild.Plugin {
  const tsConfigPath = path.resolve(conf.pkgPath, "tsconfig.json");
  const tsConfig = FsUtil.readJson(tsConfigPath);
  const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, conf.pkgPath, {
    ...tsConfig.angularCompilerOptions,
    declaration: false
  });

  const sourceFileCache = new Map<string, ts.SourceFile>();
  const referencingMap = new Map<string, Set<string>>();

  let ngProgram: NgtscProgram | undefined;
  let builder: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;

  let resultCache: IResultCache = {
    watchFileSet: new Set<string>(),
    affectedFileSet: new Set<string>(),
    additionalResultMap: new Map<string, IAdditionalResult>()
  };
  const tscPrepareMap = new Map<string, string>();
  const outputCacheMap = new Map<string, Uint8Array>();

  let stylesheetBundler: ComponentStylesheetBundler | undefined;

  function createCompilerHost() {
    const compilerHost: AngularCompilerHost = ts.createIncrementalCompilerHost(parsedTsConfig.options);
    compilerHost.readResource = (fileName: string) => {
      return compilerHost.readFile(fileName) ?? "";
    };

    compilerHost.transformResource = async (data: string, context: {
      type: string,
      containingFile: string,
      resourceFile: any
    }) => {
      if (context.type !== "style") {
        return null;
      }

      const stylesheetResult = context.resourceFile != null
        ? await stylesheetBundler!.bundleFile(context.resourceFile)
        : await stylesheetBundler!.bundleInline(
          data,
          context.containingFile,
          "scss",
        );

      resultCache.watchFileSet.add(path.normalize(context.containingFile));

      if (stylesheetResult.referencedFiles) {
        for (const referencedFile of stylesheetResult.referencedFiles) {
          const referencingMapValSet = referencingMap.getOrCreate(path.normalize(referencedFile), new Set<string>());
          referencingMapValSet.add(path.normalize(context.containingFile));
        }

        resultCache.watchFileSet.adds(...Array.from(stylesheetResult.referencedFiles.values()).map(item => path.normalize(item)));
      }

      resultCache.additionalResultMap.set(path.normalize(context.resourceFile ?? context.containingFile), {
        outputFiles: stylesheetResult.resourceFiles,
        metafile: stylesheetResult.metafile,
        errors: stylesheetResult.errors,
        warnings: stylesheetResult.warnings
      });

      return StringUtil.isNullOrEmpty(stylesheetResult.contents) ? null : {content: stylesheetResult.contents};
    };

    compilerHost.getModifiedResourceFiles = () => {
      return conf.modifiedFileSet;
    };

    const baseGetSourceFile = compilerHost.getSourceFile;
    compilerHost.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile, ...args) => {
      if (!shouldCreateNewSourceFile && sourceFileCache.has(path.normalize(fileName))) {
        return sourceFileCache.get(path.normalize(fileName));
      }

      const file = baseGetSourceFile.call(
        compilerHost,
        fileName,
        languageVersionOrOptions,
        onError,
        true,
        ...args,
      );

      if (file) {
        sourceFileCache.set(path.normalize(fileName), file);
      }

      return file;
    };

    return compilerHost;
  }

  function findAffectedFileSet() {
    const affectedFileSet = new Set<string>();

    while (true) {
      const result = builder!.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
        if (ngProgram?.compiler.ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith('.ngtypecheck.ts')) {
          const originalFilename = sourceFile.fileName.slice(0, -15) + '.ts';
          const originalSourceFile = sourceFileCache.get(originalFilename);
          if (originalSourceFile) {
            affectedFileSet.add(path.normalize(originalSourceFile.fileName));
          }

          return true;
        }

        return false;
      });

      if (!result) {
        break;
      }

      affectedFileSet.add(path.normalize((result.affected as ts.SourceFile).fileName));
    }

    return affectedFileSet;
  }

  return {
    name: "sd-ng",
    setup: (build: esbuild.PluginBuild) => {
      //-- stylesheetBundler
      const browserTarget = transformSupportedBrowsersToTargets(browserslist("defaults and fully supports es6-module"));
      stylesheetBundler = new ComponentStylesheetBundler(
        {
          workspaceRoot: conf.pkgPath,
          optimization: !conf.dev,
          sourcemap: conf.dev ? 'inline' : false,
          outputNames: {bundles: '[name]', media: 'media/[name]'},
          includePaths: [],
          externalDependencies: [],
          target: browserTarget,
          preserveSymlinks: false,
          tailwindConfiguration: undefined
        },
        conf.dev
      );

      //-- compilerHost
      const compilerHost = createCompilerHost();

      //-- js babel transformer
      const javascriptTransformer = new JavaScriptTransformer({
        thirdPartySourcemaps: conf.dev,
        sourcemap: conf.dev,
        jit: false,
        advancedOptimizations: true
      }, os.cpus().length);

      //-- vars

      //---------------------------

      build.onStart(async () => {
        //-- modified
        stylesheetBundler!.invalidate(conf.modifiedFileSet);
        for (const modifiedFile of conf.modifiedFileSet) {
          sourceFileCache.delete(modifiedFile);
          outputCacheMap.delete(modifiedFile);

          if (referencingMap.has(modifiedFile)) {
            for (const referencingFile of referencingMap.get(modifiedFile)!) {
              sourceFileCache.delete(referencingFile);
              outputCacheMap.delete(modifiedFile);
            }
          }
        }
        referencingMap.clear();

        //-- init resultCache

        resultCache = {
          watchFileSet: new Set<string>(),
          affectedFileSet: new Set<string>(),
          additionalResultMap: new Map<string, IAdditionalResult>()
        };

        //-- createBuilder

        ngProgram = new NgtscProgram(
          parsedTsConfig.fileNames,
          parsedTsConfig.options,
          compilerHost,
          ngProgram
        );
        const ngCompiler = ngProgram.compiler;
        const program = ngProgram.getTsProgram();

        const baseGetSourceFiles = program.getSourceFiles;
        program.getSourceFiles = function (...parameters) {
          const files: readonly (ts.SourceFile & { version?: string })[] = baseGetSourceFiles(...parameters);

          for (const file of files) {
            if (file.version === undefined) {
              file.version = createHash("sha256").update(file.text).digest("hex");
            }
          }

          return files;
        };

        builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
          program,
          compilerHost,
          builder
        );

        await ngCompiler.analyzeAsync();

        //-- affectedFilePathSet

        resultCache.affectedFileSet.adds(...findAffectedFileSet());

        // Deps -> refMap
        builder.getSourceFiles().filter(sf => !ngCompiler.ignoreForEmit.has(sf))
          .forEach(sf => {
            resultCache.watchFileSet.add(path.normalize(sf.fileName));

            const deps = ngCompiler.getResourceDependencies(sf);
            for (const dep of deps) {
              const ref = referencingMap.getOrCreate(dep, new Set<string>());
              ref.add(dep);

              resultCache.watchFileSet.add(path.normalize(dep));
            }
          });

        // refMap, modFile -> affectedFileSet
        for (const modifiedFile of conf.modifiedFileSet) {
          resultCache.affectedFileSet.adds(...referencingMap.get(modifiedFile) ?? []);
        }

        //-- diagnostics / build

        const diagnostics: ts.Diagnostic[] = [];

        diagnostics.push(
          ...builder.getConfigFileParsingDiagnostics(),
          ...ngCompiler.getOptionDiagnostics(),
          ...builder.getOptionsDiagnostics(),
          ...builder.getGlobalDiagnostics()
        );

        for (const affectedFile of resultCache.affectedFileSet) {
          const affectedSourceFile = sourceFileCache.get(path.normalize(affectedFile));
          if (!affectedSourceFile || ngCompiler.ignoreForDiagnostics.has(affectedSourceFile)) {
            continue;
          }

          diagnostics.push(
            ...builder.getSyntacticDiagnostics(affectedSourceFile),
            ...builder.getSemanticDiagnostics(affectedSourceFile)
          );

          if (affectedSourceFile.isDeclarationFile) {
            continue;
          }

          diagnostics.push(
            ...ngCompiler.getDiagnosticsForFile(affectedSourceFile, OptimizeFor.WholeProgram),
          );
        }

        //-- prepare emit cache
        while (true) {
          const affectedFileResult = builder.emitNextAffectedFile((fileName, text, writeByteOrderMark, onError, sourceFiles, data) => {
            if (!sourceFiles || sourceFiles.length === 0) {
              compilerHost.writeFile(fileName, text, writeByteOrderMark, onError, sourceFiles, data);
              return;
            }

            const sourceFile = ts.getOriginalNode(sourceFiles[0], ts.isSourceFile);
            if (ngCompiler.ignoreForEmit.has(sourceFile)) {
              return;
            }

            ngCompiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
            tscPrepareMap.set(path.normalize(sourceFile.fileName), text);
          }, undefined, undefined, ngProgram.compiler.prepareEmit().transformers);

          if (!affectedFileResult) {
            break;
          }

          diagnostics.push(...affectedFileResult.result.diagnostics);
        }

        //-- return err/warn

        return {
          errors: [
            ...diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
            ...Array.from(resultCache.additionalResultMap.values()).flatMap(item => item.errors)
          ].filterExists(),
          warnings: [
            ...diagnostics.filter(item => item.category !== ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
            ...Array.from(resultCache.additionalResultMap.values()).flatMap(item => item.warnings)
          ],
        };
      });

      build.onLoad({filter: /\.ts$/}, async (args) => {
        resultCache.watchFileSet.add(path.normalize(args.path));

        const output = outputCacheMap.get(path.normalize(args.path));
        if (output != null) {
          return {contents: output, loader: "js"};
        }

        const contents = tscPrepareMap.get(path.normalize(args.path));

        const {sideEffects} = await build.resolve(args.path, {
          kind: 'import-statement',
          resolveDir: build.initialOptions.absWorkingDir ?? '',
        });

        const newContents = await javascriptTransformer.transformData(
          args.path,
          contents!,
          true,
          sideEffects
        );

        outputCacheMap.set(path.normalize(args.path), newContents);

        return {contents: newContents, loader: "js"};
      });

      build.onLoad(
        {filter: /\.[cm]?js$/},
        async (args) => {
          resultCache.watchFileSet.add(path.normalize(args.path));

          const output = outputCacheMap.get(path.normalize(args.path));
          if (output != null) {
            return {contents: output, loader: "js"};
          }

          const {sideEffects} = await build.resolve(args.path, {
            kind: 'import-statement',
            resolveDir: build.initialOptions.absWorkingDir ?? '',
          });

          // const contents = await FsUtil.readFileAsync(args.path);

          const newContents = await javascriptTransformer.transformFile(
            args.path,
            false,
            sideEffects
          );

          outputCacheMap.set(path.normalize(args.path), newContents);

          return {
            contents: newContents,
            loader: 'js',
          };
        }
      );

      build.onEnd((result) => {
        for (const {outputFiles, metafile} of resultCache.additionalResultMap.values()) {
          result.outputFiles?.push(...outputFiles);

          if (result.metafile && metafile) {
            result.metafile.inputs = {...result.metafile.inputs, ...metafile.inputs};
            result.metafile.outputs = {...result.metafile.outputs, ...metafile.outputs};
          }
        }

        conf.result.watchFileSet = resultCache.watchFileSet;
        conf.result.affectedFileSet = resultCache.affectedFileSet;
        conf.result.outputFiles = result.outputFiles;
        conf.result.metafile = result.metafile;
        conf.result.program = ngProgram!.getTsProgram();

        conf.modifiedFileSet.clear();
      });
    }
  };
}

interface IResultCache {
  watchFileSet: Set<string>;
  affectedFileSet: Set<string>;
  additionalResultMap: Map<string, IAdditionalResult>;
}

interface IAdditionalResult {
  outputFiles: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
  errors?: esbuild.PartialMessage[];
  warnings: esbuild.PartialMessage[];
}

export interface INgResultCache {
  watchFileSet?: Set<string>;
  affectedFileSet?: Set<string>;
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
  program?: ts.Program;
}