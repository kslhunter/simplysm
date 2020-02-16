import {NotImplementError} from "@simplysm/sd-core-common";
import * as path from "path";
import * as ts from "typescript";
import {JSDOM} from "jsdom";
import {FsUtil, Logger} from "@simplysm/sd-core-node";
import {SdMetadataCollector} from "../metadata/SdMetadataCollector";
import {SdMetadataBase, TSdMetadata} from "../metadata/commons";
import {SdClassMetadata} from "../metadata/SdClassMetadata";
import {SdObjectMetadata} from "../metadata/SdObjectMetadata";
import {SdArrayMetadata} from "../metadata/SdArrayMetadata";
import {SdFunctionMetadata} from "../metadata/SdFunctionMetadata";
import {SdCallMetadata} from "../metadata/SdCallMetadata";

export class SdNgModuleGenerator {
  private readonly _defs: ISdNgModuleDef[] = [];
  public infos: ISdNgModuleInfo[] = [];
  private readonly _cacheObj: { [filePath: string]: string } = {};
  private readonly _modulesGenPath: string;

  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdNgModuleGenerator"]);

  public constructor(private readonly _metadata: SdMetadataCollector,
                     private readonly _srcPath: string,
                     private readonly _distPath: string) {
    this._modulesGenPath = path.resolve(this._srcPath, "_modules");

    if (FsUtil.exists(this._modulesGenPath)) {
      const filePaths = FsUtil.glob(path.resolve(this._modulesGenPath, "**", "*.ts"));
      for (const filePath of filePaths) {
        this._cacheObj[path.resolve(filePath)] = FsUtil.readFile(filePath);
      }
    }
  }

  public async generateAsync(program: ts.Program, changedMetadataFilePaths?: string[]): Promise<boolean> {
    this._logger.debug("모듈 정의 목록 생성...");
    this._configDefs(changedMetadataFilePaths);

    this._logger.debug("새로 생성할 모듈 정보 목록 생성...");
    this._configInfos(program);

    this._logger.debug("새로 생성할 모듈의 IMPORT 순환 오류 해결 (모듈 병합)...");
    this._mergeImportCircleInfos();

    this._logger.debug("새로운 모듈 파일쓰기...");
    const changed1 = await this._writeFilesAsync();

    this._logger.debug("안쓰는 모듈 삭제...");
    const changed2 = await this._removeDeletedModuleFileAsync();

    this._logger.debug(`완료 ${changed1 || changed2 ? "(변경됨)" : "(변경되지 않음)"}`);
    return changed1 || changed2;
  }

