import * as ts from "typescript";
import * as path from "path";
import { FsUtil, Logger } from "@simplysm/sd-core-node";
import { NeverEntryError, Wait } from "@simplysm/sd-core-common";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { SdAngularUtil } from "../utils/SdAngularUtil";
import { ITsConfig } from "../commons";
import anymatch from "anymatch";

/**
 * TS Program의 WATCH 모듈
 */
export class SdCliTsProgramWatcher {
  // private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, path.basename(this._rootPath), ...this._target ? [this._target] : []]);

  private readonly _fileCacheMap = new Map<string, IFileCache>();
  private readonly _outputFileCacheMap = new Map<string, string>();

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
                     private readonly _target: "node" | "browser" | undefined,
                     private readonly _useAngularSassParser: boolean,
                     private readonly _logger: Logger) {
  }

  public deleteOutputFileCache(filePath: string): void {
    this._outputFileCacheMap.delete(filePath);
  }

  public async watchAsync(callback: (program: ts.Program, changeInfos: ISdTsProgramChangeInfo[]) => (void | Promise<void>)): Promise<void> {
    let isProcessing = true;

    // PROGRAM에 관련된 것으로 보이는 모든 파일을 WATCH로 구성
    const watcher = await FsUtil.watchAsync(
      path.resolve(SdCliPathUtil.getSourcePath(this._rootPath), "**", "*.ts"),
      async (origChangeInfos) => {
        await Wait.true(() => !isProcessing);

        const changeFilePaths = origChangeInfos.map((item) => item.filePath);

        // 변경파일들의 캐시를 비움 (다시 로딩될 수 있도록)
        for (const changeFilePath of changeFilePaths) {
          this._fileCacheMap.delete(changeFilePath);
        }

        const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);
        const rootFilePaths = parsedTsconfig.fileNames.map((item) => path.normalize(item));
        const currentFilePaths = loadedFilePaths.concat(rootFilePaths).distinct();

        // 유효한 파일이 하나도 포함되어있지 않으면 무시
        if (changeFilePaths.every((item) => !currentFilePaths.includes(item))) {
          return;
        }

        this._logger.debug("변경감지");

        // 변경된 파일을 IMPORT하고 있는 다른 파일들도 캐시를 비움 (다시 로딩될 수 있도록)
        const reverseDependencyFilePaths = changeFilePaths
          .mapMany((changeFilePath) => this._getAllReverseDependencyFilePaths(program, currentFilePaths, changeFilePath))
          .distinct();
        for (const reverseDependencyFilePath of reverseDependencyFilePaths) {
          this._fileCacheMap.delete(reverseDependencyFilePath);
          // exports의 Target을 못찾았을 수 있어 import/export 도 다시 읽어야함
          // this._assignFileCache(reverseDependencyFilePath, { sourceFile: undefined });
        }
        this._logger.debug("변경감지: REV 의존성 매핑");

        // program 재 구성 (파일 캐시가 다시 형성됨)
        program = ts.createProgram(
          parsedTsconfig.fileNames,
          parsedTsconfig.options,
          host,
          program
        );
        this._logger.debug("변경감지: 프로그램 재구성");

        const prevLoadedFilePaths = [...loadedFilePaths];
        // 로드된 전체 파일 목록
        loadedFilePaths = rootFilePaths
          .concat(this._getAllDependencyFilePaths(...rootFilePaths.map((item) => path.normalize(item))))
          .distinct();
        this._logger.debug("변경감지: 읽힌 파일 목록 구성 (" + rootFilePaths.length + " => " + loadedFilePaths.length);

        const changeInfos: ISdTsProgramChangeInfo[] = [];
        const diffs = prevLoadedFilePaths.diffs(loadedFilePaths);
        for (const diff of diffs) {
          // ADD
          if (diff.source === undefined) {
            changeInfos.push({ eventType: "add", filePath: diff.target });
          }
          // DELETE
          else if (diff.target === undefined) {
            changeInfos.push({ eventType: "unlink", filePath: diff.source });
          }
        }

        // 반환파일 목록에 유효한 변경파일 목록 추가
        const validFilePaths = currentFilePaths.concat(prevLoadedFilePaths);
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
        this._logger.debug("변경감지: 변경파일 목록 구성");

        // chokidar add/unwatch 파일 구성
        for (const changeInfo of changeInfos) {
          if (changeInfo.eventType === "add") {
            if (!anymatch(
              path.resolve(SdCliPathUtil.getSourcePath(this._rootPath), "**", "*.ts"),
              changeInfo.filePath
            )) {
              watcher.add(changeInfo.filePath);
            }
          }
          else if (changeInfo.eventType === "unlink") {
            if (!anymatch(
              path.resolve(SdCliPathUtil.getSourcePath(this._rootPath), "**", "*.ts"),
              changeInfo.filePath
            )) {
              watcher.unwatch(changeInfo.filePath);
            }
          }
        }
        this._logger.debug("변경감지: 감지파일 목록 편집");

        // 반환파일 목록이 존재하면, 반환
        if (changeInfos.length > 0) {
          await callback(program, changeInfos.distinct());
        }
      },
      (err) => {
        this._logger.error(err);
      },
      {
        ignoreDirectory: true,
        aggregateTimeout: 300
      }
    );

    // TSCONFIG 읽기
    const tsconfigFilePath = SdCliPathUtil.getTsConfigBuildFilePath(this._rootPath, this._target);
    const tsconfig: ITsConfig = await FsUtil.readJsonAsync(tsconfigFilePath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._rootPath);

    // HOST 구성
    const host = this._getCompilerWatchHost(parsedTsconfig);

    // PROGRAM 생성
    let program = ts.createProgram(
      parsedTsconfig.fileNames,
      parsedTsconfig.options,
      host
    );
    // 로드된 전체 파일 목록
    const rootFilePaths = parsedTsconfig.fileNames.map((item) => path.normalize(item));
    let loadedFilePaths = rootFilePaths
      .concat(this._getAllDependencyFilePaths(...rootFilePaths.map((item) => path.normalize(item))))
      .distinct();

    watcher.add(loadedFilePaths);

    // afterCompile 이벤트 발생
    await callback(
      program,
      loadedFilePaths
        .filter((filePath) => FsUtil.exists(filePath))
        .map((filePath) => ({ eventType: "change", filePath }))
    );

    isProcessing = false;
  }

  private _getCompilerWatchHost(parsedTsconfig: ts.ParsedCommandLine): ts.CompilerHost {
    const host = ts.createCompilerHost(parsedTsconfig.options, true);

    const origWriteFile = host.writeFile;
    host.writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
      const filePath = path.normalize(fileName);

      const cache = this._outputFileCacheMap.get(filePath);
      if (cache === data) return;

      origWriteFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
      this._outputFileCacheMap.set(filePath, data);
    };

    const origReadFile = host.readFile;
    host.readFile = (fileName) => {
      const filePath = path.normalize(fileName);

      const cache = this._fileCacheMap.get(filePath)?.content;
      if (cache !== undefined) return cache;

      let content = origReadFile(fileName);

      // 필요 시, SCSS 변환
      if (this._useAngularSassParser && content !== undefined && content !== "") {
        const replaceResult = SdAngularUtil.replaceScssToCss(filePath, content);
        content = replaceResult.content;
        this._assignFileCache(filePath, { content, externalDependencies: replaceResult.dependencies });
      }
      else {
        this._assignFileCache(filePath, { content });
      }
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
          const importExportDef = this._getImportExportDef(host, sourceFile, parsedTsconfig.options);
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
                              compilerOptions: ts.CompilerOptions): IImportExportDef {
    const result: IImportExportDef = {
      imports: [],
      exports: []
    };

    for (const statement of sourceFile.statements) {
      if (
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))
        && statement.moduleSpecifier !== undefined
        && ts.isStringLiteral(statement.moduleSpecifier)
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
                filePath,
                targetNames: importNamedBindings.name.text ? [importNamedBindings.name.text] : undefined
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
              // TODO: 아래 경우에 대한 Dependency 추출 부분 최적화 필요
            // export * as Test from "./Test"
            else if (ts.isNamespaceExport(exportNamedBindings)) {
              result.exports.push({
                type: "namespace",
                filePath,
                targetNames: exportNamedBindings.name.text ? [exportNamedBindings.name.text] : undefined
              });
            }
            // NEVER
            else {
              throw new NeverEntryError();
            }
          }
          // export * from "./Test"
          else {
            result.exports.push({
              type: "namespace",
              filePath
            });
          }
        }
        else {
          throw new NeverEntryError();
        }
      }
    }

    return result;
  }

  private _getAllDependencyFilePaths(...rootFilePaths: string[]): string[] {
    const results: string[] = [...rootFilePaths];
    const addResult = (filePath: string): void => {
      if (!results.includes(filePath)) {
        results.push(filePath);
      }
    };

    let cursor = 0;
    while (true) {
      const filePath = results[cursor];
      if (!filePath) break;
      cursor++;

      const importExportDef = this._fileCacheMap.get(filePath)?.importExportDef;

      if (importExportDef) {
        for (const importDef of importExportDef.imports) {
          addResult(importDef.filePath);
        }

        for (const exportDef of importExportDef.exports) {
          addResult(exportDef.filePath);
        }
      }

      const externalDependencies = this._fileCacheMap.get(filePath)?.externalDependencies;
      if (externalDependencies) {
        for (const externalDependency of externalDependencies) {
          addResult(externalDependency);
        }
      }
    }

    return results
      .remove((item) => rootFilePaths.some((item1) => item.startsWith(item1 + "|")))
      .map((item) => item.split("|")[0])
      .distinct();
  }

  /*private _getAllDependencyFilePaths(program: ts.Program, ...rootFilePaths: string[]): string[] {
    const results: string[] = rootFilePaths.map((item) => item + "|");
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

      if (importExportDef) {
        if (!targetName) {
          for (const importDef of importExportDef.imports) {
            if (importDef.type === "named") {
              addResult(importDef.filePath);
            }
            else if (importDef.type === "all") {
              addResult(importDef.filePath);
            }
            else { // namespace
              addResult(importDef.filePath);
            }
          }

          for (const exportDef of importExportDef.exports) {
            const exportTargetNames = exportDef.targetNames ?? this._getExportNames(program, exportDef.filePath);

            if (exportTargetNames) {
              for (const exportTargetName of exportTargetNames) {
                addResult(exportDef.filePath, exportTargetName);
              }
            }
            else {
              addResult(exportDef.filePath);
            }
          }
        }
        else {
          let isMappedByExport = false;
          for (const exportDef of importExportDef.exports) {
            const exportTargetNames = exportDef.targetNames ?? this._getExportNames(program, exportDef.filePath);

            if (exportTargetNames === undefined) {
              addResult(exportDef.filePath);
            }
            else if (exportTargetNames.includes(targetName)) {
              addResult(exportDef.filePath, targetName);
              isMappedByExport = true;
            }
          }

          if (!isMappedByExport) {
            for (const importDef of importExportDef.imports) {
              if (importDef.type === "named") {
                addResult(importDef.filePath, targetName);
              }
              else if (importDef.type === "all") {
                addResult(importDef.filePath);
              }
              else { // namespace
                addResult(importDef.filePath);
              }
            }
          }
        }
      }

      const externalDependencies = this._fileCacheMap.get(filePath)?.externalDependencies;
      if (externalDependencies) {
        for (const externalDependency of externalDependencies) {
          addResult(externalDependency);
        }
      }
    }

    return results
      .remove((item) => rootFilePaths.some((item1) => item.startsWith(item1 + "|")))
      .map((item) => item.split("|")[0])
      .distinct();
  }*/

  private _getAllReverseDependencyFilePaths(program: ts.Program, loadedFilePaths: string[], orgFilePath: string): string[] {
    const results: string[] = [orgFilePath + "|"];
    const addResult = (filePath: string, targetName?: string): void => {
      const key = filePath + "|" + targetName;
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

      for (const loadedFilePath of loadedFilePaths) {
        const importExportDef = this._fileCacheMap.get(loadedFilePath)?.importExportDef;
        if (importExportDef) {
          const importDef = importExportDef.imports.single((item) => item.filePath === filePath);
          const exportDef = importExportDef.exports.single((item) => item.filePath === filePath);

          if (!targetName) {
            if (importDef) {
              if (importDef.type === "all") {
                return loadedFilePaths;
              }
              else {
                addResult(loadedFilePath);
              }
            }
            if (exportDef) {
              const exportTargetNames = exportDef.targetNames ?? this._getExportNames(program, exportDef.filePath);

              if (exportTargetNames) {
                for (const exportTargetName of exportTargetNames) {
                  addResult(loadedFilePath, exportTargetName);
                }
              }
              else {
                addResult(loadedFilePath);
              }
            }
          }
          else {
            if (importDef) {
              if (importDef.type === "namespace") {
                addResult(loadedFilePath);
              }
              else if (importDef.type === "named") {
                if (importDef.targetNames?.includes(targetName)) {
                  addResult(loadedFilePath);
                }
              }
              else {
                addResult(loadedFilePath);
              }
            }
            if (exportDef) {
              const exportTargetNames = exportDef.targetNames ?? this._getExportNames(program, exportDef.filePath);

              if (exportTargetNames === undefined) {
                addResult(loadedFilePath);
              }
              else if (exportTargetNames.includes(targetName)) {
                addResult(loadedFilePath, targetName);
              }
            }
          }
        }

        const externalDependencies = this._fileCacheMap.get(loadedFilePath)?.externalDependencies;
        if (externalDependencies) {
          if (externalDependencies.includes(filePath)) {
            addResult(loadedFilePath);
          }
        }
      }
    }

    return results
      .remove((item) => item.startsWith(orgFilePath + "|"))
      .map((item) => item.split("|")[0])
      .distinct();
  }

  private _getExportNames(program: ts.Program, filePath: string): string[] | undefined {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) return undefined;

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

  /*private _getExportNames(sourceFile: ts.SourceFile): string[] {
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
  }*/

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
  externalDependencies?: string[];
}

export interface ISdTsProgramChangeInfo {
  eventType: "add" | "change" | "unlink" | "dependency";
  filePath: string;
}

interface IImportDef {
  type: "namespace" | "named" | "all";
  filePath: string;
  targetNames?: string[]; // type = "named"일때만 입력됨
}

interface IExportDef {
  type: "namespace" | "named";
  filePath: string;
  targetNames?: string[]; // type = "namespace"일때 입력 안됨
}

interface IImportExportDef {
  imports: IImportDef[];
  exports: IExportDef[];
}