import { SdCliTsRootMetadata } from "./typescript/SdCliTsRootMetadata";
import { SdCliBbRootMetadata } from "./babel/SdCliBbRootMetadata";
import { SdCliBbClassMetadata, SdCliBbObjectMetadata } from "./babel/TSdCliBbTypeMetadata";
import {
  SdCliBbNgComponentMetadata,
  SdCliBbNgDirectiveMetadata,
  SdCliBbNgModuleMetadata,
  SdCliBbNgPipeMetadata
} from "./babel/TSdCliBbNgMetadata";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { TSdCliMetaRef } from "./commons";
import { SdCliTsNgInjectableMetadata } from "./typescript/SdCliTsFileMetadata";
import path from "path";
import { JSDOM } from "jsdom";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import os from "os";

// TODO: 에러 메시지 처리
export class NgModuleGenerator {
  private readonly _bbMeta: SdCliBbRootMetadata;
  private readonly _tsMeta: SdCliTsRootMetadata;

  private readonly _srcPath: string;
  private readonly _modulesPath: string;

  private readonly _fileWriterCache = new Map<string, string>();

  public constructor(packagePath: string, private readonly _srcDirRelPaths: string[]) {
    this._srcPath = path.resolve(packagePath, "src");
    this._modulesPath = path.resolve(packagePath, "src", "_modules");

    this._bbMeta = new SdCliBbRootMetadata(packagePath);
    this._tsMeta = new SdCliTsRootMetadata(packagePath);
  }

  public async clearModulesAsync(): Promise<void> {
    await FsUtil.removeAsync(this._modulesPath);
  }

  public removeCaches(changedFilePaths: string[]): void {
    this._bbMeta.removeCaches(changedFilePaths);
    this._tsMeta.removeCaches(changedFilePaths);
    for (const changedFilePath of changedFilePaths) {
      this._fileWriterCache.delete(changedFilePath);
    }
  }

  public async runAsync(): Promise<void> {
    const bbNgModules = this._getBbNgModuleDefs();
    const tsPreset = this._getTsGenNgModulePreset();

    const genNgModules = this._getGenNgModuleDefs(bbNgModules, tsPreset.modules, tsPreset.sources);
    await this._genFileAsync(genNgModules);
  }

  private _getBbNgModuleDefs(): IBbNgModuleDef[] {
    const entryRecord = this._bbMeta.getEntryFileMetaRecord();
    const result: IBbNgModuleDef[] = [];

    for (const moduleName of Object.keys(entryRecord)) {
      const fileMeta = entryRecord[moduleName];
      for (const exp of fileMeta.exports) {
        const metaTmp = typeof exp.target !== "string" && "__TDeclRef__" in exp.target ? this._bbMeta.findMeta(exp.target) : exp.target;
        const metas = metaTmp instanceof Array ? metaTmp : [metaTmp];
        for (const meta of metas) {
          if (meta instanceof SdCliBbClassMetadata) {
            if (meta.ngDecl instanceof SdCliBbNgModuleMetadata) {
              const ngDecl = meta.ngDecl;

              const resultItem: IBbNgModuleDef = {
                moduleName,
                name: exp.exportedName,
                providers: [],
                exports: [],
                selectors: [],
                pipeNames: []
              };

              for (const modProv of ngDecl.def.providers) {
                if (modProv instanceof SdCliBbClassMetadata) {
                  const ref = this._bbMeta.findExportRef({
                    filePath: modProv.filePath,
                    name: modProv.name
                  });
                  if (ref) {
                    resultItem.providers.push(ref);
                  }
                }
                else if (modProv instanceof SdCliBbObjectMetadata) {
                  // 무시
                }
                else {
                  throw new NeverEntryError();
                }
              }

              for (const modExp of ngDecl.def.exports) {
                if (modExp instanceof SdCliBbClassMetadata) {
                  const ref = this._bbMeta.findExportRef({
                    filePath: modExp.filePath,
                    name: modExp.name
                  });
                  if (ref) {
                    resultItem.exports.push(ref);
                  }

                  if (modExp.ngDecl instanceof SdCliBbNgDirectiveMetadata) {
                    resultItem.selectors.push(modExp.ngDecl.selector);
                  }
                  else if (modExp.ngDecl instanceof SdCliBbNgComponentMetadata) {
                    resultItem.selectors.push(modExp.ngDecl.selector);
                  }
                  else if (modExp.ngDecl instanceof SdCliBbNgPipeMetadata) {
                    resultItem.pipeNames.push(modExp.ngDecl.pipeName);
                  }
                }
                else if (typeof modExp !== "string" && "__TDeclRef__" in modExp) {
                  const modExpMeta = this._bbMeta.findMeta(modExp);
                  if (modExpMeta instanceof Array) {
                    throw new NeverEntryError();
                  }

                  if (modExpMeta instanceof SdCliBbClassMetadata) {
                    const ref = this._bbMeta.findExportRef({
                      filePath: modExpMeta.filePath,
                      name: modExpMeta.name
                    });
                    if (ref) {
                      resultItem.exports.push(ref);
                    }

                    if (modExpMeta.ngDecl instanceof SdCliBbNgDirectiveMetadata) {
                      resultItem.selectors.push(modExpMeta.ngDecl.selector);
                    }
                    else if (modExpMeta.ngDecl instanceof SdCliBbNgComponentMetadata) {
                      resultItem.selectors.push(modExpMeta.ngDecl.selector);
                    }
                    else if (modExpMeta.ngDecl instanceof SdCliBbNgPipeMetadata) {
                      resultItem.pipeNames.push(modExpMeta.ngDecl.pipeName);
                    }
                  }
                }
                else {
                  throw new NeverEntryError();
                }
              }

              result.push(resultItem);
            }
          }
        }
      }
    }

    return result;
  }

