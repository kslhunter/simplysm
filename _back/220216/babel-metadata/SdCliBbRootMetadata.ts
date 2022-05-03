import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import path from "path";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import { SdCliBbFileMetadata } from "./SdCliBbFileMetadata";
import { TSdCliBbDeclarationMetadata } from "./SdCliBbDeclarationMetadata";
import { INpmConfig } from "../../commons";
import { SdCliNpmConfigUtil } from "../../utils/SdCliNpmConfigUtil";

export class SdCliBbRootMetadata {
  private readonly _entryMap: Map<string, string>;
  private readonly _fileMetaCache = new Map<string, SdCliBbFileMetadata>();

  public constructor(packagePath: string) {
    const allDepPaths = this._getAllDepPaths(packagePath);
    const ngDepPaths = this._getNgDepPaths(allDepPaths);
    this._entryMap = this._getEntryMap(ngDepPaths);
  }

  public removeCache(filePath: string): void {
    this._fileMetaCache.delete(filePath);
  }

  public getEntryFileMetaRecord(): Record<string, SdCliBbFileMetadata> {
    const result: Record<string, SdCliBbFileMetadata> = {};
    for (const moduleName of this._entryMap.keys()) {
      const entryFilePath = this._entryMap.get(moduleName)!;
      const entryFileMeta = new SdCliBbFileMetadata(this, moduleName, entryFilePath);
      result[moduleName] = this._fileMetaCache.getOrCreate(entryFilePath, entryFileMeta)!;
    }
    return result;
  }

  public findDeclMeta(moduleName: string, moduleFilePath: string, targetName: string): TSdCliBbDeclarationMetadata {
    const fileMeta = this._fileMetaCache.getOrCreate(moduleFilePath, new SdCliBbFileMetadata(this, moduleName, moduleFilePath));
    return fileMeta.findDeclMeta(targetName);
  }

  public findDeclMetaByModuleName(moduleName: string, targetName: string): TSdCliBbDeclarationMetadata {
    const moduleFilePath = this._entryMap.get(moduleName);
    if (moduleFilePath === undefined) {
      throw new Error(`모듈 '${moduleName}'을 찾을 수 없습니다.`);
    }
    return this.findDeclMeta(moduleName, moduleFilePath, targetName);
  }

  private _getAllDepPaths(packagePath: string): string[] {
    const loadedModuleNames: string[] = [];
    const results: string[] = [];

    const fn = (currPath: string): void => {
      const npmConfig = FsUtil.readJson(path.resolve(currPath, "package.json")) as INpmConfig;

      const deps = SdCliNpmConfigUtil.getDependencies(npmConfig);

      for (const moduleName of deps.defaults) {
        if (loadedModuleNames.includes(moduleName)) continue;
        loadedModuleNames.push(moduleName);

        const modulePath = FsUtil.findAllParentChildDirPaths("node_modules/" + moduleName, currPath, process.cwd()).first();
        if (StringUtil.isNullOrEmpty(modulePath)) {
          continue;
        }

        results.push(modulePath);

        fn(modulePath);
      }
    };

    fn(packagePath);

    return results;
  }

  private _getNgDepPaths(allDepPaths: string[]): string[] {
    const results: string[] = [];

    for (const depPath of allDepPaths) {
      const npmConfig = FsUtil.readJson(path.resolve(depPath, "package.json")) as INpmConfig;
      const defaultDeps = SdCliNpmConfigUtil.getDependencies(npmConfig).defaults;
      if (npmConfig.name === "@angular/core" || defaultDeps.includes("@angular/core")) {
        results.push(depPath);
      }
    }

    return results;
  }

  private _getEntryMap(ngDepPaths: string[]): Map<string, string> {
    const entryMap = new Map<string, string>();
    for (const ngDepPath of ngDepPaths) {
      const npmConfig = FsUtil.readJson(path.resolve(ngDepPath, "package.json")) as INpmConfig;
      entryMap.set(npmConfig.name, path.resolve(ngDepPath, npmConfig["es2015"] ?? npmConfig["browser"] ?? npmConfig["module"] ?? npmConfig["main"]));

      if (npmConfig.exports) {
        const exportKeys = Object.keys(npmConfig.exports);
        for (const exportKey of exportKeys) {
          if (
            exportKey.includes("/locales") ||
            exportKey.endsWith("/package.json") ||
            exportKey.endsWith("/testing") ||
            exportKey.endsWith("/upgrade")
          ) {
            continue;
          }

          const exportPath = path.resolve(
            ngDepPath,
            npmConfig.exports[exportKey]["es2015"] ??
            npmConfig.exports[exportKey]["browser"] ??
            npmConfig.exports[exportKey]["module"] ??
            npmConfig.exports[exportKey]["main"] ??
            npmConfig.exports[exportKey]["default"]
          );
          const exportResult = this._getGlobExportResult(PathUtil.posix(npmConfig.name, exportKey), exportPath);
          for (const exportResultItem of exportResult) {
            entryMap.set(exportResultItem.name, exportResultItem.target);
          }
        }
      }
    }

    return entryMap;
  }

  private _getGlobExportResult(globName: string, globTarget: string): { name: string; target: string }[] {
    if (globName.includes("*") && globTarget.includes("*")) {
      const result: { name: string; target: string }[] = [];

      const regexpText = globTarget.replace(/[\\/.*]/g, (item) => (
        item === "/" || item === "\\" ? "[\\\\/]"
          : item === "." ? "\\."
            : item === "*" ? "(.*)"
              : item
      ));

      const targets = FsUtil.glob(globTarget);
      for (const target of targets) {
        const targetNameMatch = new RegExp(regexpText).exec(target);
        if (!targetNameMatch || typeof targetNameMatch[1] === "undefined") {
          throw new NeverEntryError();
        }
        const targetName = targetNameMatch[1];
        const name = globName.replace("*", targetName);
        result.push({ name, target });
      }

      return result;
    }
    else {
      return [{ name: globName, target: globTarget }];
    }
  }
}
