import * as path from "path";
import * as ts from "typescript";
import anymatch from "anymatch";
import {FsUtils, FsWatcher, IFileChangeInfo, Logger} from "@simplysm/sd-core-node";
import {ISdPackageBuildResult} from "./SdPackageBuilder";
import {SdAngularUtils} from "./SdAngularUtils";
import {EventEmitter} from "events";
import {ITsConfig} from "../commons";
import {ObjectUtils, SdError} from "@simplysm/sd-core-common";

export class SdTypescriptProgramRunner extends EventEmitter {
  private readonly _logger = Logger.get([
    "simplysm",
    "sd-cli",
    "package-builder",
    this._packageName,
    ...(this._target !== undefined ? [this._target] : [])
  ]);

  private _fileInfoMapObj: { [filePath: string]: IFileInfo } = {};
  private readonly _outputCache: { [key: string]: string | undefined } = {};

  private _host?: ts.CompilerHost;

  public program?: ts.Program;

  private _getParsedTsConfig(): ts.ParsedCommandLine {
    return ts.parseJsonConfigFileContent(this._tsConfig, ts.sys, this._rootPath);
  }

  public constructor(private readonly _packageName: string,
                     private readonly _target: string | undefined,
                     private readonly _rootPath: string,
                     private readonly _tsConfig: ITsConfig) {
    super();
  }

  public on(event: "change", listener: (filePaths?: string[]) => void): this;
  public on(event: "complete", listener: (results: ISdPackageBuildResult[]) => void): this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public async runAsync(watch: boolean,
                        logicFn: (changedInfos: IFileChangeInfo[]) => (Promise<ISdPackageBuildResult[]> | ISdPackageBuildResult[])): Promise<void> {
    // 타입스크립트 프로그램 정의
    this._reloadProgram();

    // 파일 목록 구성
    const filePaths = Object.keys(this._fileInfoMapObj)
      .concat(...Object.values(this._fileInfoMapObj).mapMany(v => v.scssDependencies))
      .concat(...Object.values(this._fileInfoMapObj).mapMany(v => this._getDependencies(v.sourceFile!)))
      .distinct();

    if (watch) {
      const parsedTsConfig = this._getParsedTsConfig();

      const srcPath = parsedTsConfig.options.rootDir !== undefined ?
        path.resolve(parsedTsConfig.options.rootDir) :
        path.resolve(this._rootPath, "src");

      // 파일 감지할 목록 구성
      let watchFilePaths = ObjectUtils.clone(filePaths);
      const anyMatchPath = path.resolve(srcPath, "**", "*.ts");
      if (this._tsConfig.files === undefined) {
        watchFilePaths.remove(item => anymatch(anyMatchPath.replace(/\\/g, "/"), item.replace(/\\/g, "/")));
        watchFilePaths.insert(0, anyMatchPath);
      }

      // 의존성에 따른 파일 와치 구성
      const watcher = await FsWatcher.watchAsync(watchFilePaths, async changedInfos => {
        this._logger.debug("변경감지...");

        // 변경 파일 목록을 의존성에 따라 재 설정 + 파일 변경 플래그 처리
        let newChangedInfos: IFileChangeInfo[] = [];
        for (const changedInfo of changedInfos) {
          newChangedInfos.push(changedInfo);

          if (this._fileInfoMapObj[changedInfo.filePath]) {
            this._fileInfoMapObj[changedInfo.filePath].changed = true;
          }

          const scssRelatedFilePaths = Object.keys(this._fileInfoMapObj)
            .filter(key => this._fileInfoMapObj[key].scssDependencies.includes(changedInfo.filePath));
          for (const scssRelatedFilePath of scssRelatedFilePaths) {
            this._fileInfoMapObj[scssRelatedFilePath].changedByScss = true;
            newChangedInfos.push({type: "change", filePath: scssRelatedFilePath});
          }
        }

        // 타입스크립트 프로그램 재 정의
        this._reloadProgram(this.program);

        // 변경 파일 목록을 의존성에 따라 재 설정
        for (const changedInfo of changedInfos) {
          const relatedFilePaths = this._getAllRelatedFilePaths(changedInfo.filePath);
          for (const relatedFilePath of relatedFilePaths) {
            newChangedInfos.push({type: "change", filePath: relatedFilePath});
          }
        }

        // 변경 이벤트 알림
        newChangedInfos = newChangedInfos.distinct();
        this.emit("change", newChangedInfos.map(item => item.filePath).distinct());

        // 새로 추가된 파일들 감지 목록에 추가
        let newWatchFilePaths = Object.keys(this._fileInfoMapObj)
          .concat(...Object.values(this._fileInfoMapObj).mapMany(v => v.scssDependencies));

        newWatchFilePaths = newWatchFilePaths
          .concat(...Object.values(this._fileInfoMapObj).mapMany(v => this._getDependencies(v.sourceFile!)))
          .distinct().filter(item => !watchFilePaths.includes(item));

        if (this._tsConfig.files === undefined) {
          newWatchFilePaths.remove(item => anymatch(anyMatchPath.replace(/\\/g, "/"), item.replace(/\\/g, "/")));
          if (!watchFilePaths.includes(anyMatchPath)) {
            watchFilePaths.insert(0, anyMatchPath);
          }
        }

        if (newWatchFilePaths.length > 0) {
          watcher.add(newWatchFilePaths);
          watchFilePaths = watchFilePaths.concat(...newWatchFilePaths);
        }

        // 로직 수행
        const results = await logicFn(newChangedInfos);
        this.emit("complete", results);
      }, err => {
        this._logger.error(err);
      });
    }
    else {
      // 최초 변경 이벤트 알림
      const firstChangeInfos = filePaths.map(item => ({type: "add" as const, filePath: item}));
      this.emit("change", firstChangeInfos.map(item => item.filePath));

      // 로직 수행
      const results = await logicFn(firstChangeInfos);
      this.emit("complete", results);
    }
  }