  private _getTsGenNgModulePreset(): { modules: ITsNgPresetModuleDef[]; sources: ITsNgPresetSourceDef[] } {
    const fileMetas = this._tsMeta.getFileMetas();

    const result: { modules: ITsNgPresetModuleDef[]; sources: ITsNgPresetSourceDef[] } = { modules: [], sources: [] };

    for (const fileMeta of fileMetas) {
      if (!this._srcDirRelPaths.some((item) => fileMeta.filePath.startsWith(path.resolve(this._srcPath, item)))) {
        continue;
      }

      for (const cls of fileMeta.directExportClasses) {
        if (cls.target.ngDecl) {
          if (cls.target.ngDecl instanceof SdCliTsNgInjectableMetadata) {
            if (cls.target.ngDecl.providedIn === "root") {
              continue;
            }
          }

          const moduleClassName = cls.exportedName + "Module";
          const moduleFilePath = path.resolve(this._modulesPath, path.relative(this._srcPath, path.dirname(fileMeta.filePath)), moduleClassName);

          result.sources.push({
            filePath: fileMeta.filePath,
            name: cls.exportedName,
            module: {
              filePath: moduleFilePath,
              name: moduleClassName
            },
            imports: fileMeta.imports,
            template: "template" in cls.target.ngDecl ? cls.target.ngDecl.template : undefined,
            isProvider: cls.target.ngDecl instanceof SdCliTsNgInjectableMetadata
          });

          result.modules.push({
            filePath: moduleFilePath,
            name: moduleClassName,
            source: {
              filePath: fileMeta.filePath,
              name: cls.exportedName
            },
            selector: "selector" in cls.target.ngDecl ? cls.target.ngDecl.selector : undefined,
            pipeName: "pipeName" in cls.target.ngDecl ? cls.target.ngDecl.pipeName : undefined
          });
        }
      }
    }

    return result;
  }

