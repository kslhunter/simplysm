import { SdCliTsRootMetadata } from "./typescript/SdCliTsRootMetadata";
import { SdCliBbRootMetadata, TSdCliBbMetadata } from "./babel/SdCliBbRootMetadata";
import { SdCliBbClassMetadata, SdCliBbObjectMetadata } from "./babel/TSdCliBbTypeMetadata";
import {
  SdCliBbNgComponentMetadata,
  SdCliBbNgDirectiveMetadata,
  SdCliBbNgModuleMetadata,
  SdCliBbNgPipeMetadata
} from "./babel/TSdCliBbNgMetadata";
import { NeverEntryError, StringUtil } from "@simplysm/sd-core-common";
import { TSdCliMetaRef } from "./commons";
import { SdCliTsNgInjectableMetadata } from "./typescript/SdCliTsFileMetadata";
import path from "path";
import { JSDOM } from "jsdom";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import os from "os";

// TODO: 에러 메시지 처리
// TODO: forRoot에 있는 Provider 처리??
export class SdCliNgModuleGenerator {
  private readonly _bbMeta: SdCliBbRootMetadata;
  private readonly _tsMeta: SdCliTsRootMetadata;

  private readonly _srcPath: string;
  private readonly _modulesPath: string;

  private readonly _fileWriterCache = new Map<string, string>();

  public constructor(packagePath: string,
                     private readonly _srcDirRelPaths: string[],
                     private readonly _routeOpts: {
                       glob: string;
                       fileEndsWith: string;
                       rootClassName: string;
                     } | undefined) {
    this._srcPath = path.resolve(packagePath, "src");
    this._modulesPath = path.resolve(packagePath, "src", "_modules");

    this._bbMeta = new SdCliBbRootMetadata(packagePath);
    this._tsMeta = new SdCliTsRootMetadata(packagePath);

    const glob = FsUtil.glob(path.resolve(this._modulesPath, "**", "*.ts"));
    for (const currFilePath of glob) {
      const content = FsUtil.readFile(currFilePath);
      this._fileWriterCache.set(currFilePath, content);
    }
  }

  public removeCaches(changedFilePaths: string[]): void {
    this._bbMeta.removeCaches(changedFilePaths);
    this._tsMeta.removeCaches(changedFilePaths);
    for (const changedFilePath of changedFilePaths) {
      if (this._fileWriterCache.has(changedFilePath) && !FsUtil.exists(changedFilePath)) {
        this._fileWriterCache.delete(changedFilePath);
      }
    }
  }

  public async runAsync(): Promise<void> {
    const bbNgModules = this._getBbNgModuleDefs();
    const tsPreset = this._getTsGenNgModulePreset();

    const genNgRoutingModules = await this._getGenNgRoutingModuleDefsAsync();
    const genNgModules = this._getGenNgModuleDefs(bbNgModules, tsPreset.modules, tsPreset.sources);

    const files = [
      ...this._getGenNgRoutingModuleFiles(genNgRoutingModules),
      ...this._getGenNgModuleFiles(genNgModules)
    ];

    await this._writeFilesAsync(files);
  }

  private _findBbMetasFromMeta(srcMeta: TSdCliBbMetadata): TSdCliBbMetadata[] {
    const metaTmp = typeof srcMeta !== "string" && "__TSdCliMetaRef__" in srcMeta ? this._bbMeta.findMeta(srcMeta) : srcMeta;
    return metaTmp instanceof Array ? metaTmp : [metaTmp];
  }

