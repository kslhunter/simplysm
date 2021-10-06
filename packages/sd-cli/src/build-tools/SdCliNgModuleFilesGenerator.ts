import { ISdPackageBuildResult } from "../commons";
import { NeverEntryError, ObjectUtil, SdError, StringUtil } from "@simplysm/sd-core-common";
import * as ts from "typescript";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import * as path from "path";
import { JSDOM } from "jsdom";
import * as os from "os";
import {
  IMyComponentMetadata,
  IMyDirectiveMetadata,
  IMyInjectableMetadata,
  IMyNgModuleMetadata,
  IMyPipeMetadata,
  SdMyMetadataReader,
  TMyNgMetadata
} from "./metadata/SdMyMetadataReader";
import {
  IAotComponentMetadata,
  IAotDirectiveMetadata,
  IAotModuleExport,
  IAotNgModuleMetadata,
  IAotPipeMetadata,
  SdAotMetadataReader,
  TAotNgMetadata
} from "./metadata/SdAotMetadataReader";
import { IIvyNgModuleMetadata, SdIvyMetadataReader, TIvyNgMetadata } from "./metadata/SdIvyMetadataReader";
import { NgtscProgram } from "@angular/compiler-cli";
import { SdMetadataError } from "./metadata/SdMetadataError";

// TODO: LazyPage??
export class SdCliNgModuleFilesGenerator {
  private readonly _fileCache = new Map<string, TFileCache>();

  private readonly _sourceDirPath = path.resolve(this._rootDir, "src");
  private readonly _moduleDistDirPath = path.resolve(this._rootDir, "src/_modules");

  private _compilerHost?: ts.CompilerHost;
  private _moduleResolutionCache?: ts.ModuleResolutionCache;
  private _program?: ts.Program;

  public constructor(private readonly _rootDir: string) {
  }

