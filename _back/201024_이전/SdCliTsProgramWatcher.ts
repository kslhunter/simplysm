import * as ts from "typescript";
import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import * as fs from "fs";
import { NeverEntryError, ObjectUtil, Uuid, Wait } from "@simplysm/sd-core-common";
import { SdCliPathUtil } from "../..";

/**
 * TS Program의 WATCH 모듈
 */
export class SdCliTsProgramWatcher {
  private readonly _fileCacheMap = new Map<string, IFileCache>();

  private _assignFileCache(filePath: string, cache: IFileCache): void {
    if (this._fileCacheMap.has(filePath)) {
      const prevCache = this._fileCacheMap.get(filePath)!;
      for (const key of Object.keys(cache)) {
        prevCache[key] = cache[key];
      }
    }
    else {
      this._fileCacheMap.set(filePath, cache);
    }
  }

  public constructor(private readonly _rootPath: string,
                     private readonly _target: "node" | "browser" | undefined) {
  }

  public async watchAsync(callback: (program: ts.Program, changeInfos: ISdTsProgramChangeInfo[]) => (void | Promise<void>)): Promise<void> {
    // TSCONFIG 읽기
    const tsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this._rootPath, this._target);
    const tsconfig = await FsUtil.readJsonAsync(tsconfigFilePath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);

    // HOST 구성
    const host = this._getCompilerWatchHost(parsedTsconfig);

    // PROGRAM 생성
    let program = ts.createProgram(
      parsedTsconfig.fileNames,
      parsedTsconfig.options,
      host
    );
    // 모든 Dependency 목록 구성
    let allDependencyFilePathMap = this._getAllDependencyFilePathMap();

    // 로드된 전체 파일 목록
    let loadedFilePaths = parsedTsconfig.fileNames.map((item) => path.normalize(item))
      .concat(Array.from(allDependencyFilePathMap.values()).mapMany())
      .distinct();

    // afterCompile 이벤트 발생
    await callback(
      program,
      loadedFilePaths
        .filter((filePath) => FsUtil.exists(filePath))
        .map((filePath) => ({ eventType: "change", filePath }))
    );

