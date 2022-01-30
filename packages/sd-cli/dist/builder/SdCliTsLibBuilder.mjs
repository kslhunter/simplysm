import { EventEmitter } from "events";
import ts from "typescript";
import { FsUtil, Logger, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import * as path from "path";
import { createHash } from "crypto";
import { SdBuildResultUtil } from "../utils/SdBuildResultUtil";
import { NgtscProgram } from "@angular/compiler-cli";
import sass from "sass";
import { SdCliPackageLinter } from "../build-tool/SdCliPackageLinter";
import { SdCliCacheCompilerHost } from "../build-tool/SdCliCacheCompilerHost";
import { SdCliNgCacheCompilerHost } from "../build-tool/SdCliNgCacheCompilerHost";
export class SdCliTsLibBuilder extends EventEmitter {
    constructor(_rootPath, _isAngular) {
        super();
        this._rootPath = _rootPath;
        this._isAngular = _isAngular;
        this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);
        this._fileCache = new Map();
        this._writeFileCache = new Map();
        this._linter = new SdCliPackageLinter(this._rootPath);
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    async watchAsync() {
        this.emit("change");
        // TSCONFIG 읽기
        const parsedTsconfig = await this._getParsedTsconfigAsync();
        // DIST 비우기
        await FsUtil.removeAsync(parsedTsconfig.options.outDir);
        // 프로그램 리로드
        const buildPack = this._createSdBuildPack(parsedTsconfig);
        const relatedPaths = await this.getAllRelatedPathsAsync();
        const watcher = SdFsWatcher.watch(relatedPaths);
        watcher.onChange(async (changeInfos) => {
            const changeFilePaths = changeInfos.filter((item) => ["add", "change", "unlink"].includes(item.event)).map((item) => item.path);
            if (changeFilePaths.length === 0)
                return;
            this._logger.debug("파일 변경 감지", changeInfos);
            this.emit("change");
            // 캐쉬 삭제
            for (const changeFilePath of changeFilePaths) {
                this._fileCache.delete(PathUtil.posix(changeFilePath));
            }
            // 빌드
            const watchBuildPack = this._createSdBuildPack(parsedTsconfig);
            // 린트
            const watchBuildResults = await this._runBuilderAsync(watchBuildPack.builder, watchBuildPack.ngCompiler);
            watchBuildResults.push(...await this._linter.lintAsync([
                ...watchBuildPack.affectedSourceFiles.map((item) => item.fileName),
                ...changeFilePaths
            ], watchBuildPack.program));
            const watchRelatedPaths = await this.getAllRelatedPathsAsync();
            watcher.add(watchRelatedPaths);
            this.emit("complete", watchBuildResults);
        });
        // 빌드
        const buildResults = await this._runBuilderAsync(buildPack.builder, buildPack.ngCompiler);
        // 린트
        buildResults.push(...await this._linter.lintAsync(relatedPaths, buildPack.program));
        this.emit("complete", buildResults);
    }
    async buildAsync() {
        // TSCONFIG 읽기
        const parsedTsconfig = await this._getParsedTsconfigAsync();
        // DIST 비우기
        await FsUtil.removeAsync(parsedTsconfig.options.outDir);
        // 프로그램 리로드
        const buildPack = this._createSdBuildPack(parsedTsconfig);
        // 빌드
        const buildResults = await this._runBuilderAsync(buildPack.builder, buildPack.ngCompiler);
        // 린트
        const relatedPaths = await this.getAllRelatedPathsAsync();
        buildResults.push(...await this._linter.lintAsync(relatedPaths, buildPack.program));
        return buildResults;
    }
    async getAllRelatedPathsAsync() {
        const fileCachePaths = Array.from(this._fileCache.keys());
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
    async _runBuilderAsync(builder, ngCompiler) {
        try {
            const results = [];
            const diagnostics = [];
            if (ngCompiler) {
                diagnostics.push(...ngCompiler.getOptionDiagnostics());
            }
            diagnostics.push(...builder.getOptionsDiagnostics(), ...builder.getGlobalDiagnostics());
            if (ngCompiler) {
                await ngCompiler.analyzeAsync();
            }
            for (const sourceFile of builder.getSourceFiles()) {
                if (ngCompiler?.ignoreForDiagnostics.has(sourceFile))
                    continue;
                diagnostics.push(...builder.getSyntacticDiagnostics(sourceFile), ...builder.getSemanticDiagnostics(sourceFile));
                if (ngCompiler &&
                    !sourceFile.isDeclarationFile &&
                    !ngCompiler.ignoreForEmit.has(sourceFile) &&
                    !ngCompiler.incrementalDriver.safeToSkipEmit(sourceFile)) {
                    diagnostics.push(...ngCompiler.getDiagnosticsForFile(sourceFile, 1));
                }
            }
            results.push(...diagnostics
                .filter((item) => [ts.DiagnosticCategory.Error, ts.DiagnosticCategory.Warning].includes(item.category))
                .map((item) => SdBuildResultUtil.convertDiagsToResult(item))
                .filterExists());
            if (results.some((item) => item.severity === "error")) {
                return results;
            }
            const transformers = ngCompiler?.prepareEmit().transformers;
            for (const sourceFile of builder.getSourceFiles()) {
                if (ngCompiler?.ignoreForEmit.has(sourceFile))
                    continue;
                builder.emit(sourceFile, undefined, undefined, undefined, transformers);
            }
            return results;
        }
        catch (err) {
            if (err instanceof sass.Exception) {
                const matches = err.sassStack.match(/^(.*\.sd\.scss) ([0-9]*):([0-9]*)/);
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
                        message: `스타일(${scssLine}:${scssChar}): ${message}`
                    }];
            }
            return [{
                    filePath: undefined,
                    line: undefined,
                    char: undefined,
                    code: undefined,
                    severity: "error",
                    message: err.message
                }];
        }
    }
    _createSdBuildPack(parsedTsconfig) {
        const compilerHost = this._createCacheCompilerHost(parsedTsconfig);
        const { program, ngCompiler } = this._createProgram(parsedTsconfig, compilerHost);
        this._builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(program, compilerHost, this._builder);
        const affectedSourceFileSet = new Set();
        while (true) {
            const result = this._builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
                if (ngCompiler && ngCompiler.ignoreForDiagnostics.has(sourceFile) && sourceFile.fileName.endsWith(".ngtypecheck.ts")) {
                    const orgFileName = sourceFile.fileName.slice(0, -15) + ".ts";
                    const orgSourceFile = this._builder.getSourceFile(orgFileName);
                    if (orgSourceFile) {
                        affectedSourceFileSet.add(orgSourceFile);
                    }
                    return true;
                }
                return false;
            });
            if (!result)
                break;
            affectedSourceFileSet.add(result.affected);
        }
        return {
            program,
            ngCompiler,
            builder: this._builder,
            affectedSourceFiles: Array.from(affectedSourceFileSet.values())
        };
    }
    _createProgram(parsedTsconfig, compilerHost) {
        if (this._isAngular) {
            this._ngProgram = new NgtscProgram(parsedTsconfig.fileNames, parsedTsconfig.options, compilerHost, this._ngProgram);
            this._program = this._ngProgram.getTsProgram();
            this._configProgramSourceFileVersions(this._program);
            return {
                program: this._program,
                ngCompiler: this._ngProgram.compiler
            };
        }
        else {
            this._program = ts.createProgram(parsedTsconfig.fileNames, parsedTsconfig.options, compilerHost, this._program);
            this._configProgramSourceFileVersions(this._program);
            return { program: this._program };
        }
    }
    _configProgramSourceFileVersions(program) {
        const baseGetSourceFiles = program.getSourceFiles;
        program.getSourceFiles = function (...parameters) {
            const files = baseGetSourceFiles(...parameters);
            for (const file of files) {
                if (file.version === undefined) {
                    file.version = createHash("sha256").update(file.text).digest("hex");
                }
            }
            return files;
        };
    }
    _createCacheCompilerHost(parsedTsconfig) {
        if (!this._moduleResolutionCache) {
            this._moduleResolutionCache = ts.createModuleResolutionCache(this._rootPath, (s) => s, parsedTsconfig.options);
        }
        const compilerHost = SdCliCacheCompilerHost.create(parsedTsconfig, this._moduleResolutionCache, this._fileCache, this._writeFileCache);
        if (this._isAngular) {
            return SdCliNgCacheCompilerHost.wrap(compilerHost, this._fileCache);
        }
        else {
            return compilerHost;
        }
    }
    async _getParsedTsconfigAsync() {
        const tsconfigFilePath = path.resolve(this._rootPath, "tsconfig-build.json");
        const tsconfig = await FsUtil.readJsonAsync(tsconfigFilePath);
        return ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RDbGlUc0xpYkJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYnVpbGRlci9TZENsaVRzTGliQnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM1QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0UsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNwQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDckQsT0FBTyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQ3hCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBR2xGLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxZQUFZO0lBY2pELFlBQW9DLFNBQVMsRUFDVCxVQUFtQjtRQUNyRCxLQUFLLEVBQUUsQ0FBQztRQUYwQixjQUFTLEdBQVQsU0FBUyxDQUFBO1FBQ1QsZUFBVSxHQUFWLFVBQVUsQ0FBUztRQWR0QyxZQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBTXBFLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztRQUMzQyxvQkFBZSxHQUFHLElB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