  private _reloadProgram(oldProgram?: ts.Program): void {
    const parsedTsConfig = this._getParsedTsConfig();

    if (!oldProgram) {
      this._host = ts.createCompilerHost(parsedTsConfig.options);

      const prevWriteFile = this._host.writeFile;
      this._host.writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles1): void => {
        if (
          this._outputCache[fileName] === undefined &&
          FsUtils.exists(fileName)
        ) {
          this._outputCache[fileName] = FsUtils.readFile(fileName);
        }

        if (this._outputCache[fileName] !== data) {
          this._outputCache[fileName] = data;
          prevWriteFile(fileName, data, writeByteOrderMark, onError, sourceFiles1);
        }
      };

      const prevReadFile = this._host.readFile;
      this._host.readFile = (fileName: string): string | undefined => {
        const filePath = path.resolve(fileName);

        if (
          this._fileInfoMapObj[filePath] &&
          !this._fileInfoMapObj[filePath].changed &&
          !this._fileInfoMapObj[filePath].changedByScss
        ) {
          return this._fileInfoMapObj[filePath].content;
        }

        const orgContent = (this._fileInfoMapObj[filePath] && !this._fileInfoMapObj[filePath].changed) ?
          this._fileInfoMapObj[filePath].orgContent :
          prevReadFile(fileName);

        if (orgContent === undefined) {
          delete this._fileInfoMapObj[filePath];
          return undefined;
        }

        try {
          const scssResult = SdAngularUtils.replaceScssToCss(filePath, orgContent);
          const content = scssResult.content;
          const scssDependencies = scssResult.dependencies.map(item => path.resolve(item));

          this._fileInfoMapObj[filePath] = {
            orgContent,
            content,

            changed: false,
            changedByScss: false,

            scssDependencies
          };

          return content;
        }
        catch (err) {
          this._logger.error(filePath + ": " + err.message);

          this._fileInfoMapObj[filePath] = {
            orgContent,
            content: orgContent,

            changed: false,
            changedByScss: false,

            scssDependencies: []
          };

          return orgContent;
        }
      };

      const prevGetSourceFile = this._host.getSourceFile;
      this._host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile): ts.SourceFile | undefined => {
        const filePath = path.resolve(fileName);

        try {
          if (
            this._fileInfoMapObj[filePath] &&
            this._fileInfoMapObj[filePath].sourceFile !== undefined &&
            !this._fileInfoMapObj[filePath].changed &&
            !this._fileInfoMapObj[filePath].changedByScss
          ) {
            return this._fileInfoMapObj[filePath].sourceFile;
          }

          const sourceFile = prevGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);

          this._fileInfoMapObj[filePath].sourceFile = sourceFile;

          return sourceFile;
        }
        catch (err) {
          throw new SdError(err, filePath);
        }
      };

      // 타입스크립트 프로그램 정의
      this.program = ts.createProgram({
        rootNames: parsedTsConfig.fileNames,
        options: parsedTsConfig.options,
        host: this._host
      });
    }
    else {
      this.program = ts.createProgram({
        rootNames: parsedTsConfig.fileNames,
        options: parsedTsConfig.options,
        host: this._host,
        oldProgram
      });
    }

    const noSourceFileKeys = Object.keys(this._fileInfoMapObj).filter(key => this._fileInfoMapObj[key].sourceFile === undefined);
    for (const noSourceFileKey of noSourceFileKeys) {
      delete this._fileInfoMapObj[noSourceFileKey];
    }
  }

  private _getAllRelatedFilePaths(filePath: string): string[] {
    /*
    if (filePath.includes("_modules")) {
      const orgFilePath = filePath.replace(/[\\/]_modules[\\/]/, "\\").replace(/(RoutingModule\.|Module\.)/, ".");
      return [
        ...Object.keys(this._fileInfoMapObj).filter(key => this._getDependencies(this._fileInfoMapObj[key].sourceFile!).includes(filePath)),
        orgFilePath,
        ...Object.keys(this._fileInfoMapObj).filter(key => this._getDependencies(this._fileInfoMapObj[key].sourceFile!).includes(orgFilePath))
      ];
    }*/

    return Object.keys(this._fileInfoMapObj).filter(key => this._getDependencies(this._fileInfoMapObj[key].sourceFile!).includes(filePath));
  }

  private _getDependencies(sourceFile: ts.SourceFile): string[] {
    const filePath = path.resolve(sourceFile.fileName);

    if (this._fileInfoMapObj[filePath].dependencies) {
      return this._fileInfoMapObj[filePath].dependencies!;
    }

    const result = this._getSourceNodes(sourceFile)
      .filter(item => [ts.SyntaxKind.ExportDeclaration, ts.SyntaxKind.ImportDeclaration].includes(item.kind))
      .mapMany(node => {
        const decl = node as ts.ImportDeclaration | ts.ExportDeclaration;
        if (!decl.moduleSpecifier) return [];

        const moduleSpecifier = decl.moduleSpecifier as ts.StringLiteral;
        const importRequire = moduleSpecifier.text;

        const importNamed = decl["importClause"]?.namedBindings as ts.NamedImports | undefined;
        const importTargets = importNamed?.elements?.map(item => (item.propertyName ? item.propertyName.text : item.name.text));

        const resolvedModule = sourceFile["resolvedModules"].get(importRequire);
        if (importRequire.startsWith(".") && resolvedModule === undefined) {
          const importFilePath = path.resolve(path.dirname(sourceFile.fileName), importRequire);
          if (sourceFile.fileName.endsWith(".d.ts")) {
            return [importFilePath + ".d.ts"];
          }
          else if (!Boolean(path.extname(importFilePath))) {
            return [importFilePath + path.extname(sourceFile.fileName)];
          }
          else {
            return [importFilePath];
          }
        }
        if (resolvedModule === undefined) return [];

        const targetFilePath = path.resolve(resolvedModule.resolvedFileName);
        const targetSourceFile = this.program!.getSourceFile(targetFilePath);
        if (!targetSourceFile) return [];

        const importChain = importTargets ?
          importTargets.mapMany(targetName => this._getImportChain(targetSourceFile, targetName)) :
          this._getImportChain(targetSourceFile);

        return [targetFilePath, ...importChain];
      });

    this._fileInfoMapObj[filePath].dependencies = result;
    return result;
  }

  private _getImportChain(sourceFile: ts.SourceFile, targetName?: string): string[] {
    const filePath = path.resolve(sourceFile.fileName);

    if (
      this._fileInfoMapObj[filePath].importChain &&
      this._fileInfoMapObj[filePath].importChain![targetName ?? "_"]
    ) {
      return this._fileInfoMapObj[filePath].importChain![targetName ?? "_"];
    }

    const result = this._getSourceNodes(sourceFile)
      .filter(item => item.kind === ts.SyntaxKind.ExportDeclaration)
      .mapMany(node => {
        const decl = node as ts.ExportDeclaration;

        const moduleSpecifier = decl.moduleSpecifier as ts.StringLiteral | undefined;
        if (!moduleSpecifier) return [];

        const importRequire = moduleSpecifier.text;

        const resolvedModule = sourceFile["resolvedModules"].get(importRequire);
        if (importRequire.startsWith(".") && resolvedModule === undefined) {
          const importFilePath = path.resolve(path.dirname(sourceFile.fileName), importRequire);
          if (sourceFile.fileName.endsWith(".d.ts")) {
            return [importFilePath + ".d.ts"];
          }
          else if (!Boolean(path.extname(importFilePath))) {
            return [importFilePath + path.extname(sourceFile.fileName)];
          }
          else {
            return [importFilePath];
          }
        }
        if (resolvedModule === undefined) return [];

        const targetFilePath = path.resolve(resolvedModule.resolvedFileName);
        const targetSourceFile = this.program!.getSourceFile(targetFilePath);
        if (!targetSourceFile) return [];

        if (targetName !== undefined) {
          const importChain = this._getImportChain(targetSourceFile, targetName);
          const hasTarget = this._getSourceNodes(targetSourceFile)
            .some(item => (
              item.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) &&
              item["name"]?.text === targetName
            ));
          const hasTargetInChildren = importChain.some(importFilePath => {
            const importSourceFile = this.program!.getSourceFile(importFilePath);
            if (!importSourceFile) return [];

            return this._getSourceNodes(importSourceFile).some(item => (
              item.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) &&
              item["name"]?.text === targetName
            ));
          });

          if (!hasTarget && !hasTargetInChildren) {
            return [];
          }
          else if (!hasTargetInChildren) {
            return [targetFilePath];
          }

          return [targetFilePath, ...importChain];
        }
        else {
          const importChain = this._getImportChain(targetSourceFile);
          return [targetFilePath, ...importChain];
        }
      });

    this._fileInfoMapObj[filePath].importChain = this._fileInfoMapObj[filePath].importChain ?? {};
    this._fileInfoMapObj[filePath].importChain![targetName ?? "_"] = result;

    return result;
  }

  private _getSourceNodes(sourceFile: ts.SourceFile): ts.Node[] {
    const filePath = path.resolve(sourceFile.fileName);

    if (this._fileInfoMapObj[filePath].nodes) {
      return this._fileInfoMapObj[filePath].nodes!;
    }

    const result: ts.Node[] = [];

    const fn = (parent: ts.Node): void => {
      if (parent.getChildCount(sourceFile) <= 0) return;

      const children = parent.getChildren();
      for (const childrenItem of children) {
        result.push(childrenItem);
        fn(childrenItem);
      }
    };
    fn(sourceFile);

    this._fileInfoMapObj[filePath].nodes = result;

    return result;
  }
}


interface IFileInfo {
  orgContent: string;
  content: string;

  changed: boolean;
  changedByScss: boolean;

  scssDependencies: string[];

  sourceFile?: ts.SourceFile;
  dependencies?: string[];
  nodes?: ts.Node[];
  importChain?: { [key: string]: string[] };
}