  public deleteFileCaches(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this._fileCache.delete(PathUtil.posix(filePath));
    }
  }

  public async reloadSourceFilesAsync(dirtyFilePaths: string[],
                                      compilerHost: ts.CompilerHost,
                                      moduleResolutionCache: ts.ModuleResolutionCache,
                                      ngProgram: NgtscProgram): Promise<{ result: ISdPackageBuildResult[]; changed: boolean }> {
    this._compilerHost = compilerHost;
    this._moduleResolutionCache = moduleResolutionCache;
    this._program = ngProgram.getTsProgram();

    const result: ISdPackageBuildResult[] = [];

    let changed = false;
    for (const dirtyFilePath of dirtyFilePaths) {
      try {
        if (PathUtil.isChildPath(dirtyFilePath, this._moduleDistDirPath)) continue;

        this._fileCache.delete(dirtyFilePath);

        // 내 소스코드
        if (dirtyFilePath.endsWith(".ts") && !dirtyFilePath.endsWith(".d.ts")) {
          const sourceFile = this._program.getSourceFile(dirtyFilePath);
          if (!sourceFile) { // 삭제된 파일
            changed = true;
            continue;
          }

          this._fileCache.set(dirtyFilePath, {
            type: "my",
            sourceFile,
            metadata: new SdMyMetadataReader(sourceFile, this._program).getMetadatas()
          });
          changed = true;
        }

        // AOT 라이브러리
        else if (dirtyFilePath.endsWith(".d.ts")) {
          const sourceFile = this._program.getSourceFile(dirtyFilePath);
          if (!sourceFile) { // 삭제된 파일
            changed = true;
            continue;
          }

          // from METADATA
          const metadataFilePath = dirtyFilePath.replace(/\.d\.ts$/, ".metadata.json");
          const sdMetadataFilePath = dirtyFilePath.replace(/\.d\.ts$/, ".sd-metadata.json");

          if (FsUtil.exists(metadataFilePath)) {
            const metadataRoot = await FsUtil.readJsonAsync(metadataFilePath);

            this._fileCache.set(dirtyFilePath, {
              type: "aot",
              sourceFile,
              ...new SdAotMetadataReader(metadataRoot).getMetadatas()
            });
            changed = true;
          }
          else if (FsUtil.exists(sdMetadataFilePath)) {
            const metadataRoot = await FsUtil.readJsonAsync(sdMetadataFilePath);

            this._fileCache.set(dirtyFilePath, {
              type: "aot",
              sourceFile,
              ...new SdAotMetadataReader(metadataRoot).getMetadatas()
            });
            changed = true;
          }

          // from IVY
          else {
            this._fileCache.set(dirtyFilePath, {
              type: "ivy",
              sourceFile,
              ...new SdIvyMetadataReader(sourceFile, ngProgram).getMetadatas()
            });
            changed = true;
          }
        }
      }
      catch (err) {
        if (err instanceof SdMetadataError) {
          result.push({
            filePath: err.fileName,
            severity: "error",
            message: `${err.fileName}(0, 0): error ${err.message}`
          });
        }
        else {
          if (err instanceof Error) {
            throw new SdError(err, "'" + dirtyFilePath + "' 메타데이터 로딩중 에러");
          }
          else {
            throw err;
          }
        }
      }
    }

    return { result, changed };
  }

  public async generateAsync(): Promise<{ result: ISdPackageBuildResult[]; changedFilePaths: string[] }> {
    try {
      let moduleInfoMap = this._getModuleInfoMap();
      moduleInfoMap = this._mergeCircularModuleInfoMap(moduleInfoMap);

      const routingModuleMap = await this._getRoutingModuleInfoMapAsync();

      const changedFilePaths = [
        ...await this._writeNgModuleFileAsync(moduleInfoMap),
        ...await this._writeRoutingModuleFileAsync(moduleInfoMap, routingModuleMap)
      ];

      const genFilePaths = [...moduleInfoMap.keys(), ...routingModuleMap.keys()].distinct();
      const delFilePaths = (await FsUtil.globAsync(path.resolve(this._moduleDistDirPath, "**", "*")))
        .filter((item) => (
          !genFilePaths.includes(PathUtil.posix(item))
          && !genFilePaths.some((item1) => PathUtil.isChildPath(item1, item))
        ))
        .map((item) => PathUtil.posix(item));
      for (const delFilePath of delFilePaths) {
        changedFilePaths.push(delFilePath);
        await FsUtil.removeAsync(delFilePath);
      }

      return { result: [], changedFilePaths: changedFilePaths.distinct() };
    }
    catch (err) {
      if (err instanceof SdMetadataError) {
        return {
          result: [{
            filePath: err.fileName,
            severity: "error",
            message: `${err.fileName}(0, 0): error ${err.message}`
          }],
          changedFilePaths: []
        };
      }
      else if (err instanceof Error) {
        throw new SdError(err, "메타데이터 생성중 에러");
      }
      else {
        throw err;
      }
    }
  }

  // region NgModule

  private _getModuleInfoMap(): Map<string, IGenNgModuleInfo> {
    const moduleInfoMap = new Map<string, IGenNgModuleInfo>();

    const ngModuleExportInfos = this._getAllNgModuleExportInfos();
    const ngModuleExportMap = ngModuleExportInfos.groupBy((item) => item.exportModuleFilePath + "#" + item.exportName)
      .toMap((item) => item.key, (item) => item.values);

    for (const filePath of Array.from(this._fileCache.keys())) {
      const fileCache = this._fileCache.get(filePath)!;
      if (fileCache.type !== "my") continue;

      for (const metadata of fileCache.metadata) {
        if (
          (
            metadata.type === "Injectable"
            && (
              metadata.className.endsWith("Provider")
              && metadata.providedIn !== "root"
            )
          )
          || (
            metadata.type === "Directive"
            && metadata.className.endsWith("Directive")
          )
          || (
            metadata.type === "Pipe"
            && metadata.className.endsWith("Pipe")
          )
          || (
            metadata.type === "Component"
            && (
              metadata.className.endsWith("Page")
              || metadata.className.endsWith("Component")
              || metadata.className.endsWith("Modal")
              || metadata.className.endsWith("Control")
              || metadata.className.endsWith("PrintTemplate")
              || metadata.className.endsWith("Toast")
            )
          )
        ) {
          const newModuleInfo: IGenNgModuleInfo = {
            moduleImportMap: new Map<string, string[]>(),
            imports: [],
            exports: [],
            providers: [],
            className: metadata.className + "Module"
          };

          if (metadata.type === "Injectable") {
            newModuleInfo.providers.push({ moduleFilePath: filePath, name: metadata.className });
          }
          else {
            newModuleInfo.exports.push({ moduleFilePath: filePath, name: metadata.className });
          }

          const moduleImport = newModuleInfo.moduleImportMap.getOrCreate(filePath, []);
          moduleImport.push(metadata.className);

          const ngModuleImportInfos = this._getNgModuleImportInfos(metadata, ngModuleExportMap);
          for (const ngModuleImportInfo of ngModuleImportInfos) {
            newModuleInfo.imports.push({ moduleFilePath: ngModuleImportInfo.filePath, name: ngModuleImportInfo.name });
            const moduleImportMapValues = newModuleInfo.moduleImportMap.getOrCreate(ngModuleImportInfo.filePath, []);
            moduleImportMapValues.push(ngModuleImportInfo.name);
          }

          moduleInfoMap.set(
            this._getNgModulePath(filePath, metadata.className),
            {
              moduleImportMap: Array.from(newModuleInfo.moduleImportMap.entries())
                .toMap((item) => item[0], (item) => item[1].distinct()),
              className: newModuleInfo.className,
              imports: newModuleInfo.imports.distinct(),
              exports: newModuleInfo.exports.distinct(),
              providers: newModuleInfo.providers.distinct()
            }
          );
        }
      }
    }

    // 변경 사항이 있으면 generate 다시 수행

    const changed = this._reloadModuleInfoFileCache(moduleInfoMap);
    if (changed) {
      return this._getModuleInfoMap();
    }

    return moduleInfoMap;
  }

  private _reloadModuleInfoFileCache(moduleInfoMap: Map<string, IGenNgModuleInfo>): boolean {
    let changed = false;
    for (const moduleInfoMapEntry of moduleInfoMap.entries()) {
      const moduleFilePath = moduleInfoMapEntry[0];
      const moduleInfo = moduleInfoMapEntry[1];

      const newFileCache: IMyFileCache = {
        type: "my",
        sourceFile: undefined,
        metadata: [
          {
            type: "NgModule",
            className: moduleInfo.className,
            exports: moduleInfo.exports,
            providers: moduleInfo.providers
          }
        ]
      };

      const prevFileCache = this._fileCache.get(moduleFilePath);
      if (!prevFileCache) {
        this._fileCache.set(moduleFilePath, newFileCache);
        changed = true;
      }
      else if (!ObjectUtil.equal(prevFileCache.metadata, newFileCache.metadata, { ignoreArrayIndex: true })) {
        prevFileCache.metadata = newFileCache.metadata;
        changed = true;
      }
    }

    return changed;
  }

  private _mergeCircularModuleInfoMap(moduleInfoMap: Map<string, IGenNgModuleInfo>): Map<string, IGenNgModuleInfo> {
    const result = ObjectUtil.clone(moduleInfoMap);

    const fnMerge = (): boolean => {
      const moduleFilePaths = Array.from(result.keys()).orderBy().orderBy((item) => item.length);
      for (const moduleFilePath of moduleFilePaths) {
        const circularFilePaths = this._getModuleInfoMapExportCircular(result, [moduleFilePath]);
        if (circularFilePaths.length === 0) continue;

        for (const circularFilePath of circularFilePaths) {
          const thisModuleInfo = result.get(moduleFilePath)!;
          const circularModuleInfo = result.get(circularFilePath)!;

          const mergedModuleInfo = ObjectUtil.merge(circularModuleInfo, thisModuleInfo, { arrayProcess: "concat" });
          mergedModuleInfo.moduleImportMap.delete(moduleFilePath);
          mergedModuleInfo.moduleImportMap.delete(circularFilePath);
          mergedModuleInfo.imports.remove((item) => item.moduleFilePath === moduleFilePath && item.name === thisModuleInfo.className);
          mergedModuleInfo.imports.remove((item) => item.moduleFilePath === circularFilePath && item.name === circularModuleInfo.className);

          result.set(moduleFilePath, mergedModuleInfo);
          result.delete(circularFilePath);
          this._fileCache.delete(circularFilePath);

          for (const otherModuleInfoFilePath of result.keys()) {
            const otherModuleInfo = result.get(otherModuleInfoFilePath)!;
            if (otherModuleInfo.moduleImportMap.has(circularFilePath)) {
              otherModuleInfo.moduleImportMap.set(moduleFilePath, [
                ...otherModuleInfo.moduleImportMap.get(moduleFilePath) ?? [],
                thisModuleInfo.className
              ].distinct());
              otherModuleInfo.moduleImportMap.delete(circularFilePath);
              otherModuleInfo.imports.remove((item) => item.moduleFilePath === circularFilePath && item.name === circularModuleInfo.className);
            }
          }
        }

        return true;
      }
      return false;
    };
    while (fnMerge()) {
    }

    return result;
  }

  private async _writeNgModuleFileAsync(moduleInfoMap: Map<string, IGenNgModuleInfo>): Promise<string[]> {
    const changedDistFilePaths: string[] = [];

    for (const distFilePath of moduleInfoMap.keys()) {
      const moduleInfo = moduleInfoMap.get(distFilePath)!;

      const moduleImportMap = Array.from(moduleInfo.moduleImportMap.entries())
        .map((item) => ({
          moduleName: this._getModuleModuleImportName(path.dirname(distFilePath), item[0]),
          targetNames: item[1]
        }))
        .groupBy((item) => item.moduleName)
        .toMap((item) => item.key, (item) => item.values.mapMany((v) => v.targetNames).distinct());
      moduleImportMap.getOrCreate("@angular/core", []).push("NgModule");
      moduleImportMap.getOrCreate("@angular/common", []).push("CommonModule");

      const moduleImportTexts: string[] = [];
      for (const moduleImportName of Array.from(moduleImportMap.keys()).orderBy()) {
        const moduleImportInfo = moduleImportMap.get(moduleImportName)!.distinct();
        if (moduleImportInfo.length === 0) continue;
        moduleImportTexts.push(`import { ${moduleImportInfo.join(", ")} } from "${moduleImportName}";`);
      }

      const content = `
${moduleImportTexts.join(os.EOL)}

@NgModule({
  imports: [${moduleInfo.imports.map((item) => item.name).concat(["CommonModule"]).distinct().orderBy().join(", ")}],
  declarations: [${moduleInfo.exports.map((item) => item.name).distinct().orderBy().join(", ")}],
  exports: [${moduleInfo.exports.map((item) => item.name).distinct().orderBy().join(", ")}],
  providers: [${moduleInfo.providers.map((item) => item.name).distinct().orderBy().join(", ")}]
})
export class ${moduleInfo.className} {
}`.split("\n").map((item) => item.trimEnd()).join(os.EOL).trim();

      if (!FsUtil.exists(distFilePath) || await FsUtil.readFileAsync(distFilePath) !== content) {
        await FsUtil.writeFileAsync(distFilePath, content);
        changedDistFilePaths.push(distFilePath);
      }
    }

    return changedDistFilePaths;
  }

  private _getNgModuleImportInfos(metadata: IMyInjectableMetadata | IMyDirectiveMetadata | IMyPipeMetadata | IMyComponentMetadata,
                                  ngModuleExportMap: Map<string, INgModuleExportInfo[]>): { filePath: string; name: string }[] {
    const importTargets: { filePath: string; name: string }[] = [];

    // module import된 provider 찾기
    for (const metadataModuleImport of metadata.moduleImports) {
      importTargets.push({
        filePath: metadataModuleImport.moduleFilePath,
        name: metadataModuleImport.name
      });
    }

    if ("template" in metadata && !StringUtil.isNullOrEmpty(metadata.template)) {
      // template으로 component/directive 찾기
      const selectorInfos = this._getAllSelectorInfos();
      const templateDOM = new JSDOM(metadata.template);

      for (const selectorInfo of selectorInfos) {
        if (
          templateDOM.window.document.querySelector([
            selectorInfo.selector,
            selectorInfo.selector.replace(/\[/g, "[\\[").replace(/]/g, "\\]]"),
            selectorInfo.selector.replace(/\[/g, "[\\(").replace(/]/g, "\\)]")
          ].join(", ")) != null
        ) {
          importTargets.push({ filePath: selectorInfo.filePath, name: selectorInfo.className });
        }
      }

      // template으로 pipe 찾기
      const pipeInfos = this._getAllPipeInfos();

      for (const pipeInfo of pipeInfos) {
        if (new RegExp("| *" + pipeInfo.name + "[^\\w]").test(metadata.template)) {
          importTargets.push({ filePath: pipeInfo.filePath, name: pipeInfo.className });
        }
      }
    }

    // provider/component/directive/pipe에 따라 NgModule 찾아 import등록
    const result: { filePath: string; name: string }[] = [];
    for (const importTarget of importTargets) {
      const ngModules = ngModuleExportMap.get(importTarget.filePath + "#" + importTarget.name);
      if (ngModules) {
        if (ngModules.length !== 1) throw new NeverEntryError();
        result.push({ filePath: ngModules[0].filePath, name: ngModules[0].className });
      }
    }

    return result;
  }

  private _getAllNgModuleExportInfos(): INgModuleExportInfo[] {
    const result: INgModuleExportInfo[] = [];

    for (const filePath of this._fileCache.keys()) {
      const fileCache = this._fileCache.get(filePath)!;
      if (fileCache.type === "my") {
        const ngModules = fileCache.metadata.filter((item) => item.type === "NgModule") as IMyNgModuleMetadata[];

        for (const ngModule of ngModules) {
          for (const exp of ngModule.exports.concat(ngModule.providers)) {
            result.push({
              moduleName: undefined,
              filePath,
              className: ngModule.className,
              exportModuleFilePath: exp.moduleFilePath,
              exportName: exp.name
            });
          }
        }
      }
      else if (fileCache.type === "aot") {
        const ngModules = fileCache.metadata.filter((item) => item.type === "NgModule") as IAotNgModuleMetadata[];

        for (const ngModule of ngModules) {
          for (const exp of ngModule.exports.concat(ngModule.providers)) {
            if (!StringUtil.isNullOrEmpty(exp.moduleName)) {
              const newExp = this._getAotReferenceLastFilePath(filePath, exp.moduleName, exp.name);
              if (!newExp) throw new NeverEntryError();

              result.push({
                moduleName: fileCache.moduleName,
                filePath,
                className: ngModule.className,
                exportModuleFilePath: newExp.moduleFilePath,
                exportName: newExp.name
              });
            }
            else {
              if (!fileCache.exports.some((item) => (item.as ?? item.name) === exp.name)) throw new NeverEntryError();
              result.push({
                moduleName: fileCache.moduleName,
                filePath,
                className: ngModule.className,
                exportModuleFilePath: filePath,
                exportName: exp.name
              });
            }
          }
        }
      }
      else {
        const ngModules = fileCache.metadata.filter((item) => item.type === "NgModule") as IIvyNgModuleMetadata[];

        for (const ngModule of ngModules) {
          for (const exp of ngModule.exports) {
            result.push({
              moduleName: fileCache.moduleName,
              filePath,
              className: ngModule.className,
              exportModuleFilePath: exp.moduleFilePath,
              exportName: exp.name
            });
          }
        }
      }
    }

    return result.distinct();
  }

  private _getModuleInfoMapExportCircular(moduleInfoMap: Map<string, IGenNgModuleInfo>, arr: string[]): string[] {
    if (moduleInfoMap.has(arr.last()!)) {
      const moduleInfo = moduleInfoMap.get(arr.last()!)!;

      const result: string[] = [];
      for (const moduleImportFilePath of moduleInfo.moduleImportMap.keys()) {
        if (arr.includes(moduleImportFilePath)) {
          if (arr[0] === moduleImportFilePath) {
            result.push(...arr.slice(1));
          }
        }
        else {
          result.push(...this._getModuleInfoMapExportCircular(moduleInfoMap, arr.concat([moduleImportFilePath])));
        }
      }
      return result.distinct();
    }
    else {
      return [];
    }
  }

  private _getNgModulePath(pageFilePath: string, pageClassName: string): string {
    return PathUtil.posix(this._getGenNgModuleDistPath(pageFilePath), pageClassName + "Module.ts");
  }

  private _getAotReferenceLastFilePath(filePath: string, moduleName: string, targetName: string): { moduleFilePath: string; name: string } | undefined {
    const expFilePath = this._getResolvedFilePath(filePath, moduleName);
    if (StringUtil.isNullOrEmpty(expFilePath)) throw new NeverEntryError();
    const expFileCache = this._fileCache.get(expFilePath);
    if (!expFileCache) {
      this._fileCache.get(expFilePath.replace(/[\\/]/g, "\\"));
      throw new SdMetadataError(filePath, `'${moduleName}'에 대한 파일 '${expFilePath}'을 찾을 수 없습니다.`);
    }
    if (expFileCache.type !== "aot") throw new NeverEntryError();
    const newExp = expFileCache.exports.single((item) => (item.as ?? item.name) === targetName);
    if (!newExp) throw new NeverEntryError();

    if (!StringUtil.isNullOrEmpty(newExp.moduleName)) {
      return this._getAotReferenceLastFilePath(expFilePath, newExp.moduleName, newExp.name!);
    }
    else {
      return {
        moduleFilePath: expFilePath,
        name: newExp.as ?? newExp.name!
      };
    }
  }

  private _getAllSelectorInfos(): { selector: string; className: string; filePath: string }[] {
    const result: { selector: string; className: string; filePath: string }[] = [];

    for (const filePath of this._fileCache.keys()) {
      const fileCache = this._fileCache.get(filePath)!;

      const selectorMetadata = (fileCache.metadata as ((TAotNgMetadata | TMyNgMetadata)[]))
        .filter((item) => item.type === "Component" || item.type === "Directive") as (IMyComponentMetadata | IMyDirectiveMetadata | IAotComponentMetadata | IAotDirectiveMetadata)[];

      for (const selectorMetadataItem of selectorMetadata) {
        if (StringUtil.isNullOrEmpty(selectorMetadataItem.selector)) continue;

        result.push(({
          selector: selectorMetadataItem.selector,
          className: selectorMetadataItem.className,
          filePath
        }));
      }
    }
    return result;
  }

  private _getAllPipeInfos(): { name: string; className: string; filePath: string }[] {
    const result: { name: string; className: string; filePath: string }[] = [];
    for (const filePath of this._fileCache.keys()) {
      const fileCache = this._fileCache.get(filePath)!;

      const pipeMetadata = (fileCache.metadata as ((TAotNgMetadata | TMyNgMetadata)[]))
        .filter((item) => item.type === "Component" || item.type === "Directive") as (IMyPipeMetadata | IAotPipeMetadata)[];

      for (const pipeMetadataItem of pipeMetadata) {
        if (StringUtil.isNullOrEmpty(pipeMetadataItem.name)) continue;

        result.push(({
          name: pipeMetadataItem.name,
          className: pipeMetadataItem.className,
          filePath
        }));
      }
    }
    return result;
  }

  private _getModuleModuleImportName(distDirPath: string, filePath: string): string {
    const fileCache = this._fileCache.get(filePath);
    const presetModuleName = !fileCache || fileCache.type === "my" ? undefined : fileCache.moduleName;
    if (!StringUtil.isNullOrEmpty(presetModuleName)) return presetModuleName;

    const relativeFilePath = PathUtil.posix(path.relative(distDirPath, filePath));
    return (relativeFilePath.startsWith(".") ? relativeFilePath : "./" + relativeFilePath)
      .replace(/\.ts$/, "")
      .replace(/\\/g, "/");
  }

  private _getResolvedFilePath(sourceFilePath: string, moduleName: string): string | undefined {
    const resolvedModule = ts.resolveModuleName(
      moduleName,
      sourceFilePath,
      this._program!.getCompilerOptions(),
      this._compilerHost!,
      this._moduleResolutionCache
    ).resolvedModule;

    if (resolvedModule) {
      return PathUtil.posix(resolvedModule.resolvedFileName);
    }
    return undefined;
  }

  private _getGenNgModuleDistPath(filePath: string): string {
    return path.resolve(this._moduleDistDirPath, path.relative(this._sourceDirPath, path.dirname(filePath)));
  }

  // endregion

  // region RoutingModule

  private async _getRoutingModuleInfoMapAsync(): Promise<Map<string, IGenRoutingModuleInfo>> {
    const result = new Map<string, IGenRoutingModuleInfo>();

    for (const filePath of Array.from(this._fileCache.keys())) {
      const fileCache = this._fileCache.get(filePath)!;
      if (fileCache.type !== "my") continue;

      for (const metadata of fileCache.metadata) {
        if (!metadata.className.endsWith("Page")) continue;

        const newRoutingModuleInfo: IGenRoutingModuleInfo = {
          path: "",
          page: {
            moduleFilePath: filePath,
            name: metadata.className
          },
          children: []
        };

        const childDirName = StringUtil.toKebabCase(path.basename(filePath, path.extname(filePath)).replace(/Page$/, ""));
        const childDirPath = path.resolve(path.dirname(filePath), childDirName);
        if (FsUtil.exists(childDirPath)) {
          newRoutingModuleInfo.children = await this._getRoutingModuleChildInfoAsync(childDirPath);
        }

        result.set(
          this._getRoutingModulePath(filePath, metadata.className),
          newRoutingModuleInfo
        );
      }
    }

    return result;
  }

  private async _getRoutingModuleChildInfoAsync(childDirPath: string): Promise<IGenRoutingChildModuleInfo[]> {
    const result: IGenRoutingChildModuleInfo[] = [];

    const childDirChildPaths = (await FsUtil.readdirAsync(childDirPath)).map((item) => path.resolve(childDirPath, item));

    const ignoreDirPaths: string[] = [];
    for (const childDirChildPath of childDirChildPaths) {
      if (childDirChildPath.endsWith("Page.ts")) {
        const childDirChildDirName = StringUtil.toKebabCase(path.basename(childDirChildPath, path.extname(childDirChildPath)).replace(/Page$/, ""));
        result.push({
          path: childDirChildDirName,
          page: {
            moduleFilePath: childDirChildPath,
            name: path.basename(childDirChildPath, path.extname(childDirChildPath))
          }
        });
        ignoreDirPaths.push(path.resolve(path.dirname(childDirChildPath), childDirChildDirName));
      }
    }

    for (const childDirChildPath of childDirChildPaths) {
      if (FsUtil.isDirectory(childDirChildPath) && !ignoreDirPaths.includes(childDirChildPath)) {
        result.push({
          path: path.basename(childDirChildPath),
          children: await this._getRoutingModuleChildInfoAsync(childDirChildPath)
        });
      }
    }

    return result;
  }

  private async _writeRoutingModuleFileAsync(moduleInfoMap: Map<string, IGenNgModuleInfo>, routingModuleInfoMap: Map<string, IGenRoutingModuleInfo>): Promise<string[]> {
    const changedDistFilePaths: string[] = [];
    for (const distFilePath of routingModuleInfoMap.keys()) {
      const routingModuleInfo = routingModuleInfoMap.get(distFilePath)!;

      const routingModuleText = this._getRoutingModuleText(routingModuleInfo, distFilePath);

      const moduleImportTexts: string[] = [];

      const pageFilePath = this._getModuleModuleImportName(path.dirname(distFilePath), routingModuleInfo.page.moduleFilePath);

      let content: string;
      if (path.basename(distFilePath) === "_routes.ts") {
        moduleImportTexts.push(`import { Routes } from "@angular/router";`);

        content = `
${moduleImportTexts.join(os.EOL)}

export const routes: Routes = [
  ${routingModuleText.replace(/\r\n/g, "\r\n  ")}
];`.split("\n").map((item) => item.trimEnd()).join(os.EOL).trim();
      }
      else {
        moduleImportTexts.push(`import { NgModule } from "@angular/core";`);
        moduleImportTexts.push(`import { RouterModule } from "@angular/router";`);
        moduleImportTexts.push(`import { ${routingModuleInfo.page.name} } from "${pageFilePath}";`);

        const thisPageModuleInfoEntry = Array.from(moduleInfoMap.entries())
          .single((item) => item[1].exports.some((exp) => exp.moduleFilePath === routingModuleInfo.page.moduleFilePath && exp.name === routingModuleInfo.page.name));
        if (!thisPageModuleInfoEntry) throw new NeverEntryError();
        const thisPageModuleInfo = {
          filePath: thisPageModuleInfoEntry[0],
          className: thisPageModuleInfoEntry[1].className
        };

        const pageNgModuleFilePath = this._getModuleModuleImportName(path.dirname(distFilePath), thisPageModuleInfo.filePath);
        moduleImportTexts.push(`import { ${thisPageModuleInfo.className} } from "${pageNgModuleFilePath}";`);

        content = `
${moduleImportTexts.join(os.EOL)}

@NgModule({
  imports: [
    ${thisPageModuleInfo.className},
    RouterModule.forChild([
      ${routingModuleText.replace(/\r\n/g, "\r\n      ")}
    ])
  ]
})
export class ${routingModuleInfo.page.name}RoutingModule {
}`.split("\n").map((item) => item.trimEnd()).join(os.EOL).trim();
      }

      if (!FsUtil.exists(distFilePath) || await FsUtil.readFileAsync(distFilePath) !== content) {
        await FsUtil.writeFileAsync(distFilePath, content);
        changedDistFilePaths.push(distFilePath);
      }
    }

    return changedDistFilePaths;
  }

  private _getRoutingModulePath(pageFilePath: string, pageClassName: string): string {
    if (pageFilePath === PathUtil.posix(this._sourceDirPath, "AppPage.ts")) {
      return PathUtil.posix(this._sourceDirPath, "_routes.ts");
    }
    else {
      return PathUtil.posix(this._getGenNgModuleDistPath(pageFilePath), pageClassName + "RoutingModule.ts");
    }
  }

  private _getRoutingModuleText(routingModuleInfo: IGenRoutingModuleInfo, distFilePath: string): string {
    let content = "{\r\n";
    content += `  path: "${routingModuleInfo.path}",\r\n`;
    if (path.basename(distFilePath) !== "_routes.ts") {
      content += `  component: ${routingModuleInfo.page.name},\r\n`;
    }
    if (routingModuleInfo.children.length > 0) {
      content += `  children: [\r\n`;
      for (const child of routingModuleInfo.children) {
        const childText = this._getRoutingModuleChildText(child, path.dirname(distFilePath));
        content += "    " + childText.replace(/\r\n/g, "\r\n    ") + ",\r\n";
      }
      content = content.slice(0, -3) + "\r\n";
      content += `  ],\r\n`;
    }

    return content.slice(0, -3) + "\r\n}";
  }

  private _getRoutingModuleChildText(routingModuleChildInfo: IGenRoutingChildModuleInfo, distDirPath: string): string {
    let content = "{\r\n";
    content += `  path: "${routingModuleChildInfo.path}",\r\n`;
    if (routingModuleChildInfo.page) {
      const routingModuleFilePath = this._getRoutingModulePath(routingModuleChildInfo.page.moduleFilePath, routingModuleChildInfo.page.name);

      const moduleDirPath = "./" + PathUtil.posix(path.dirname(path.relative(distDirPath, routingModuleFilePath)));

      content += `  loadChildren: async () => await import("${moduleDirPath}/${routingModuleChildInfo.page.name}RoutingModule").then((m) => m.${routingModuleChildInfo.page.name}RoutingModule),\r\n`;
    }
    else if (routingModuleChildInfo.children && routingModuleChildInfo.children.length > 0) {
      content += `  children: [\r\n`;
      for (const child of routingModuleChildInfo.children) {
        const childText = this._getRoutingModuleChildText(child, distDirPath);
        content += "  " + childText.replace(/\r\n/g, "\r\n  ") + ",\r\n";
      }
      content = content.slice(0, -3) + "\r\n";
      content += `  ],\r\n`;
    }

    return content.slice(0, -3) + "\r\n}";
  }

  // endregion
}

