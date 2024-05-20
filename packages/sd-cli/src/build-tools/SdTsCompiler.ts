import {SdCliBuildResultUtil} from "../utils/SdCliBuildResultUtil";
import {ISdCliPackageBuildResult} from "../commons";
import {SdTsCompiler2} from "../build-tools2/SdTsCompiler2";
import ts from "typescript";
import path from "path";
import {FsUtil, PathUtil} from "@simplysm/sd-core-node";

export class SdTsCompiler {
  /*private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdTsCompiler"]);

  private readonly _parsedTsConfig: ts.ParsedCommandLine;
  private readonly _writeFileCache = new Map<string, string>();
  private readonly _compilerHost: ts.CompilerHost;
  private _program?: ts.Program;
  private _builder?: ts.EmitAndSemanticDiagnosticsBuilderProgram;

  //-- for ng
  private readonly _isForAngular: boolean;
  private _ngProgram?: NgtscProgram;
  private readonly _styleDepsCache = new Map<string, Set<string>>();
  private _markedChanges: string[] = [];*/

  program?: ts.Program;

  readonly #compiler: SdTsCompiler2;

  readonly #pkgPath: string;

  /*public get program(): ts.Program {
    if (!this._program) {
      throw new Error("TS 프로그램 NULL");
    }
    return this._program;
  }*/

