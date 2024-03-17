import esbuild from "esbuild";
import {FsUtil} from "@simplysm/sd-core-node";
import ts from "typescript";
import path from "path";
import {convertTypeScriptDiagnostic} from "@angular-devkit/build-angular/src/tools/esbuild/angular/diagnostics";

export function sdServerPlugin(conf: {
  pkgPath: string;
  dev: boolean;
  modifiedFileSet: Set<string>;
  result: IServerBundlerResultCache;
}): esbuild.Plugin {
  const tsConfigPath = path.resolve(conf.pkgPath, "tsconfig.json");
  const tsConfig = FsUtil.readJson(tsConfigPath);
  const parsedTsConfig = ts.parseJsonConfigFileContent(tsConfig, ts.sys, conf.pkgPath, {
    declaration: false
  });

  const sourceFileCache = new Map<string, ts.SourceFile>();
  const referencingMap = new Map<string, Set<string>>();

  let program: ts.Program | undefined;
  let builder: ts.EmitAndSemanticDiagnosticsBuilderProgram | undefined;

  let resultCache: IResultCache = {
    watchFileSet: new Set<string>(),
    affectedFileSet: new Set<string>()
  };
  const tscPrepareMap = new Map<string, string>();

  function createCompilerHost() {
    const compilerHost = ts.createIncrementalCompilerHost(parsedTsConfig.options);
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
      const result = builder!.getSemanticDiagnosticsOfNextAffectedFile();
      if (!result) {
        break;
      }
      affectedFileSet.add(path.normalize((result.affected as ts.SourceFile).fileName));
    }

    return affectedFileSet;
  }

  return {
    name: "sd-server-compiler",
    setup: (build: esbuild.PluginBuild) => {
      //-- compilerHost
      const compilerHost = createCompilerHost();

      build.onStart(() => {
        //-- modified
        for (const modifiedFile of conf.modifiedFileSet) {
          sourceFileCache.delete(modifiedFile);

          if (referencingMap.has(modifiedFile)) {
            for (const referencingFile of referencingMap.get(modifiedFile)!) {
              sourceFileCache.delete(referencingFile);
            }
          }
        }
        referencingMap.clear();

        //-- init resultCache

        resultCache = {
          watchFileSet: new Set<string>(),
          affectedFileSet: new Set<string>(),
        };

        program = ts.createProgram(
          parsedTsConfig.fileNames,
          parsedTsConfig.options,
          compilerHost,
          program
        );
        builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
          program,
          compilerHost,
          builder
        );

        //-- affectedFilePathSet
        resultCache.affectedFileSet.adds(...findAffectedFileSet());

        // Deps -> refMap
        builder.getSourceFiles().forEach(sf => {
          resultCache.watchFileSet.add(path.normalize(sf.fileName));

          const deps = builder!.getAllDependencies(sf);
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
          ...builder.getOptionsDiagnostics(),
          ...builder.getGlobalDiagnostics()
        );

        for (const affectedFile of resultCache.affectedFileSet) {
          const affectedSourceFile = sourceFileCache.get(path.normalize(affectedFile));
          if (!affectedSourceFile) {
            continue;
          }

          diagnostics.push(
            ...builder.getSyntacticDiagnostics(affectedSourceFile),
            ...builder.getSemanticDiagnostics(affectedSourceFile)
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
            tscPrepareMap.set(path.normalize(sourceFile.fileName), text);
          });

          if (!affectedFileResult) {
            break;
          }

          diagnostics.push(...affectedFileResult.result.diagnostics);
        }

        //-- return err/warn

        return {
          errors: diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
          warnings: diagnostics.filter(item => item.category !== ts.DiagnosticCategory.Error).map(item => convertTypeScriptDiagnostic(ts, item)),
        };
      });


      build.onLoad({filter: /\.ts$/}, (args) => {
        resultCache.watchFileSet.add(path.normalize(args.path));
        const contents = tscPrepareMap.get(path.normalize(args.path));
        return {contents, loader: "js"};
      });

      build.onLoad(
        {filter: new RegExp("(" + Object.keys(build.initialOptions.loader!).map(item => "\\" + item).join("|") + ")$")},
        (args) => {
          conf.result.watchFileSet!.add(path.normalize(args.path));
          return null;
        }
      );

      build.onEnd((result) => {
        conf.result.watchFileSet = resultCache.watchFileSet;
        conf.result.affectedFileSet = resultCache.affectedFileSet;
        conf.result.outputFiles = result.outputFiles;
        conf.result.metafile = result.metafile;
        conf.result.program = program;

        conf.modifiedFileSet.clear();
      });
    }
  };
}

export interface IServerBundlerResultCache {
  watchFileSet?: Set<string>;
  affectedFileSet?: Set<string>;
  outputFiles?: esbuild.OutputFile[];
  metafile?: esbuild.Metafile;
  program?: ts.Program;
}

interface IResultCache {
  watchFileSet: Set<string>;
  affectedFileSet: Set<string>;
}