type TFileCache = IMyFileCache | IAotFileCache | IIvyFileCache;

interface IMyFileCache {
  type: "my";
  sourceFile?: ts.SourceFile;
  metadata: TMyNgMetadata[];
}

interface IAotFileCache {
  type: "aot";
  sourceFile: ts.SourceFile;
  moduleName: string;
  exports: IAotModuleExport[];
  metadata: TAotNgMetadata[];
}

interface IIvyFileCache {
  type: "ivy";
  sourceFile: ts.SourceFile;
  moduleName: string;
  metadata: TIvyNgMetadata[];
}

interface IGenNgModuleInfo {
  moduleImportMap: Map<string, string[]>;
  imports: { moduleFilePath: string; name: string }[];
  exports: { moduleFilePath: string; name: string }[];
  providers: { moduleFilePath: string; name: string }[];
  className: string;
}

interface IGenRoutingModuleInfo {
  path: string;
  page: { moduleFilePath: string; name: string };
  children: IGenRoutingChildModuleInfo[];
}

interface IGenRoutingChildModuleInfo {
  path: string;
  page?: { moduleFilePath: string; name: string };
  children?: IGenRoutingChildModuleInfo[];
}

interface INgModuleExportInfo {
  moduleName: string | undefined;
  filePath: string;
  className: string;
  exportModuleFilePath: string;
  exportName: string;
}
