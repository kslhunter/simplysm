import path from "path";
import ts from "typescript";
import {SdCliBuildResultUtil} from "../utils/SdCliBuildResultUtil";
import {FsUtil, Logger, PathUtil} from "@simplysm/sd-core-node";
import {ISdCliPackageBuildResult, ITsConfig} from "../commons";
import {NgtscProgram} from "@angular/compiler-cli";
import {createHash} from "crypto";
import {fileURLToPath, pathToFileURL} from "url";
import * as sass from "sass";

export class SdTsCompiler {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdTsCompiler"]);

  private readonly _parsedTsConfig: ts.ParsedCommandLine;
  private readonly _writeFileCache = new Map<string, string>();
  private readonly _compilerHost: ts.CompilerHost;
  private _program?: ts.Program;
  private _builder?: ts.EmitAndSemanticDiagnosticsBuilderProgram;

  //-- for ng
  private readonly _isForAngular: boolean;
  private _ngProgram?: NgtscProgram;
  private readonly _styleDepsCache = new Map<string, Set<string>>();
  private _markedChanges: string[] = [];

  public get program(): ts.Program {
    if (!this._program) {
      throw new Error("TS 프로그램 NULL");
    }
    return this._program;
  }

  public constructor(private readonly _opt: {
    pkgPath: string,
    emit: boolean;
    emitDts: boolean;
    globalStyle: boolean;
  }) {
    //-- tsconfig
    const tsConfigFilePath = path.resolve(_opt.pkgPath, "tsconfig.json");
    const tsConfig = FsUtil.readJson(tsConfigFilePath) as ITsConfig;
    this._parsedTsConfig = ts.parseJsonConfigFileContent(
      tsConfig,
      ts.sys,
      _opt.pkgPath,
      {
        ...tsConfig.angularCompilerOptions ?? {},
        ..._opt.emitDts !== undefined ? {declaration: _opt.emitDts} : {}
      }
    );

    //-- vars
    this._isForAngular = Boolean(tsConfig.angularCompilerOptions);

    //-- host
    this._compilerHost = ts.createIncrementalCompilerHost(this._parsedTsConfig.options);
    if (tsConfig.angularCompilerOptions) {
      this._compilerHost["readResource"] = (fileName: string) => {
        return this._compilerHost.readFile(fileName);
      };

      this._compilerHost["transformResource"] = async (data: string, context: {
        type: string,
        containingFile: string,
        resourceFile: any
      }) => {
        if (context.resourceFile != null || context.type !== "style") {
          return null;
        }

        try {
          const scssResult = await sass.compileStringAsync(data, {
            url: new URL((context.containingFile as string) + ".scss"),
            importer: {
              findFileUrl: (url) => pathToFileURL(url)
            },
            logger: sass.Logger.silent
          });

          const styleContent = scssResult.css.toString();

          const deps = scssResult.loadedUrls.slice(1).map((item) => path.resolve(fileURLToPath(item.href)));
          for (const dep of deps) {
            const depCache = this._styleDepsCache.getOrCreate(dep, new Set<string>());
            depCache.add(path.resolve(context.containingFile));
          }
          return {content: styleContent};
        }
        catch (err) {
          this._logger.error("scss 파싱 에러", err);
          return null;
        }
      };
    }
  }

  public markChanges(changes: string[]): void {
    this._markedChanges.push(...changes);
  }

  public async buildAsync(): Promise<{
    filePaths: string[];
    affectedFilePaths: string[];
    results: ISdCliPackageBuildResult[];
  }> {
    const markedChanges = this._markedChanges;
    this._markedChanges = [];

    const distPath = path.resolve(this._opt.pkgPath, "dist");
    const srcFilePaths = await FsUtil.globAsync(path.resolve(this._opt.pkgPath, "src/**/*.{ts,tsx}"));
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
      /*this._program = ts.createProgram(
        srcFilePaths,
        this._parsedTsConfig.options,
        this._compilerHost,
        this._program
      );*/

      this._builder = ts.createIncrementalProgram({
        rootNames: srcFilePaths,
        host: this._compilerHost,
        options: this._parsedTsConfig.options,
        createProgram: ts.createEmitAndSemanticDiagnosticsBuilderProgram
      });
      this._program = this._builder.getProgram();
    }

    const diagnostics: ts.Diagnostic[] = [];
    const affectedFilePaths: string[] = [];

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
        console.log(this._opt.pkgPath, sourceFile.fileName);

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
        affectedFilePaths.push(path.resolve(affectedSourceFile.fileName));
      }
    }

    if (this._isForAngular) {
      for (const markedChange of markedChanges) {
        const depsSet = this._styleDepsCache.get(markedChange);
        if (depsSet) {
          affectedFilePaths.push(...depsSet);
        }
      }
      affectedFilePaths.distinctThis();
    }

    const globalStyleFilePath = path.resolve(this._opt.pkgPath, "src/styles.scss");
    if (this._opt.globalStyle && FsUtil.exists(globalStyleFilePath) && markedChanges.includes(globalStyleFilePath)) {
      affectedFilePaths.push(globalStyleFilePath);
      affectedFilePaths.distinctThis();
    }

    this._logger.debug(`[${path.basename(this._opt.pkgPath)}] 영향받는 파일 ${this._opt.emit ? "EMIT" : "CHECK"}...`);

    for (const affectedFilePath of affectedFilePaths) {
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
            ...this._ngProgram.compiler.getDiagnosticsForFile(affectedSourceFile, 1)
          );
        }
      }
    }

    this._logger.debug(`[${path.basename(this._opt.pkgPath)}] 영향받는 파일 ${this._opt.emit ? "EMIT" : "CHECK"} 완료`, affectedFilePaths);

    const buildResults = diagnostics.map((item) => SdCliBuildResultUtil.convertFromTsDiag(item, this._opt.emit ? "build" : "check"));

    return {
      filePaths: [
        ...Array.from(this._styleDepsCache.keys()),
        ...this._builder.getSourceFiles().map(item => path.resolve(item.fileName))
      ],
      affectedFilePaths: affectedFilePaths,
      results: buildResults
    };
  }

  private _writeFile(filePath: string, data: string): void {
    if (this._writeFileCache.get(filePath) !== data) {
      this._compilerHost.writeFile(filePath, data, false);
    }
    this._writeFileCache.set(filePath, data);
  }
}