    // PROGRAM에 관련된 것으로 보이는 모든 파일을 WATCH로 구성
    await new Promise<void>((resolve, reject) => {
      let watchTimeout: NodeJS.Timeout;
      let isProcessing = false;
      let lastProcUuid = Uuid.new();

      let changeFilePathsQueue: string[] = [];

      const watcher = fs.watch(
        process.cwd(),
        { recursive: true },
        async (event, filename: string | null) => {
          if (filename == null) return;

          // 디렉토리 무시
          const filePath = path.resolve(process.cwd(), filename);
          if (FsUtil.exists(filePath) && await FsUtil.isDirectoryAsync(filePath)) {
            return;
          }

          // 변경파일 큐에 파일을 기록
          if (!changeFilePathsQueue.includes(filePath)) {
            changeFilePathsQueue.push(filePath);
          }

          const currProcUuid = Uuid.new();
          lastProcUuid = currProcUuid;

          clearTimeout(watchTimeout);
          watchTimeout = setTimeout(async () => {
            await Wait.true(() => !isProcessing);
            if (lastProcUuid !== currProcUuid) return;
            isProcessing = true;

            // 변경파일 큐에 쌓인 파일들을 클론하고, 다시 쌓일 수 있게 비움
            const changeFilePaths = ObjectUtil.clone(changeFilePathsQueue);
            changeFilePathsQueue = [];

            // 변경파일들이 전부 패키지가 사용하는 파일이 아니면, 로직을 수행하지 않음
            if (changeFilePaths.every((changeFilePath) => !loadedFilePaths.includes(changeFilePath))) {
              isProcessing = false;
              return;
            }

            // 변경파일들의 캐시를 비움 (다시 로딩될 수 있도록)
            for (const changeFilePath of changeFilePaths) {
              this._fileCacheMap.delete(changeFilePath);
            }

            // 변경된 파일을 IMPORT하고 있는 다른 파일들도 캐시를 비움 (다시 로딩될 수 있도록)
            const reverseDependencyFilePaths = changeFilePaths
              .mapMany((changeFilePath) => this._getAllReverseDependencyFilePaths(allDependencyFilePathMap, changeFilePath))
              .distinct();
            for (const reverseDependencyFilePath of reverseDependencyFilePaths) {
              this._fileCacheMap.delete(reverseDependencyFilePath);
            }

            // program 재 구성 (파일 캐시가 다시 형성됨)
            program = ts.createProgram(
              parsedTsconfig.fileNames,
              parsedTsconfig.options,
              host,
              program
            );

            // 모든 Dependency 목록 구성
            allDependencyFilePathMap = this._getAllDependencyFilePathMap();

            // 1. 이전 패키지가 로딩했던 파일목록,
            // 2. 현재 패키지가 로딩한 파일목록,
            // 3. 현재 변경된 파일
            // 을 사용하여, 변동파일 목록을 만듬
            const prevLoadedFilePaths = ObjectUtil.clone(loadedFilePaths);
            loadedFilePaths = parsedTsconfig.fileNames.map((item) => path.normalize(item))
              .concat(Array.from(allDependencyFilePathMap.values()).mapMany())
              .distinct();

            const changeInfos: ISdTsProgramChangeInfo[] = [];
            const diffs = prevLoadedFilePaths.diffs(loadedFilePaths);
            for (const diff of diffs) {
              // ADD
              if (diff.source === undefined) {
                changeInfos.push({ eventType: "change", filePath: diff.target });
              }
              // DELETE
              else if (diff.target === undefined) {
                changeInfos.push({ eventType: "unlink", filePath: diff.source });
              }
            }

            // 반환파일 목록에 유효한 변경파일 목록 추가
            const validFilePaths = loadedFilePaths.concat(prevLoadedFilePaths);
            for (const changeFilePath of changeFilePaths) {
              if (validFilePaths.includes(changeFilePath) && !changeInfos.some((item) => item.filePath === changeFilePath)) {
                changeInfos.push({
                  eventType: FsUtil.exists(changeFilePath) ? "change" : "unlink",
                  filePath: changeFilePath
                });
              }
            }

            // 반환파일 목록에 유효한 변경파일을 IMPORT하는 다른 파일들 추가
            for (const changeFilePath of reverseDependencyFilePaths) {
              if (!changeFilePaths.includes(changeFilePath)) {
                changeInfos.push({ eventType: "dependency", filePath: changeFilePath });
              }
            }

            // 반환파일 목록이 존재하면, 반환
            if (changeInfos.length > 0) {
              await callback(program, changeInfos);
            }

            isProcessing = false;
          }, 300);
        }
      );

      watcher.on("error", (error) => {
        reject(error);
      });

      resolve();
    });
  }

  private _getCompilerWatchHost(parsedTsconfig: ts.ParsedCommandLine): ts.CompilerHost {
    const host = ts.createCompilerHost(parsedTsconfig.options, true);

    const origReadFile = host.readFile;
    host.readFile = (fileName) => {
      const filePath = path.normalize(fileName);

      const cache = this._fileCacheMap.get(filePath)?.content;
      if (cache !== undefined) return cache;

      const content = origReadFile(fileName);
      this._assignFileCache(filePath, { content });
      return content;
    };

    const origFileExists = host.fileExists;
    host.fileExists = (fileName) => {
      const filePath = path.normalize(fileName);

      const cache = this._fileCacheMap.get(filePath)?.isExists;
      if (cache !== undefined) return cache;

      const isExists = origFileExists(fileName);
      this._assignFileCache(filePath, { isExists });
      return isExists;
    };

    const origGetSourceFile = host.getSourceFile;
    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      const filePath = path.normalize(fileName);

      let sourceFile: ts.SourceFile | undefined;

      // source file
      const sourceFileCache = this._fileCacheMap.get(filePath)?.sourceFile;
      if (sourceFileCache !== undefined) {
        sourceFile = sourceFileCache;
      }
      else {
        sourceFile = origGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        this._assignFileCache(filePath, { sourceFile });
      }

      // imports
      if (sourceFile) {
        const importExportDefCache = this._fileCacheMap.get(filePath)?.importExportDef;
        if (importExportDefCache === undefined) {
          const importExportDef = this._getImportExportDef(host, sourceFile, parsedTsconfig.options, languageVersion);
          this._assignFileCache(filePath, { importExportDef });
        }
      }
      else {
        this._assignFileCache(filePath, { importExportDef: undefined });
      }

      return sourceFile;
    };

    return host;
  }

  private _getImportExportDef(compilerHost: ts.CompilerHost,
                              sourceFile: ts.SourceFile,
                              compilerOptions: ts.CompilerOptions,
                              languageVersion: ts.ScriptTarget): IImportExportDef {
    const result: IImportExportDef = {
      imports: [],
      exports: []
    };

    for (const statement of sourceFile.statements) {
      if (
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier !== undefined &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        // filePath
        const moduleName = statement.moduleSpecifier.text;
        const moduleFilePath = ts.resolveModuleName(
          moduleName,
          sourceFile.fileName,
          compilerOptions,
          compilerHost
        ).resolvedModule?.resolvedFileName;

        let filePath: string;
        if (moduleFilePath !== undefined) {
          filePath = path.normalize(moduleFilePath);
        }
        else if (moduleName.startsWith(".")) {
          const dirname = path.dirname(sourceFile.fileName);
          const extname = path.extname(sourceFile.fileName);
          filePath = path.resolve(dirname, moduleName + extname);
        }
        else { // 모듈 없음
          // 이미 check에서 오류 발생했거나, nodejs 내부 컴포넌트이므로 무시해도됨
          continue;
        }

        // targetNames
        if (ts.isImportDeclaration(statement)) {
          const importNamedBindings = statement.importClause?.namedBindings;
          if (importNamedBindings) {
            // import { Test } from "./Test"
            if (ts.isNamedImports(importNamedBindings)) {
              result.imports.push({
                type: "named",
                filePath,
                targetNames: importNamedBindings.elements.map((item) => item.name.text)
              });
            }
            // import * as test from "./Test"
            else if (ts.isNamespaceImport(importNamedBindings)) {
              result.imports.push({
                type: "namespace",
                filePath
              });
            }
            else {
              throw new NeverEntryError();
            }
          }
          // import "./Test"
          else {
            result.imports.push({
              type: "all",
              filePath
            });
          }
        }
        else if (ts.isExportDeclaration(statement)) {
          const exportNamedBindings = statement.exportClause;
          if (exportNamedBindings) {
            // export { Test } from "./Test"
            if (ts.isNamedExports(exportNamedBindings)) {
              result.exports.push({
                type: "named",
                filePath,
                targetNames: exportNamedBindings.elements.map((item) => item.name.text)
              });
            }
            // NEVER
            else {
              throw new NeverEntryError();
            }
          }
          // export * from "./Test"
          else {
            const childSourceFile = compilerHost.getSourceFile(filePath, languageVersion);
            if (childSourceFile) {
              result.exports.push({
                type: "all",
                filePath,
                targetNames: this._getExportNames(childSourceFile)
              });
            }
          }
        }
        else {
          throw new NeverEntryError();
        }
      }
    }

    return result;
  }

  private _getAllDependencyFilePathMap(): Map<string, string[]> {
    const resultMap = new Map<string, string[]>();

    const filePaths = Array.from(this._fileCacheMap.keys());
    for (const filePath of filePaths) {
      if (!FsUtil.exists(filePath)) continue;
      const dependencies = this._getAllDependencyFilePaths(filePath);
      resultMap.set(filePath, dependencies);
    }

    return resultMap;
  }

  private _getAllDependencyFilePaths(rootFilePath: string): string[] {
    const results: string[] = [rootFilePath + "|"];
    const addResult = (filePath: string, targetName?: string): void => {
      const key = filePath + "|" + (targetName ?? "");
      if (!results.includes(key)) {
        results.push(key);
      }
    };

    let cursor = 0;
    while (true) {
      const key = results[cursor];
      if (!key) break;
      cursor++;

      const split = key.split("|");
      const filePath = split[0];
      const targetName = split[1];

      const importExportDef = this._fileCacheMap.get(filePath)?.importExportDef;
      if (!importExportDef) continue;

      for (const importDef of importExportDef.imports) {
        if (importDef.type === "all") {
          addResult(importDef.filePath);
        }
        else if (importDef.type === "named") {
          if (targetName) continue;
          for (const importTargetName of importDef.targetNames!) {
            addResult(importDef.filePath, importTargetName);
          }
        }
        else { // namespace
          if (targetName) continue;
          addResult(importDef.filePath);
        }
      }

      for (const exportDef of importExportDef.exports) {
        if (!targetName) {
          for (const exportTargetName of exportDef.targetNames) {
            addResult(exportDef.filePath, exportTargetName);
          }
        }
        else {
          if (!exportDef.targetNames.includes(targetName)) continue;
          addResult(exportDef.filePath, targetName);
        }
      }
    }

    return results
      .remove((item) => item.startsWith(rootFilePath + "|"))
      .map((item) => item.split("|")[0])
      .distinct();
  }

  private _getAllReverseDependencyFilePaths(allDependencyFilePathMap: Map<string, string[]>, filePath: string): string[] {
    return Array.from(allDependencyFilePathMap.keys()).filter((key) => allDependencyFilePathMap.get(key)!.includes(filePath));
  }

  private _getExportNames(sourceFile: ts.SourceFile): string[] {
    const result: string[] = [];

    this._travelNodes(sourceFile, (node) => {
      if (node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)) {
        if (node.kind === ts.SyntaxKind.VariableStatement) {
          result.push(
            ...(node as ts.VariableStatement).declarationList.declarations
              .map((decl) => (decl as any).name.text)
          );
        }
        else if ("name" in node) {
          result.push((node as any).name.text);
        }
        else {
          throw new NeverEntryError();
        }
      }
    });

    return result;
  }

  private _travelNodes(node: ts.Node, callback: (node: ts.Node) => void): void {
    node.forEachChild((childNode) => {
      callback(childNode);
      this._travelNodes(childNode, callback);
    });
  }
}

interface IFileCache {
  content?: string;
  isExists?: boolean;
  sourceFile?: ts.SourceFile;
  importExportDef?: IImportExportDef;
}

export interface ISdTsProgramChangeInfo {
  eventType: "change" | "unlink" | "dependency";
  filePath: string;
}

interface IImportDef {
  type: "namespace" | "named" | "all";
  filePath: string;
  targetNames?: string[]; // type = "named"일때만 입력됨
}

interface IExportDef {
  type: "named" | "all";
  filePath: string;
  targetNames: string[];
}

interface IImportExportDef {
  imports: IImportDef[];
  exports: IExportDef[];
}