  private _getGenNgModuleDefs(bbModules: IBbNgModuleDef[], presetModules: ITsNgPresetModuleDef[], presetSources: ITsNgPresetSourceDef[]): ITsGenNgModuleDef[] {
    const result: ITsGenNgModuleDef[] = [];

    for (const el of presetSources) {
      const imports: TSdCliMetaRef[] = [];
      for (const imp of el.imports) {
        if ("moduleName" in imp) {
          for (const mod of bbModules) {
            if (mod.exports.some((item) => item.moduleName === imp.moduleName && item.name === imp.name)) {
              imports.push({ moduleName: mod.moduleName, name: mod.name, __TDeclRef__: "__TDeclRef__" });
            }
            if (mod.providers.some((item) => item.moduleName === imp.moduleName && item.name === imp.name)) {
              imports.push({ moduleName: mod.moduleName, name: mod.name, __TDeclRef__: "__TDeclRef__" });
            }
          }
        }
        else {
          for (const mod of presetModules) {
            if (mod.source && mod.source.filePath === imp.filePath && mod.source.name === imp.name) {
              imports.push({ filePath: mod.filePath, name: mod.name, __TDeclRef__: "__TDeclRef__" });
            }
          }
        }
      }

      if (el.template !== undefined) {
        const templateDOM = new JSDOM(el.template);

        for (const mod of bbModules) {
          for (const selector of mod.selectors) {
            if (
              templateDOM.window.document.querySelector([
                selector,
                selector.replace(/\[/g, "[\\[").replace(/]/g, "\\]]"),
                selector.replace(/\[/g, "[\\(").replace(/]/g, "\\)]")
              ].join(", ")) != null
            ) {
              imports.push({ moduleName: mod.moduleName, name: mod.name, __TDeclRef__: "__TDeclRef__" });
            }
          }

          for (const pipeName of mod.pipeNames) {
            if (new RegExp("| *" + pipeName + "[^\\w]").test(el.template)) {
              imports.push({ moduleName: mod.moduleName, name: mod.name, __TDeclRef__: "__TDeclRef__" });
            }
          }
        }

        for (const mod of presetModules) {
          if (mod.selector !== undefined) {
            if (
              templateDOM.window.document.querySelector([
                mod.selector,
                mod.selector.replace(/\[/g, "[\\[").replace(/]/g, "\\]]"),
                mod.selector.replace(/\[/g, "[\\(").replace(/]/g, "\\)]")
              ].join(", ")) != null
            ) {
              imports.push({ filePath: mod.filePath, name: mod.name, __TDeclRef__: "__TDeclRef__" });
            }
          }

          if (mod.pipeName !== undefined) {
            if (new RegExp("| *" + mod.pipeName + "[^\\w]").test(el.template)) {
              imports.push({ filePath: mod.filePath, name: mod.name, __TDeclRef__: "__TDeclRef__" });
            }
          }
        }
      }

      result.push({
        filePath: el.module.filePath,
        name: el.module.name,
        imports: imports.distinct(),
        exports: el.isProvider ? [] : [{ filePath: el.filePath, name: el.name }],
        providers: el.isProvider ? [{ filePath: el.filePath, name: el.name }] : []
      });
    }

    return result;
  }

  private async _genFileAsync(mods: ITsGenNgModuleDef[]): Promise<void> {
    for (const mod of mods) {
      const importMap = [...mod.imports, ...mod.exports, ...mod.providers]
        .map((item) => ({
          moduleName: "moduleName" in item ? item.moduleName : this._getImportModuleName(mod.filePath, item.filePath),
          name: item.name
        }))
        .groupBy((item) => item.moduleName)
        .toMap((item) => item.key, (item) => item.values.map((v) => v.name));
      importMap.getOrCreate("@angular/core", []).push("NgModule");

      const importTexts: string[] = [];
      for (const moduleName of Array.from(importMap.keys()).orderBy()) {
        const targetNames = importMap.get(moduleName)!.distinct();
        if (targetNames.length === 0) continue;
        importTexts.push(`import { ${targetNames.join(", ")} } from "${moduleName}";`);
      }

      const content = `
${importTexts.join(os.EOL)}

@NgModule({
  imports: [${mod.imports.map((item) => item.name).orderBy().join(", ")}],
  declarations: [${mod.exports.map((item) => item.name).distinct().orderBy().join(", ")}],
  exports: [${mod.exports.map((item) => item.name).distinct().orderBy().join(", ")}],
  providers: [${mod.providers.map((item) => item.name).distinct().orderBy().join(", ")}]
})
export class ${mod.name} {
}`.trim();

      if (this._fileWriterCache.get(mod.filePath) !== content) {
        await FsUtil.writeFileAsync(mod.filePath + ".ts", content);
        this._fileWriterCache.set(mod.filePath, content);
      }
    }
  }

  private _getImportModuleName(mainFilePath: string, importFilePath: string): string {
    const filePath = PathUtil.posix(path.relative(path.dirname(mainFilePath), importFilePath).replace(/\.ts$/, ""));
    return filePath.startsWith(".") ? filePath : "./" + filePath;
  }
}

interface IBbNgModuleDef {
  moduleName: string;
  name: string;
  providers: { moduleName: string; name: string }[];
  exports: { moduleName: string; name: string }[];
  selectors: string[];
  pipeNames: string[];
}

interface ITsNgPresetModuleDef {
  filePath: string;
  name: string;
  source?: { filePath: string; name: string };
  selector?: string;
  pipeName?: string;
}

interface ITsNgPresetSourceDef {
  filePath: string;
  name: string;
  module: { filePath: string; name: string };
  imports: TSdCliMetaRef[];
  template?: string;
  isProvider: boolean;
}

interface ITsGenNgModuleDef {
  filePath: string;
  name: string;
  imports: TSdCliMetaRef[];
  exports: { filePath: string; name: string }[];
  providers: { filePath: string; name: string }[];
}
