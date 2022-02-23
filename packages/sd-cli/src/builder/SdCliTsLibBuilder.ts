import { INpmConfig, ISdCliLibPackageConfig, ISdCliPackageBuildResult } from "../commons";
import { EventEmitter } from "events";
import ts from "typescript";
import { FsUtil, Logger, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";
import { createHash } from "crypto";
import { SdCliBuildResultUtil } from "../utils/SdCliBuildResultUtil";
import { NgtscProgram } from "@angular/compiler-cli";
import sass from "sass";
import { SdCliPackageLinter } from "../build-tool/SdCliPackageLinter";
import { SdCliCacheCompilerHost } from "../build-tool/SdCliCacheCompilerHost";
import { SdCliNgCacheCompilerHost } from "../build-tool/SdCliNgCacheCompilerHost";
import { NgCompiler } from "@angular/compiler-cli/src/ngtsc/core";
import { SdCliNpmConfigUtil } from "../utils/SdCliNpmConfigUtil";
import { SdCliNgModuleGenerator } from "../ng-tools/SdCliNgModuleGenerator";
import { SdCliIndexFileGenerator } from "../build-tool/SdCliIndexFileGenerator";

export class SdCliTsLibBuilder extends EventEmitter {
  private readonly _logger: Logger;

  private _moduleResolutionCache?: ts.ModuleResolutionCache;

  private readonly _linter: SdCliPackageLinter;

  private readonly _fileCache = new Map<string, IFileCache>();
  private readonly _writeFileCache = new Map<string, string>();

  private readonly _indexFileGenerator?: SdCliIndexFileGenerator;

  private _program?: ts.Program;
  private _ngProgram?: NgtscProgram;
  private _builder?: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  private readonly _ngModuleGenerator?: SdCliNgModuleGenerator;

  private readonly _tsconfigFilePath: string;
  private readonly _parsedTsconfig: ts.ParsedCommandLine;
  private readonly _npmConfigMap = new Map<string, INpmConfig>();

  private readonly _isAngular: boolean;

  public constructor(private readonly _rootPath: string,
                     private readonly _config: ISdCliLibPackageConfig,
                     private readonly _workspaceRootPath: string) {
    super();
    const npmConfig = this._getNpmConfig(this._rootPath)!;

    // linter
    this._linter = new SdCliPackageLinter(this._rootPath);

    // logger
    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, npmConfig.name]);

    // isAngular
    this._isAngular = SdCliNpmConfigUtil.getDependencies(npmConfig).defaults.includes("@angular/core");

    // tsconfig
    this._tsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
    const tsconfig = FsUtil.readJson(this._tsconfigFilePath);
    this._parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath, this._isAngular ? tsconfig.angularCompilerOptions : undefined);

    if (this._isAngular) {
      // NgModule 생성기 초기화
      this._ngModuleGenerator = new SdCliNgModuleGenerator(this._rootPath, [
        "controls",
        "directives",
        "guards",
        "modals",
        "providers",
        "app",
        "pages",
        "print-templates",
        "toasts",
        "AppPage"
      ], {
        glob: "**/*Page.ts",
        fileEndsWith: "Page",
        rootClassName: "AppPage"
      });
    }

    // index 생성기 초기화
    if (this._config.autoIndex) {
      this._indexFileGenerator = new SdCliIndexFileGenerator(this._rootPath, this._config.autoIndex);
    }
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (results: ISdCliPackageBuildResult[]) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");

    this._logger.debug("dist 폴더 삭제...");
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    if (this._ngModuleGenerator) {
      this._logger.debug("NgModule 생성...");
      await this._ngModuleGenerator.runAsync();
    }

    if (this._indexFileGenerator) {
      this._logger.debug("index.js 생성 및 index.js용 변경감지 시작...");
      await this._indexFileGenerator.runAsync();
      await this._indexFileGenerator.watchAsync();
    }

    this._logger.debug("프로그램 로딩...");
    const buildPack = this._createSdBuildPack(this._parsedTsconfig);

    this._logger.debug("변경감지 구성...");
    const relatedPaths = await this.getAllRelatedPathsAsync();
    const watcher = SdFsWatcher.watch(relatedPaths);
    watcher.onChange({}, async (changeInfos) => {
      const changeFilePaths = changeInfos.filter((item) => ["add", "change", "unlink"].includes(item.event)).map((item) => item.path);
      if (changeFilePaths.length === 0) return;

      this._logger.debug("파일 변경 감지", changeInfos);
      this.emit("change");

      this._logger.debug("변경된 파일의 캐쉬 삭제...");
      for (const changeFilePath of changeFilePaths) {
        this._fileCache.delete(PathUtil.posix(changeFilePath));
      }

      if (this._ngModuleGenerator) {
        this._logger.debug("NgModule 생성...");
        this._ngModuleGenerator.removeCaches(changeFilePaths);
        await this._ngModuleGenerator.runAsync();
      }

      const watchBuildResults: ISdCliPackageBuildResult[] = [];

      this._logger.debug("프로그램 로딩...");
      const watchBuildPack = this._createSdBuildPack(this._parsedTsconfig);

      this._logger.debug("빌드...");
      watchBuildResults.push(...await this._runBuilderAsync(watchBuildPack.builder, watchBuildPack.ngCompiler));

      this._logger.debug("린트...");
      const lintFilePaths = [
        ...watchBuildPack.affectedSourceFiles.map((item) => item.fileName),
        ...changeInfos.filter((item) => ["add", "change"].includes(item.event)).map((item) => item.path)
      ];
      if (lintFilePaths.length > 0) {
        watchBuildResults.push(...await this._linter.lintAsync(lintFilePaths, watchBuildPack.program));
      }

      this._logger.debug("변경감지 대상목록 재구성...");
      const watchRelatedPaths = await this.getAllRelatedPathsAsync();
      watcher.add(watchRelatedPaths);

      this.emit("complete", watchBuildResults);
    });

    this._logger.debug("빌드...");
    const buildResults = await this._runBuilderAsync(buildPack.builder, buildPack.ngCompiler);

    this._logger.debug("린트...");
    buildResults.push(...await this._linter.lintAsync(relatedPaths, buildPack.program));

    this.emit("complete", buildResults);
  }

  public async buildAsync(): Promise<ISdCliPackageBuildResult[]> {
    this._logger.debug("dist 폴더 삭제...");
    await FsUtil.removeAsync(this._parsedTsconfig.options.outDir!);

    if (this._ngModuleGenerator) {
      this._logger.debug("NgModule 생성...");
      await this._ngModuleGenerator.runAsync();
    }

    if (this._indexFileGenerator) {
      this._logger.debug("index.js 생성...");
      await this._indexFileGenerator.runAsync();
    }

    this._logger.debug("프로그램 로딩...");
    const buildPack = this._createSdBuildPack(this._parsedTsconfig);

    this._logger.debug("빌드...");
    const buildResults = await this._runBuilderAsync(buildPack.builder, buildPack.ngCompiler);

    this._logger.debug("린트...");
    const relatedPaths = await this.getAllRelatedPathsAsync();
    buildResults.push(...await this._linter.lintAsync(relatedPaths, buildPack.program));

    return buildResults;
  }

  private async getAllRelatedPathsAsync(): Promise<string[]> {
    const workspaceNpmConfig = this._getNpmConfig(this._workspaceRootPath)!;
    const workspaceName = workspaceNpmConfig.name;

    const fileCachePaths = Array.from(this._fileCache.keys())
      .filter((filePath) => {
        const workspaceRegex = new RegExp(`node_modules[\\\\/]@${workspaceName}[\\\\/]`);
        return !filePath.includes("node_modules")
          || (/node_modules[\\/]@simplysm[\\/]/).test(filePath)
          || workspaceRegex.test(filePath);
      });
    const mySourceGlobPath = path.resolve(this._rootPath, "**", "+(*.js|*.cjs|*.mjs|*.ts)");
    const mySourceFilePaths = await FsUtil.globAsync(mySourceGlobPath, {
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.*/**"
      ]
    });

    return [...fileCachePaths, ...mySourceFilePaths, path.resolve(this._rootPath, ".eslintrc.cjs")].distinct();
  }

  private async _runBuilderAsync(builder: ts.EmitAndSemanticDiagnosticsBuilderProgram, ngCompiler?: NgCompiler): Promise<ISdCliPackageBuildResult[]> {
    try {
      const results: ISdCliPackageBuildResult[] = [];

      const diagnostics: ts.Diagnostic[] = [];

      if (ngCompiler) {
        diagnostics.push(...ngCompiler.getOptionDiagnostics());
      }

      diagnostics.push(
        ...builder.getOptionsDiagnostics(),
        ...builder.getGlobalDiagnostics()
      );

      if (ngCompiler) {
        await ngCompiler.analyzeAsync();
      }

      for (const sourceFile of builder.getSourceFiles()) {
        if (ngCompiler?.ignoreForDiagnostics.has(sourceFile)) continue;

        diagnostics.push(
          ...builder.getSyntacticDiagnostics(sourceFile),
          ...builder.getSemanticDiagnostics(sourceFile)
        );

        if (
          ngCompiler &&
          !sourceFile.isDeclarationFile &&
          !ngCompiler.ignoreForEmit.has(sourceFile) &&
          !ngCompiler.incrementalDriver.safeToSkipEmit(sourceFile)
        ) {
          diagnostics.push(
            ...ngCompiler.getDiagnosticsForFile(sourceFile, 1)
          );
        }
      }

      results.push(
        ...diagnostics
          .filter((item) => [ts.DiagnosticCategory.Error, ts.DiagnosticCategory.Warning].includes(item.category))
          .map((item) => SdCliBuildResultUtil.convertFromTsDiag(item))
          .filterExists()
      );

      if (results.some((item) => item.severity === "error")) {
        return results;
      }

      const transformers = ngCompiler?.prepareEmit().transformers;
      for (const sourceFile of builder.getSourceFiles()) {
        if (ngCompiler?.ignoreForEmit.has(sourceFile)) continue;
        builder.emit(sourceFile, undefined, undefined, undefined, transformers);
      }

      return results;
    }
    catch (err) {
      if (err instanceof sass.Exception) {
        const matches = (/^(.*\.sd\.scss) ([0-9]*):([0-9]*)/).exec(err.sassStack)!;
        const filePath = path.resolve(matches[1].replace(/\.sd\.scss/, "").replace(/^\.:/, item => item.toUpperCase()));
        const scssLine = matches[2];
        const scssChar = matches[3];
        const message = err.sassMessage;

        return [{
          filePath,
          line: undefined,
          char: undefined,
          code: undefined,
          severity: "error",
          message: `스타일(${scssLine}:${scssChar}): ${message}\n${err.message}`
        }];
      }

      return [{
        filePath: undefined,
        line: undefined,
        char: undefined,
        code: undefined,
        severity: "error",
        message: err.stack
      }];
    }
  }

  private _createSdBuildPack(parsedTsconfig: ts.ParsedCommandLine): ISdBuildPack {
    const compilerHost = this._createCacheCompilerHost(parsedTsconfig);
    const { program, ngCompiler } = this._createProgram(parsedTsconfig, compilerHost);

    this._builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      program,
      compilerHost,
      this._builder
    );

    const affectedSourceFileSet: Set<ts.SourceFile> = new Set<ts.SourceFile>();
    while (true) {
      const result = this._builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
        // this._logger.debug(sourceFile.fileName + " SYNTAX 로딩...");
        if (ngCompiler?.ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith(".ngtypecheck.ts")) {
          const orgFileName = sourceFile.fileName.slice(0, -15) + ".ts";
          const orgSourceFile = this._builder!.getSourceFile(orgFileName);
          if (orgSourceFile) {
            affectedSourceFileSet.add(orgSourceFile);
          }

          return true;
        }

        return false;
      });
      if (!result) break;

      // this._logger.debug((result.affected as ts.SourceFile).fileName + " SYNTAX 로딩");
      affectedSourceFileSet.add(result.affected as ts.SourceFile);
    }

    return {
      program,
      ngCompiler,
      builder: this._builder,
      affectedSourceFiles: Array.from(affectedSourceFileSet.values())
    };
  }

  private _createProgram(parsedTsconfig: ts.ParsedCommandLine, compilerHost: ts.CompilerHost): { program: ts.Program; ngCompiler?: NgCompiler } {
    if (this._isAngular) {
      this._ngProgram = new NgtscProgram(
        parsedTsconfig.fileNames,
        parsedTsconfig.options,
        compilerHost,
        this._ngProgram
      );
      this._program = this._ngProgram.getTsProgram();

      this._configProgramSourceFileVersions(this._program);
      return {
        program: this._program,
        ngCompiler: this._ngProgram.compiler
      };
    }
    else {
      this._program = ts.createProgram(
        parsedTsconfig.fileNames,
        parsedTsconfig.options,
        compilerHost,
        this._program
      );

      this._configProgramSourceFileVersions(this._program);

      return { program: this._program };
    }
  }

  private _configProgramSourceFileVersions(program: ts.Program): void {
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
  }

  private _createCacheCompilerHost(parsedTsconfig: ts.ParsedCommandLine): ts.CompilerHost {
    if (!this._moduleResolutionCache) {
      this._moduleResolutionCache = ts.createModuleResolutionCache(this._rootPath, (s) => s, parsedTsconfig.options);
    }

    const compilerHost = SdCliCacheCompilerHost.create(
      parsedTsconfig,
      this._moduleResolutionCache,
      this._fileCache,
      this._writeFileCache
    );

    if (this._isAngular) {
      return SdCliNgCacheCompilerHost.wrap(compilerHost, this._fileCache);
    }
    else {
      return compilerHost;
    }
  }

  private _getNpmConfig(pkgPath: string): INpmConfig | undefined {
    if (!this._npmConfigMap.has(pkgPath)) {
      this._npmConfigMap.set(pkgPath, FsUtil.readJson(path.resolve(pkgPath, "package.json")));
    }
    return this._npmConfigMap.get(pkgPath);
  }
}

interface IFileCache {
  exists?: boolean;
  sourceFile?: ts.SourceFile;
  content?: string;
  styleContent?: string;
}

interface ISdBuildPack {
  program: ts.Program;
  ngCompiler?: NgCompiler;
  builder: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  affectedSourceFiles: ts.SourceFile[];
}
