import { SdCliBbFileMetadata } from "./SdCliBbFileMetadata";
import path from "path";
import { INpmConfig } from "../../commons";
import { SdCliNpmConfigUtil } from "../../utils/SdCliNpmConfigUtil";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import { TSdCliBbTypeMetadata } from "./TSdCliBbTypeMetadata";
import { TSdCliMetaRef } from "../commons";

export class SdCliBbRootMetadata {
  private readonly _entryMap: Map<string, string>;
  private readonly _fileMetaCache = new Map<string, SdCliBbFileMetadata>();

  public constructor(packagePath: string) {
    const allDepPaths = this._getAllDepPaths(packagePath);
    this._entryMap = this._getEntryMap(allDepPaths);
    // const ngDepPaths = this._getNgDepPaths(allDepPaths);
    // this._entryMap = this._getEntryMap(ngDepPaths);
  }

  public removeCaches(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this._fileMetaCache.delete(filePath);
    }
  }

  public getEntryFileMetaRecord(): Record<string, SdCliBbFileMetadata> {
    const result: Record<string, SdCliBbFileMetadata> = {};
    for (const moduleName of this._entryMap.keys()) {
      const entryFilePath = this._entryMap.get(moduleName)!;
      result[moduleName] = this._fileMetaCache.getOrCreate(entryFilePath, () => new SdCliBbFileMetadata(entryFilePath))!;
    }
    return result;
  }

  public findMeta(ref: TSdCliMetaRef): TSdCliBbMetadata | TSdCliBbMetadata[] {
    const filePath = "moduleName" in ref ? this._entryMap.get(ref.moduleName) : ref.filePath;
    if (filePath === undefined) {
      throw new NeverEntryError();
    }
    const fileMeta = this._fileMetaCache.getOrCreate(filePath, () => new SdCliBbFileMetadata(filePath));
    if (ref.name === "*") {
      const result: TSdCliBbMetadata[] = [];
      for (const exp of fileMeta.exports) {
        const meta = exp.target;
        if (typeof meta !== "string" && "__TDeclRef__" in meta) {
          const resultMeta = this.findMeta(meta);
          if (resultMeta instanceof Array) {
            result.push(...resultMeta);
          }
          else {
            result.push(resultMeta);
          }
        }
        else {
          result.push(meta);
        }
      }
      return result;
    }
    else {
      const meta = fileMeta.findMetaFromOutside(ref.name);
      if (typeof meta !== "string" && "__TDeclRef__" in meta) {
        return this.findMeta(meta);
      }
      return meta;
    }
  }

  public findExportRef(localRef: { filePath: string; name: string }): { moduleName: string; name: string } | undefined {
    const record = this.getEntryFileMetaRecord();
    for (const moduleName of Object.keys(record)) {
      const entryFileMeta = record[moduleName];
      for (const exp of entryFileMeta.exports) {
        if (
          typeof exp.target !== "string" &&
          "filePath" in exp.target &&
          exp.target.filePath === localRef.filePath
        ) {
          if (exp.target.name === "*") {
            throw new NeverEntryError();
          }
          else if (exp.target.name === localRef.name) {
            return { moduleName, name: exp.exportedName };
          }
        }
      }
    }

    return undefined;
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

  // private _getNgDepPaths(allDepPaths: string[]): string[] {
  //   const results: string[] = [];
  //
  //   for (const depPath of allDepPaths) {
  //     const npmConfig = FsUtil.readJson(path.resolve(depPath, "package.json")) as INpmConfig;
  //     const defaultDeps = SdCliNpmConfigUtil.getDependencies(npmConfig).defaults;
  //     if (npmConfig.name === "@angular/core" || defaultDeps.includes("@angular/core")) {
  //       results.push(depPath);
  //     }
  //   }
  //
  //   return results;
  // }

  private _getEntryMap(ngDepPaths: string[]): Map<string, string> {
    const entryMap = new Map<string, string>();
    for (const ngDepPath of ngDepPaths) {
      const npmConfig = FsUtil.readJson(path.resolve(ngDepPath, "package.json")) as INpmConfig;

      const entryFilePath = npmConfig["es2015"] ?? npmConfig["browser"] ?? npmConfig["module"] ?? npmConfig["main"] ?? npmConfig["default"];
      if (typeof entryFilePath === "string") {
        entryMap.set(npmConfig.name, path.resolve(ngDepPath, entryFilePath));
      }

      if (npmConfig.exports) {
        const exportKeys = Object.keys(npmConfig.exports);
        for (const exportKey of exportKeys) {
          if (
            exportKey.includes("/locales") ||
            exportKey.endsWith(".json") ||
            exportKey.endsWith("/testing") ||
            exportKey.endsWith("/upgrade")
          ) {
            continue;
          }

          const expEntryFilePath = npmConfig.exports[exportKey]["es2015"] ??
            npmConfig.exports[exportKey]["browser"] ??
            npmConfig.exports[exportKey]["module"] ??
            npmConfig.exports[exportKey]["main"] ??
            npmConfig.exports[exportKey]["default"];
          if (typeof expEntryFilePath === "string") {
            const exportPath = path.resolve(ngDepPath, expEntryFilePath);
            const exportResult = this._getGlobExportResult(PathUtil.posix(npmConfig.name, exportKey), exportPath);
            for (const exportResultItem of exportResult) {
              entryMap.set(exportResultItem.name, exportResultItem.target);
            }
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

export type TSdCliBbMetadata = TSdCliBbTypeMetadata | TSdCliMetaRef | string;
