import path from "path";
import ts from "typescript";
import {SdCliBuildResultUtil} from "../utils/SdCliBuildResultUtil";
import {FsUtil, Logger, PathUtil} from "@simplysm/sd-core-node";
import {ISdCliPackageBuildResult} from "../commons";
import {NgtscProgram} from "@angular/compiler-cli";
import {createHash} from "crypto";


interface IOptTransform<T> {
  fn: (_: ts.Program, arg: T) => ts.TransformerFactory<ts.SourceFile>,
  args: T
}

export class SdTsIncrementalBuilder {
  public builderProgram?: ts.SemanticDiagnosticsBuilderProgram;

  private _program?: ts.Program;
  private _ngProgram?: NgtscProgram;
  private readonly _writeFileCache = new Map<string, string>();

  public constructor(private readonly _pkgPath: string,
                     private readonly _compilerOptions: ts.CompilerOptions,
                     private readonly _host: ts.CompilerHost,
                     private readonly _opt: {
                       emitJs: boolean | string[],
                       compilerOptions?: ts.CompilerOptions,
                       transforms?: IOptTransform<any>[]
                     }) {
  }

  public static async createAsync(pkgPath: string, optFn: (compilerOptions: ts.CompilerOptions) => {
    emitJs: boolean | string[],
    compilerOptions?: ts.CompilerOptions,
    transforms?: IOptTransform<any>[]
  }): Promise<SdTsIncrementalBuilder> {
    const tsConfigFilePath = path.resolve(pkgPath, "tsconfig.json");
    const tsConfig = await FsUtil.readJsonAsync(tsConfigFilePath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(
      await FsUtil.readJsonAsync(tsConfigFilePath),
      ts.sys,
      pkgPath,
      tsConfig["angularCompilerOptions"]
    );
    const opt = optFn(parsedTsConfig.options);
    const compilerOptions = {
      ...parsedTsConfig.options,
      ...opt?.compilerOptions
    };
    const host = ts.createIncrementalCompilerHost(compilerOptions);
    return new SdTsIncrementalBuilder(
      pkgPath,
      compilerOptions,
      host,
      opt
    );
  }

  public async buildAsync(): Promise<{
    affectedFilePaths: string[];
    results: ISdCliPackageBuildResult[];
  }> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdTsIncrementalBuilder", "buildAsync"]);

    const distPath = this._compilerOptions.outDir ?? path.resolve(this._pkgPath, "dist");
    const srcGlobPath = path.resolve(this._pkgPath, "src/**/*.{ts,tsx}");
    const srcFilePaths = await FsUtil.globAsync(srcGlobPath);

    if (this._compilerOptions["strictTemplates"] === true) {
      this._ngProgram = new NgtscProgram(
        srcFilePaths,
        this._compilerOptions,
        this._host,
        this._ngProgram
      );
      this._program = this._ngProgram.getTsProgram();
    }
    else {
      this._program = ts.createProgram(
        srcFilePaths,
        this._compilerOptions,
        this._host,
        this._program
      );
    }

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

    this.builderProgram = ts.createSemanticDiagnosticsBuilderProgram(
      this._program,
      this._host,
      this.builderProgram
    );

    const diagnostics: ts.Diagnostic[] = [];
    const affectedFilePaths: string[] = [];

    if (this._ngProgram) {
      diagnostics.push(...this._ngProgram.compiler.getOptionDiagnostics());
    }

    diagnostics.push(
      ...this.builderProgram.getOptionsDiagnostics(),
      ...this.builderProgram.getGlobalDiagnostics(),
    );

    if (this._ngProgram) {
      await this._ngProgram.compiler.analyzeAsync();
    }

    const program = this.builderProgram.getProgram();

    logger.debug(`[${path.basename(this._pkgPath)}] 영향받는 파일 확인 및 처리중...`);
    const srcFilePathSet = new Set<string>(srcFilePaths);
    while (true) {
      let affectedSourceFile: ts.SourceFile | undefined;

      const semanticResult = this.builderProgram.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
        //-- ngtypecheck의 org파일 포함 (ngtypecheck 파일는 무시)
        if (this._ngProgram?.compiler.ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith(".ngtypecheck.ts")) {
          const orgFileName = sourceFile.fileName.slice(0, -15) + ".ts";
          const orgSourceFile = this.builderProgram!.getSourceFile(orgFileName);
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
        const emitResult = this.builderProgram.emit
        (affectedSourceFile,
          (filePath, data, writeByteOrderMark) => {
            let realFilePath = filePath;
            let realData = data;
            if (PathUtil.isChildPath(realFilePath, path.resolve(distPath, path.basename(this._pkgPath), "src"))) {
              realFilePath = path.resolve(distPath, path.relative(path.resolve(distPath, path.basename(this._pkgPath), "src"), realFilePath));

              if (filePath.endsWith(".js.map")) {
                const sourceMapContents = JSON.parse(realData);
                // remove "../../"
                sourceMapContents.sources[0] = sourceMapContents.sources[0].slice(6);
                realData = JSON.stringify(sourceMapContents);
              }
            }

            if (this._writeFileCache.get(realFilePath) !== realData) {
              this._host.writeFile(realFilePath, realData, writeByteOrderMark);
            }
            this._writeFileCache.set(realFilePath, realData);
          },
          undefined,
          Array.isArray(this._opt.emitJs) ? !this._opt.emitJs.includes(path.resolve(affectedSourceFile.fileName)) : !this._opt.emitJs,
          this._opt.transforms ? {
            before: this._opt.transforms.map((item) => typeof item.fn === "function" ? item.fn(program, item.args) : (item.fn["default"] as any)(program, item.args))
          } : undefined
        );
        diagnostics.push(...emitResult.diagnostics);

        diagnostics.push(...this.builderProgram.getSyntacticDiagnostics(affectedSourceFile));

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

        affectedFilePaths.push(path.resolve(affectedSourceFile.fileName));
      }
    }
    logger.debug(`[${path.basename(this._pkgPath)}] 영향받는 파일 확인 및 처리 완료`, affectedFilePaths);

    const buildResults = diagnostics.map((item) => SdCliBuildResultUtil.convertFromTsDiag(item));

    return {
      affectedFilePaths,
      results: buildResults
    };
  }
}