  private _configDefs(changedMetadataFilePaths?: string[]): void {
    const modules = changedMetadataFilePaths
      ? this._metadata.modules.filter(item => changedMetadataFilePaths.map(item1 => path.resolve(item1)).includes(path.resolve(item.filePath)))
      : this._metadata.modules;

    for (const module of modules) {
      for (const moduleItemKey of Object.keys(module.items)) {
        const moduleItem = module.items[moduleItemKey];

        if (!(moduleItem instanceof SdClassMetadata)) continue;

        const isNgModuleClass = moduleItem.decorators?.some(item =>
          item.expression.module === "@angular/core" &&
          item.expression.name === "NgModule"
        );

        const def: ISdNgModuleDef = {
          moduleName: "",
          className: "",
          filePath: "",
          isLibrary: module.isLibrary,
          isForGenerate: !module.isLibrary && !(path.dirname(module.filePath) === this._distPath && isNgModuleClass),
          exports: []
        };

        if (!def.isForGenerate) {
          const decorators = moduleItem.decorators;
          if (!decorators) continue;

          const decorator = moduleItem.decorators.single(item =>
            item.expression.module === "@angular/core" &&
            item.expression.name === "NgModule"
          );
          if (!decorator) continue;

          const arg = decorator.arguments && decorator.arguments[0];
          if (!arg) throw new NotImplementError();
          if (!(arg instanceof SdObjectMetadata)) throw new NotImplementError();

          const exports = arg?.get("exports");
          if (exports) {
            if (!(exports instanceof SdArrayMetadata)) throw new NotImplementError();

            for (const export_ of Array.from(exports)) {
              if (!(export_ instanceof SdClassMetadata)) {
                throw new NotImplementError();
              }
              def.exports.push(export_);
            }
          }

          const providers = arg?.get("providers");
          if (providers) {
            if (!(providers instanceof SdArrayMetadata)) throw new NotImplementError();

            const providerClassMetadataList = this._getNgModuleProviderClassMetadataList(providers);
            def.exports.push(...providerClassMetadataList);
          }

          for (const staticKey of Object.keys(moduleItem.statics)) {
            const static_ = moduleItem.statics[staticKey];
            if (!(static_ instanceof SdFunctionMetadata)) continue;
            if (!static_.value) throw new NotImplementError();
            if (!(static_.value instanceof SdObjectMetadata)) {
              throw new NotImplementError();
            }

            const staticProviders = static_.value.get("providers");
            if (!staticProviders) continue;
            if (!(staticProviders instanceof SdArrayMetadata)) throw new NotImplementError();

            const providerClassMetadataList = this._getNgModuleProviderClassMetadataList(staticProviders);
            def.exports.push(...providerClassMetadataList);
          }

          if (!moduleItem.name) throw new NotImplementError();
          def.className = moduleItem.name;
          def.moduleName = moduleItem.module.name;

          if (def.isLibrary) {
            def.filePath = moduleItem.module.filePath
              .replace(/\.metadata\.json$/, ".d.ts");
          }
          else {
            def.filePath = path.resolve(
              this._srcPath,
              path.relative(this._distPath, moduleItem.module.filePath)
            ).replace(/\.metadata\.json$/, ".ts");
          }
        }
        else {
          // 'src/AppPage.ts'를 제외시키지 말아야 함
          // if (path.dirname(moduleItem.module.filePath) === this._distPath) continue;

          const decorators = moduleItem.decorators;
          if (!decorators) continue;

          const decorator = moduleItem.decorators.single(item =>
            item.expression.module === "@angular/core" &&
            [
              "Component",
              "Directive",
              "Pipe"
            ].includes(item.expression.name)
          );
          if (!decorator) continue;

          def.exports.push(moduleItem);

          if (!moduleItem.name) throw new NotImplementError();
          def.className = moduleItem.name + "Module";
          def.moduleName = moduleItem.module.name;
          def.filePath = path.resolve(
            this._modulesGenPath,
            path.relative(this._distPath, moduleItem.module.filePath)
          ).replace(/\.metadata\.json$/, "Module.ts");
        }

        if (!def.className) throw new NotImplementError();
        if (!def.moduleName) throw new NotImplementError();
        if (!def.filePath) throw new NotImplementError();
        if (def.exports.length > 0) {
          const prevDef = this._defs.single(item =>
            item.className === def.className &&
            item.moduleName === def.moduleName &&
            item.filePath === def.filePath &&
            item.isLibrary === def.isLibrary &&
            item.isForGenerate === def.isForGenerate
          );
          if (prevDef) {
            prevDef.exports.push(...def.exports);
            prevDef.exports = prevDef.exports.distinct(true);
          }
          else {
            this._defs.push(def);
          }
        }
      }
    }
  }