  public constructor(pkgPath: string, dev: boolean) {
    this.#pkgPath = pkgPath;
    this.#compiler = new SdTsCompiler2(
      pkgPath,
      {declaration: true},
      dev,
      path.resolve(pkgPath, "src/styles.scss")
    );
  }

  public markChanges(modifiedFileSet: Set<string>): void {
    this.#compiler.invalidate(modifiedFileSet);
  }

  public async buildAsync(): Promise<{
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    results: ISdCliPackageBuildResult[];
  }> {
    const buildResult = await this.#compiler.buildAsync();
    this.program = buildResult.program;

    for (const affectedFilePath of buildResult.affectedFileSet) {
      const emittedFiles = buildResult.emittedFilesCacheMap.get(affectedFilePath) ?? [];
      for (const emittedFile of emittedFiles) {
        if (emittedFile.outRelPath != null) {
          const distPath = path.resolve(this.#pkgPath, "dist", emittedFile.outRelPath);
          if (PathUtil.isChildPath(distPath, path.resolve(this.#pkgPath, "dist"))) {
            await FsUtil.writeFileAsync(distPath, emittedFile.text);
          }
        }
      }

      const globalStylesheetResult = buildResult.stylesheetResultMap.get(affectedFilePath);
      if (globalStylesheetResult) {
        for (const outputFile of globalStylesheetResult.outputFiles) {
          const distPath = path.resolve(this.#pkgPath, "dist", path.relative(this.#pkgPath, outputFile.path));
          if (PathUtil.isChildPath(distPath, path.resolve(this.#pkgPath, "dist"))) {
            await FsUtil.writeFileAsync(distPath, outputFile.text);
          }
        }
      }
    }

    /*const markedChanges = this._markedChanges;
    this._markedChanges = [];

    const distPath = path.resolve(this._opt.pkgPath, "dist");
    const srcFilePaths = await FsUtil.globAsync(path.resolve(this._opt.pkgPath, "src/!**!/!*.{ts,tsx}"));
    const srcFilePathSet = new Set<string>(srcFilePaths);

    if (this._isForAngular) {
      this._ngProgram = new NgtscProgram(
        srcFilePaths,
        this._parsedTsConfig.options,
        this._compilerHost,
        this._ngProgram
      );
      this._program = this._ngProgram.getTsProgram();

      const baseGetSourceFiles = this._program.getSourceFiles;
      this._program.getSourceFiles = function (...parameters) {
        const files: readonly (ts.SourceFile & { version?: string })[] = baseGetSourceFiles(...parameters);

        for (const file of files) {
          if (file.version === undefined) {
            file.version = createHash("sha256").update(file.text).digest("hex");
          }
        }

        return files;
      };

      this._builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
        this._program,
        this._compilerHost,
        this._builder
      );
    }
    else {
      /!*this._program = ts.createProgram(
        srcFilePaths,
        this._parsedTsConfig.options,
        this._compilerHost,
        this._program
      );*!/

      this._builder = ts.createIncrementalProgram({
        rootNames: srcFilePaths,
        host: this._compilerHost,
        options: this._parsedTsConfig.options,
        createProgram: ts.createEmitAndSemanticDiagnosticsBuilderProgram
      });
      this._program = this._builder.getProgram();
    }

    const diagnostics: ts.Diagnostic[] = [];
    const affectedFileSet = new Set<string>();

    if (this._ngProgram) {
      diagnostics.push(...this._ngProgram.compiler.getOptionDiagnostics());
    }

    diagnostics.push(
      ...this._builder.getOptionsDiagnostics(),
      ...this._builder.getGlobalDiagnostics()
    );

    if (this._ngProgram) {
      await this._ngProgram.compiler.analyzeAsync();
    }

    this._logger.debug(`[${path.basename(this._opt.pkgPath)}] 영향받는 파일 확인중...`);
    while (true) {
      let affectedSourceFile: ts.SourceFile | undefined;

      const semanticResult = this._builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
        //-- ngtypecheck의 org파일 포함 (ngtypecheck 파일는 무시)
        if (this._ngProgram?.compiler.ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith(".ngtypecheck.ts")) {
          const orgFileName = sourceFile.fileName.slice(0, -15) + ".ts";
          const orgSourceFile = this._builder!.getSourceFile(orgFileName);
          if (orgSourceFile) {
            affectedSourceFile = orgSourceFile;
          }
          return true;
        }

        //-- 소스폴더 파일 포함
        else if (srcFilePathSet.has(path.resolve(sourceFile.fileName))) {
          affectedSourceFile = sourceFile;
          return false;
        }

        //-- 나머지 무시
        else {
          return true;
        }
      });
      if (!semanticResult || !affectedSourceFile) break;
      diagnostics.push(...semanticResult.result);

      if ("fileName" in affectedSourceFile) {
        affectedFileSet.add(path.normalize(affectedSourceFile.fileName));
      }
    }

    if (this._isForAngular) {
      for (const markedChange of markedChanges) {
        const depsSet = this._styleDepsCache.get(markedChange);
        if (depsSet) {
          affectedFileSet.adds(...depsSet);
        }
      }
    }

    const globalStyleFilePath = path.resolve(this._opt.pkgPath, "src/styles.scss");
    if (this._opt.globalStyle && FsUtil.exists(globalStyleFilePath) && markedChanges.includes(globalStyleFilePath)) {
      affectedFileSet.add(globalStyleFilePath);
    }

    this._logger.debug(`[${path.basename(this._opt.pkgPath)}] 영향받는 파일 ${this._opt.emit ? "EMIT" : "CHECK"}...`);

    for (const affectedFilePath of affectedFileSet) {
      if (this._opt.globalStyle && affectedFilePath === globalStyleFilePath) {
        try {
          const content = await FsUtil.readFileAsync(affectedFilePath);
          const scssResult = await sass.compileStringAsync(content, {
            url: new URL(affectedFilePath),
            importer: {
              findFileUrl: (url) => pathToFileURL(url)
            },
            logger: sass.Logger.silent
          });

          const deps = scssResult.loadedUrls.slice(1).map((item) => path.resolve(fileURLToPath(item.href)));
          for (const dep of deps) {
            const depCache = this._styleDepsCache.getOrCreate(dep, new Set<string>());
            depCache.add(affectedFilePath);
          }

          if (this._opt.emit) {
            const outFilePath = path.resolve(this._opt.pkgPath, path.basename(affectedFilePath, path.extname(affectedFilePath)) + ".css");

            this._writeFile(outFilePath, scssResult.css.toString());
          }
        }
        catch (err) {
          this._logger.error(err);
        }
      }
      else {
        const affectedSourceFile = this._builder.getSourceFile(affectedFilePath);
        if (!affectedSourceFile) continue;

        const emitResult = this._builder.emit(affectedSourceFile,
          (filePath, data) => {
            let realFilePath = filePath;
            let realData = data;
            if (PathUtil.isChildPath(realFilePath, path.resolve(distPath, path.basename(this._opt.pkgPath), "src"))) {
              realFilePath = path.resolve(distPath, path.relative(path.resolve(distPath, path.basename(this._opt.pkgPath), "src"), realFilePath));

              if (filePath.endsWith(".js.map")) {
                const sourceMapContents = JSON.parse(realData);
                // remove "../../"
                sourceMapContents.sources[0] = sourceMapContents.sources[0].slice(6);
                realData = JSON.stringify(sourceMapContents);
              }
            }

            this._ngProgram?.compiler.incrementalCompilation.recordSuccessfulEmit(affectedSourceFile);
            this._writeFile(realFilePath, realData);
          },
          undefined,
          !this._opt.emit,
          {...this._ngProgram?.compiler.prepareEmit().transformers ?? {}}
        );

        diagnostics.push(...emitResult.diagnostics);

        diagnostics.push(...this._builder.getSyntacticDiagnostics(affectedSourceFile));

        if (
          this._ngProgram &&
          !affectedSourceFile.isDeclarationFile &&
          !this._ngProgram.compiler.ignoreForEmit.has(affectedSourceFile) &&
          !this._ngProgram.compiler.incrementalCompilation.safeToSkipEmit(affectedSourceFile)
        ) {
          diagnostics.push(
            ...this._ngProgram.compiler.getDiagnosticsForFile(affectedSourceFile, OptimizeFor.WholeProgram)
          );
        }
      }
    }

    this._logger.debug(`[${path.basename(this._opt.pkgPath)}] 영향받는 파일 ${this._opt.emit ? "EMIT" : "CHECK"} 완료`, affectedFileSet);

    const buildResults = diagnostics.map((item) => SdCliBuildResultUtil.convertFromTsDiag(item, this._opt.emit ? "build" : "check"));*/

    return {
      watchFileSet: buildResult.watchFileSet,
      affectedFileSet: buildResult.affectedFileSet,
      results: [
        ...buildResult.typescriptDiagnostics.map((item) => SdCliBuildResultUtil.convertFromTsDiag(item, "build")),
        ...Array.from(buildResult.stylesheetResultMap.values()).mapMany(item => item.errors!)
          .map(err => SdCliBuildResultUtil.convertFromEsbuildResult(err, "build", "error")),
        /*...Array.from(buildResult.stylesheetResultMap.values()).mapMany(item => item.warnings!)
          .map(warn => SdCliBuildResultUtil.convertFromEsbuildResult(warn, "build", "warning"))*/
      ]
    };
  }
}