  private _getBbNgModuleDefs(): IBbNgModuleDef[] {
    const entryRecord = this._bbMeta.getEntryFileMetaRecord();
    const result: IBbNgModuleDef[] = [];

    for (const moduleName of Object.keys(entryRecord)) {
      const fileMeta = entryRecord[moduleName];
      for (const exp of fileMeta.exports) {
        const metas = this._findBbMetasFromMeta(exp.target);
        for (const meta of metas) {
          if (meta instanceof SdCliBbClassMetadata) {
            if (meta.ngDecl instanceof SdCliBbNgModuleMetadata) {
              const ngDecl = meta.ngDecl;

              const resultItem: IBbNgModuleDef = {
                moduleName,
                name: exp.exportedName === "*" ? meta.name : exp.exportedName,
                providers: [],
                exports: [],
                selectors: [],
                pipeNames: []
              };

              for (const modProv of ngDecl.def.providers) {
                const modProvMetas = this._findBbMetasFromMeta(modProv);
                if (modProvMetas.length === 0) {
                  throw new NeverEntryError();
                }

                for (const modProvMeta of modProvMetas) {
                  if (modProvMeta instanceof SdCliBbClassMetadata) {
                    const ref = this._bbMeta.findExportRef({
                      filePath: modProvMeta.filePath,
                      name: modProvMeta.name
                    });
                    if (ref) {
                      resultItem.providers.push(ref);
                    }
                  }
                  else if (modProvMeta instanceof SdCliBbObjectMetadata) {
                    // 무시
                  }
                  else {
                    throw new NeverEntryError();
                  }
                }
              }

              for (const modExp of ngDecl.def.exports) {
                const modExpMetas = this._findBbMetasFromMeta(modExp);
                if (modExpMetas.length === 0) {
                  throw new NeverEntryError();
                }

                for (const modExpMeta of modExpMetas) {
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
                  else {
                    throw new NeverEntryError();
                  }
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
              imports.push({ moduleName: mod.moduleName, name: mod.name, __TSdCliMetaRef__: "__TSdCliMetaRef__" });
            }
            if (mod.providers.some((item) => item.moduleName === imp.moduleName && item.name === imp.name)) {
              imports.push({ moduleName: mod.moduleName, name: mod.name, __TSdCliMetaRef__: "__TSdCliMetaRef__" });
            }
          }
        }
        else {
          for (const mod of presetModules) {
            if (mod.source && mod.source.filePath === imp.filePath && mod.source.name === imp.name) {
              imports.push({ filePath: mod.filePath, name: mod.name, __TSdCliMetaRef__: "__TSdCliMetaRef__" });
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
              imports.push({ moduleName: mod.moduleName, name: mod.name, __TSdCliMetaRef__: "__TSdCliMetaRef__" });
            }
          }

          for (const pipeName of mod.pipeNames) {
            if (new RegExp("| *" + pipeName + "[^\\w]").test(el.template)) {
              imports.push({ moduleName: mod.moduleName, name: mod.name, __TSdCliMetaRef__: "__TSdCliMetaRef__" });
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
              imports.push({ filePath: mod.filePath, name: mod.name, __TSdCliMetaRef__: "__TSdCliMetaRef__" });
            }
          }

          if (mod.pipeName !== undefined) {
            if (new RegExp("| *" + mod.pipeName + "[^\\w]").test(el.template)) {
              imports.push({ filePath: mod.filePath, name: mod.name, __TSdCliMetaRef__: "__TSdCliMetaRef__" });
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

  private async _getGenNgRoutingModuleDefsAsync(): Promise<TTsGenNgRoutingModuleDef[]> {
    if (this._routeOpts === undefined) return [];

    const result: TTsGenNgRoutingModuleDef[] = [];

    const filePaths = await FsUtil.globAsync(path.resolve(this._srcPath, this._routeOpts.glob));
    for (const filePath of filePaths) {
      const sourceClassName = path.basename(filePath, path.extname(filePath));
      if (sourceClassName === this._routeOpts.rootClassName) {
        const childDirName = StringUtil.toKebabCase(sourceClassName.slice(0, -this._routeOpts.fileEndsWith.length));
        const childDirPath = path.resolve(path.dirname(filePath), childDirName);

        result.push({
          filePath: path.resolve(this._srcPath, "_routes"),
          children: await this._getGenNgRoutingModuleDefChildrenAsync(childDirPath)
        });
      }
      else {
        const routingModuleClassName = sourceClassName + "RoutingModule";
        const routingModuleFilePath = path.resolve(this._modulesPath, path.relative(this._srcPath, path.dirname(filePath)), routingModuleClassName);
        const childDirName = StringUtil.toKebabCase(sourceClassName.slice(0, -this._routeOpts.fileEndsWith.length));
        const childDirPath = path.resolve(path.dirname(filePath), childDirName);

        result.push({
          filePath: routingModuleFilePath,
          name: routingModuleClassName,
          component: { filePath: filePath.replace(/\.ts$/, ""), name: sourceClassName },
          children: FsUtil.exists(childDirPath) ? await this._getGenNgRoutingModuleDefChildrenAsync(childDirPath) : undefined
        });
      }
    }

    return result;
  }

  private async _getGenNgRoutingModuleDefChildrenAsync(rootPath: string): Promise<TTsGenNgRoutingModuleDefChild[]> {
    const result: TTsGenNgRoutingModuleDefChild[] = [];

    const childNames = await FsUtil.readdirAsync(rootPath);
    for (const childName of childNames) {
      if (!FsUtil.stat(path.resolve(rootPath, childName)).isDirectory()) { // 파일
        const sourceFilePath = path.resolve(rootPath, childName);
        const sourceClassName = path.basename(sourceFilePath, path.extname(childName));
        const moduleClassName = sourceClassName + "Module";
        const moduleFilePath = path.resolve(this._modulesPath, path.relative(this._srcPath, path.dirname(sourceFilePath)), moduleClassName);

        result.push({
          path: StringUtil.toKebabCase(childName.substring(0, childName.length - 7)),
          target: { filePath: moduleFilePath, name: moduleClassName }
        });
      }
      else if (!FsUtil.exists(path.resolve(rootPath, StringUtil.toPascalCase(childName) + this._routeOpts!.fileEndsWith + ".ts"))) { // 파일없는 디렉토리
        result.push({
          path: childName,
          children: await this._getGenNgRoutingModuleDefChildrenAsync(path.resolve(rootPath, childName))
        });
      }
    }

    return result;
  }

  private _getGenNgRoutingModuleFiles(defs: TTsGenNgRoutingModuleDef[]): { filePath: string; content: string }[] {
    const result: { filePath: string; content: string }[] = [];

    for (const def of defs) {
      const fn = (children: TTsGenNgRoutingModuleDefChild[]): string => {
        let fnResult = "[\n";
        for (const child of children) {
          fnResult += "  {\n";
          fnResult += `    path: "${child.path}",\n`;
          if ("target" in child) {
            fnResult += `    loadChildren: async () => await import("${this._getImportModuleName(def.filePath, child.target.filePath)}").then((m) => m.${child.target.name})\n`;
          }
          else {
            fnResult += `    children: ${fn(child.children).replace(/\n/g, "\n  ")}\n`;
          }
          fnResult += "  },\n";
        }
        fnResult = fnResult.slice(0, -2) + "\n";
        fnResult += "]";

        return fnResult;
      };

      const content = "component" in def ? `
import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SdCanDeactivateGuard } from "@simplysm/sd-angular";
import { ${def.component.name} } from "${this._getImportModuleName(def.filePath, def.component.filePath)}";

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: "",
        component: ${def.component.name},
        canDeactivate: [SdCanDeactivateGuard]${def.children ? `,
        children: ${fn(def.children).replace(/\n/g, "\n        ")}` : ""}
      }
    ])
  ],
  exports: [RouterModule]
})
export class ${def.name} {
}`.trim() : `
import { Routes } from "@angular/router";

export const routes: Routes = ${fn(def.children)};
`.trim();

      result.push({ filePath: def.filePath + ".ts", content });
    }

    return result;
  }

  private _getGenNgModuleFiles(mods: ITsGenNgModuleDef[]): { filePath: string; content: string }[] {
    const result: { filePath: string; content: string }[] = [];

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

      const moduleImportNames = mod.imports.map((item) => item.name);
      if (
        this._routeOpts !== undefined
        && mod.filePath.endsWith(this._routeOpts.fileEndsWith + "Module")
        && mod.name !== this._routeOpts.rootClassName + "Module"
      ) {
        const routingModuleName = mod.name.replace(/Module$/, "RoutingModule");
        importTexts.push(`import { ${routingModuleName} } from "./${routingModuleName}";`);
        moduleImportNames.push(routingModuleName);
      }

      const content = `
${importTexts.join(os.EOL)}

@NgModule({
  imports: [${moduleImportNames.orderBy().join(", ")}],
  declarations: [${mod.exports.map((item) => item.name).distinct().orderBy().join(", ")}],
  exports: [${mod.exports.map((item) => item.name).distinct().orderBy().join(", ")}],
  providers: [${mod.providers.map((item) => item.name).distinct().orderBy().join(", ")}]
})
export class ${mod.name} {
}`.trim();

      result.push({ filePath: mod.filePath + ".ts", content });
    }

    return result;
  }

  private async _writeFilesAsync(files: { filePath: string; content: string }[]): Promise<void> {
    for (const file of files) {
      if (this._fileWriterCache.get(file.filePath) !== file.content) {
        await FsUtil.writeFileAsync(file.filePath, file.content);
        this._fileWriterCache.set(file.filePath, file.content);
      }
    }

    const glob = await FsUtil.globAsync(path.resolve(this._modulesPath, "**", "*"));
    for (const currFilePath of glob) {
      if (!files.some((item) => item.filePath.startsWith(currFilePath))) {
        await FsUtil.removeAsync(currFilePath);
        this._fileWriterCache.delete(currFilePath);
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

type TTsGenNgRoutingModuleDef = {
  filePath: string;
  name: string;
  component: { filePath: string; name: string };
  children?: TTsGenNgRoutingModuleDefChild[];
} | {
  filePath: string;
  children: TTsGenNgRoutingModuleDefChild[];
};

type TTsGenNgRoutingModuleDefChild = {
  path: string;
  target: { filePath: string; name: string };
} | {
  path: string;
  children: TTsGenNgRoutingModuleDefChild[];
};