  private _configInfos(program: ts.Program): void {
    this.infos = [];

    for (const def of this._defs) {
      if (!def.isForGenerate) continue;

      const info: ISdNgModuleInfo = {
        filePath: def.filePath,
        className: def.className,
        importObj: {"@angular/core": ["NgModule"]},
        modules: [],
        declarations: [],
        exports: [],
        entryComponents: []
      };

      for (const export_ of def.exports) {
        if (!export_.name) throw new NotImplementError();
        const exportName = export_.name;

        // 1

        const sourceFilePath = this._getSourceFilePath(export_);
        const moduleSourceFilePath = this._getModuleSourcePath(sourceFilePath);
        const classRequirePath = path.relative(path.dirname(moduleSourceFilePath), sourceFilePath)
          .replace(/\\/g, "/")
          .replace(/\.ts$/, "");
        info.importObj[classRequirePath] = info.importObj[exportName] ?? [];
        if (!info.importObj[classRequirePath].includes(exportName)) {
          info.importObj[classRequirePath].push(exportName);
        }


        // 2

        if (!export_.decorators) throw new NotImplementError();
        if (
          this._hasDecorator(export_, "@angular/core", "Component") ||
          this._hasDecorator(export_, "@angular/core", "Pipe") ||
          this._hasDecorator(export_, "@angular/core", "Directive")
        ) {
          info.exports.push(exportName);
          info.declarations.push(exportName);
          if (exportName.endsWith("PrintTemplate") || exportName.endsWith("Modal") || exportName.endsWith("EntryControl")) {
            info.entryComponents.push(exportName);
          }
        }

        // 3

        const sourceFile = program.getSourceFile(sourceFilePath);
        if (!sourceFile) throw new NotImplementError();
        const importNodes = sourceFile["imports"];
        if (importNodes) {
          if (!(importNodes instanceof Array)) throw new NotImplementError();

          for (const importNode of importNodes as any[]) {
            const importModuleNameOrFilePath = importNode.text?.startsWith(".")
              ? path.resolve(this._distPath, path.relative(this._srcPath, path.resolve(path.dirname(sourceFilePath), importNode.text))) + ".metadata.json"
              : importNode.text;
            if (!importModuleNameOrFilePath) throw new NotImplementError();
            if (importModuleNameOrFilePath === "tslib") continue;

            const importClassNames = importNode.parent.importClause?.namedBindings?.elements?.map((item: any) => item.name.text);

            const needModuleDefs = this._defs.filter(moduleDef =>
              moduleDef.exports.some(ngModuleExport =>
                (
                  (ngModuleExport.module.filePath === importModuleNameOrFilePath) ||
                  (ngModuleExport.module.name === importModuleNameOrFilePath)
                ) &&
                importClassNames ? importClassNames.includes(ngModuleExport.name) : true
              )
            );

            for (const needModuleDef of needModuleDefs) {
              const importInfo = this._getNgModuleImportInfo(def, needModuleDef);

              info.modules.push(importInfo.targetName);

              const requirePath = importInfo.requirePath;
              info.importObj[requirePath] = info.importObj[requirePath] ?? [];
              if (!info.importObj[requirePath].includes(importInfo.targetName)) {
                info.importObj[requirePath].push(importInfo.targetName);
              }
            }
          }
        }

        // 4
        const decorator = Array.from(export_.decorators)
          .single(item =>
            item.expression.module === "@angular/core" &&
            item.expression.name === "Component"
          );
        if (decorator) {
          const arg = decorator.arguments && decorator.arguments[0];
          if (!arg) throw new NotImplementError();
          if (!(arg instanceof SdObjectMetadata)) throw new NotImplementError();

          const templateText = arg.get("template");
          if (templateText) {
            if (typeof templateText !== "string") throw new NotImplementError();
            const templateDOM = new JSDOM(templateText);

            const needModuleDefs = this._defs.filter(moduleDef =>
              moduleDef.exports.some(exp =>
                exp.decorators &&
                exp.decorators.some(dec =>
                  dec.expression.module === "@angular/core" &&
                  (
                    dec.expression.name === "Component" ||
                    dec.expression.name === "Directive"
                  ) &&
                  dec.arguments &&
                  dec.arguments[0] &&
                  dec.arguments[0] instanceof SdObjectMetadata &&
                  dec.arguments[0].get("selector") &&
                  typeof dec.arguments[0].get("selector") === "string" &&
                  templateDOM.window.document.querySelector([
                    (dec.arguments[0].get("selector") as string),
                    (dec.arguments[0].get("selector") as string)
                      .replace(/\[/g, "[\\[")
                      .replace(/]/g, "\\]]"),
                    (dec.arguments[0].get("selector") as string)
                      .replace(/\[/g, "[\\(")
                      .replace(/]/g, "\\)]"),
                    (dec.arguments[0].get("selector") as string)
                      .replace(/\[/g, "[\\*")
                  ].join(", "))
                )
              )
            );

            for (const needModuleDef of needModuleDefs) {
              const importInfo = this._getNgModuleImportInfo(def, needModuleDef);

              info.modules.push(importInfo.targetName);

              const requirePath = importInfo.requirePath;
              info.importObj[requirePath] = info.importObj[requirePath] ?? [];
              if (!info.importObj[requirePath].includes(importInfo.targetName)) {
                info.importObj[requirePath].push(importInfo.targetName);
              }
            }
          }
        }
      }

      this.infos.push(info);
    }
  }

  private _mergeImportCircleInfos(): void {
    let alreadyImports: string[] = [];
    const doing = () => {
      const importFilePathObj: { [filePath: string]: string[] } = {};
      for (const info of this.infos) {
        importFilePathObj[info.filePath] = Object.keys(info.importObj)
          .filter(key => key.startsWith("."))
          .map(key => path.resolve(path.dirname(info.filePath), key) + ".ts");
      }

      const checkIsImportCircle = (filePath: string) => {
        if (alreadyImports.includes(filePath)) {
          return false;
        }

        if (importFilePathObj[filePath]) {
          alreadyImports.push(filePath);

          for (const subFilePath of importFilePathObj[filePath]) {
            const result = checkIsImportCircle(subFilePath);
            if (!result) return false;
          }

          alreadyImports.remove(filePath);
        }

        return true;
      };

      for (const filePath of Object.keys(importFilePathObj)) {
        const result = checkIsImportCircle(filePath);
        if (!result) return false;
      }

      return true;
    };

    while (!doing()) {
      // 첫번째 모듈에 다른 모듈 모두 병합
      const mergeInfos = this.infos.filter(item => alreadyImports.includes(item.filePath));
      let newInfo: ISdNgModuleInfo = mergeInfos[0];
      for (const mergeInfo of mergeInfos.slice(1).orderByDesc(item => item.className.length)) {
        if (Object.keys(newInfo.importObj).length < Object.keys(mergeInfo.importObj).length) {
          newInfo = mergeInfo;
        }
      }
      mergeInfos.remove(newInfo);

      for (const mergeInfo of mergeInfos) {
        for (const mergeInfoImportKey of Object.keys(mergeInfo.importObj)) {
          let newInfoImportKey: string;
          if (mergeInfoImportKey.startsWith(".")) {
            newInfoImportKey = path.relative(path.dirname(newInfo.filePath), path.resolve(path.dirname(mergeInfo.filePath), mergeInfoImportKey))
              .replace(/\\/g, "/");
            newInfoImportKey = newInfoImportKey.startsWith(".") ? newInfoImportKey : "./" + newInfoImportKey;
          }
          else {
            newInfoImportKey = mergeInfoImportKey;
          }

          newInfo.importObj[newInfoImportKey] = newInfo.importObj[newInfoImportKey] ?? [];
          newInfo.importObj[newInfoImportKey].push(...mergeInfo.importObj[mergeInfoImportKey]);
          newInfo.importObj[newInfoImportKey] = newInfo.importObj[newInfoImportKey].distinct();
        }

        newInfo.modules = [...newInfo.modules, ...mergeInfo.modules].distinct();
        newInfo.declarations = [...newInfo.declarations, ...mergeInfo.declarations].distinct();
        newInfo.exports = [...newInfo.exports, ...mergeInfo.exports].distinct();
        newInfo.entryComponents = [...newInfo.entryComponents, ...mergeInfo.entryComponents].distinct();
      }

      // 첫번째 모듈외 모든 모듈 삭제
      for (const mergeInfo of mergeInfos) {
        this.infos.remove(mergeInfo);
      }

      // 첫번째 모듈외 모든 모듈을 의존하고 있던 모든 다른 모듈에서, importObj/modules 를 새 모듈로 변경
      for (const info of this.infos) {
        const removeKeys = Object.keys(info.importObj)
          .filter(key => {
            const filePath = path.resolve(path.dirname(info.filePath), key) + ".ts";
            return mergeInfos.some(item => item.filePath === filePath);
          });
        if (removeKeys.length > 0) {
          for (const key of removeKeys) {
            for (const className of info.importObj[key]) {
              info.modules.remove(className);
            }
            delete info.importObj[key];
          }

          let newKey = path.relative(path.dirname(info.filePath), newInfo.filePath)
            .replace(/\.ts$/, "");
          newKey = newKey.startsWith(".") ? newKey : "./" + newKey;

          if (info !== newInfo) {
            info.importObj[newKey] = [newInfo.className];
            info.modules.push(newInfo.className);
            info.modules = info.modules.distinct();
          }
          else {
            delete info.importObj[newKey];
            info.modules.remove(newInfo.className);
          }
        }
      }

      alreadyImports = [];
    }
  }

  private async _writeFilesAsync(): Promise<boolean> {
    let changed = false;

    for (const info of this.infos) {
      if (info.declarations.length > 0) {
        // NgModule
        const importText = Object.keys(info.importObj)
          .map(key => `import {${info.importObj[key].distinct().join(", ")}} from "${key}";`);
        const ngModuleContent = `
${importText.join("\n")}

@NgModule({
  imports: [${info.modules.length > 0 ? "\n    " + info.modules.distinct().join(",\n    ") + "\n  " : ""}],
  declarations: [${info.declarations.length > 0 ? "\n    " + info.declarations.distinct().join(",\n    ") + "\n  " : ""}],
  exports: [${info.exports.length > 0 ? "\n    " + info.exports.distinct().join(",\n    ") + "\n  " : ""}],
  entryComponents: [${info.entryComponents.length > 0 ? "\n    " + info.entryComponents.distinct().join(",\n    ") + "\n  " : ""}]
})
export class ${info.className} {
}`.trim();

        if (this._cacheObj[info.filePath] !== ngModuleContent) {
          this._cacheObj[info.filePath] = ngModuleContent;
          await FsUtil.writeFileAsync(info.filePath, ngModuleContent);
          changed = true;
        }
      }
      else {
        if (this._cacheObj[info.filePath]) {
          await FsUtil.removeAsync(info.filePath);
          delete this._cacheObj[info.filePath];
          changed = true;
        }
      }
    }

    return changed;
  }

  private async _removeDeletedModuleFileAsync(): Promise<boolean> {
    let changed = false;

    for (const filePath of Object.keys(this._cacheObj)) {
      if (!this.infos.some(item => item.filePath === filePath)) {
        await FsUtil.removeAsync(filePath);
        delete this._cacheObj[filePath];
        changed = true;
      }
    }

    return changed;
  }

  private _getNgModuleImportInfo(def: ISdNgModuleDef, needDef: ISdNgModuleDef): { requirePath: string; targetName: string } {
    let requirePath = "";
    if (needDef.isLibrary) {
      requirePath = needDef.moduleName;
    }
    else {
      requirePath = path.relative(path.dirname(def.filePath), needDef.filePath)
        .replace(/\\/g, "/")
        .replace(/\.ts$/, "");
      if (!requirePath.startsWith(".")) {
        requirePath = "./" + requirePath;
      }
    }

    let targetName = needDef.className;

    if (requirePath === "@angular/platform-browser" && targetName === "BrowserModule") {
      requirePath = "@angular/common";
      targetName = "CommonModule";
    }

    return {requirePath, targetName};
  }

  private _getModuleSourcePath(sourceFilePath: string): string {
    const relativeSourceFilePath = path.relative(this._srcPath, sourceFilePath);
    return path.resolve(this._modulesGenPath, relativeSourceFilePath)
      .replace(/\.ts$/, "Module.ts");
  }

  private _getSourceFilePath(metadata: SdMetadataBase): string {
    return path.resolve(
      this._srcPath,
      path.relative(
        this._distPath,
        metadata.module.filePath.replace(/\.metadata\.json$/, ".ts")
      )
    );
  }

  private _hasDecorator(class_: SdClassMetadata, module: string, name: string): boolean {
    return class_.decorators.some(item =>
      item.expression.module === module &&
      item.expression.name === name
    );
  }

  private _getNgModuleProviderClassMetadataList(providers: TSdMetadata): SdClassMetadata[] {
    return (providers instanceof SdArrayMetadata ? Array.from(providers) : [providers])
      .mapMany(provider => {
        if (provider instanceof SdObjectMetadata) {
          const subProvider = provider.get("provide");
          if (!subProvider) throw new NotImplementError();
          return this._getNgModuleProviderClassMetadataList(subProvider);
        }
        else if (provider instanceof SdClassMetadata) {
          return [provider];
        }
        else if (provider instanceof SdCallMetadata) {
          const sdMetadata = this._metadata.getSdMetadata(provider.module, provider.metadata.expression);
          return this._getNgModuleProviderClassMetadataList(sdMetadata);
        }
        else if (provider instanceof SdFunctionMetadata) {
          return this._getNgModuleProviderClassMetadataList(provider.value);
        }
        else if (provider instanceof SdArrayMetadata || provider instanceof Array) {
          const result: SdClassMetadata[] = [];
          for (const providerItem of provider) {
            const p = this._getNgModuleProviderClassMetadataList(providerItem);
            result.push(...p);
          }
          return result;
        }
        else {
          throw new NotImplementError();
        }
      });
  }
}

export interface ISdNgModuleDef {
  moduleName: string;
  className: string;
  filePath: string;
  isLibrary: boolean;
  isForGenerate: boolean;
  exports: SdClassMetadata[];
}

export interface ISdNgModuleInfo {
  className: string;
  filePath: string;
  importObj: { [requirePath: string]: string[] };
  modules: string[];
  declarations: string[];
  exports: string[];
  entryComponents: string[];
}