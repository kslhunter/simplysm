import {SdClassMetadata} from "../metadata/SdClassMetadata";
import {SdMetadataCollector} from "../metadata/SdMetadataCollector";
import {FsUtils, IFileChangeInfo, Logger} from "@simplysm/sd-core-node";
import {NeverEntryError} from "@simplysm/sd-core-common";
import {isMetadataError, MetadataCollector} from "@angular/compiler-cli";
import * as ts from "typescript";
import * as path from "path";
import anymatch from "anymatch";
import {SdArrayMetadata} from "../metadata/SdArrayMetadata";
import {SdCallMetadata} from "../metadata/SdCallMetadata";
import {SdFunctionMetadata} from "../metadata/SdFunctionMetadata";
import {SdObjectMetadata} from "../metadata/SdObjectMetadata";
import {TSdMetadata} from "../metadata/commons";
import * as os from "os";
import {JSDOM} from "jsdom";

export class SdNgGenerator {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "gen-ng"]);

  private readonly _metadataCollector: SdMetadataCollector = new SdMetadataCollector();

  private readonly _defMapObj: { [key: string]: ISdNgModuleDef[] | undefined } = {};
  private _info?: { ngModules: ISdNgModuleInfo[]; ngRoutingModule: ISdNgRoutingModuleInfo[] };

  private readonly _outputCache: { [key: string]: string | undefined } = {};

  private readonly _pagesDirPath = path.resolve(this._srcPath, "pages");
  private readonly _modulesGenDirPath = path.resolve(this._srcPath, "_modules");
  private readonly _routesGenFilePath = path.resolve(this._srcPath, "_routes.ts");

  public constructor(private readonly _srcPath: string,
                     private readonly _excludes: string[]) {
  }

  public async updateAsync(program: { getSourceFile: (filePath: string) => ts.SourceFile | undefined },
                           changedInfos: IFileChangeInfo[]): Promise<ts.Diagnostic[]> {
    this._logger.debug(`변경사항 업데이트... (${changedInfos.length})`);

    const diagnostics: ts.Diagnostic[] = [];

    for (const changedInfo of changedInfos) {
      if (!path.relative(this._modulesGenDirPath, changedInfo.filePath).includes("..")) {
        continue;
      }

      if (changedInfo.type === "unlink") {
        this._metadataCollector.unregister(changedInfo.filePath);
      }
      else if (changedInfo.filePath.endsWith(".d.ts")) {
        const metadataFilePath = changedInfo.filePath.replace(/\.d\.ts$/, ".metadata.json");
        if (!FsUtils.exists(metadataFilePath)) continue;

        const metadata = await FsUtils.readJsonAsync(metadataFilePath);
        this._metadataCollector.register(changedInfo.filePath, metadata);
      }
      else if (changedInfo.filePath.endsWith(".ts")) {
        const sourceFile = program.getSourceFile(changedInfo.filePath);
        if (!sourceFile) {
          diagnostics.push({
            file: undefined,
            start: 0,
            messageText: `타입스크립트 파일을 분석할 수 없습니다. (${changedInfo.filePath})`,
            category: ts.DiagnosticCategory.Error,
            code: -1,
            length: undefined
          });
          this._metadataCollector.unregister(changedInfo.filePath);
          continue;
        }

        // 소스파일 'text' 관련 버그 픽스
        this._configNodesParent(sourceFile);

        let metadata;
        try {
          metadata = new MetadataCollector().getMetadata(
            sourceFile,
            false, // 에러를 아래에서 함수에서 걸러냄, true일 경우, Error 가 throw 됨
            (value, tsNode) => {
              if (isMetadataError(value)) {
                diagnostics.push({
                  file: sourceFile,
                  start: tsNode.parent ? tsNode.getStart() : tsNode.pos,
                  messageText: value.message,
                  category: ts.DiagnosticCategory.Error,
                  code: -2,
                  length: undefined
                });
              }

              return value;
            }
          );
        }
        catch (err) {
          diagnostics.push({
            file: sourceFile,
            start: 0,
            messageText: err.stack,
            category: ts.DiagnosticCategory.Error,
            code: -3,
            length: undefined
          });
        }

        if (metadata) {
          this._metadataCollector.register(changedInfo.filePath, metadata);
        }
        else {
          this._metadataCollector.unregister(changedInfo.filePath);
        }
      }
    }

    this._logger.debug("변경사항 업데이트 완료");

    this._logger.debug("모듈 정의 구성...");

    for (const changedInfo of changedInfos) {
      if (Object.keys(this._metadataCollector.moduleMapObj).includes(changedInfo.filePath)) {
        const sourceFile = program.getSourceFile(changedInfo.filePath);
        if (!sourceFile) throw new NeverEntryError();

        this._defMapObj[changedInfo.filePath] = this._getDefs(sourceFile);
      }
      else {
        delete this._defMapObj[changedInfo.filePath];
      }
    }

    this._logger.debug("모듈 정의 구성 완료");

    this._info = undefined;

    return diagnostics;
  }

  private _configNodesParent(node: ts.Node): void {
    if (node.getChildCount() <= 0) return;

    const children = node.getChildren();
    for (const childNode of children) {
      childNode.parent = childNode.parent ?? node;
      this._configNodesParent(childNode);
    }
  }

  private _getDefs(sourceFile: ts.SourceFile): ISdNgModuleDef[] {
    const filePath = path.resolve(sourceFile.fileName);

    const modules = this._metadataCollector.moduleMapObj[filePath];
    if (!modules) throw new NeverEntryError(filePath);

    const result: ISdNgModuleDef[] = [];
    for (const moduleMetadata of modules) {
      for (const moduleItemKey of Object.keys(moduleMetadata.items)) {
        const moduleItem = moduleMetadata.items[moduleItemKey];

        if (!(moduleItem instanceof SdClassMetadata)) continue;

        const isNgModuleClass = moduleItem.decorators.some(item => (
          item.expression.module === "@angular/core" &&
          item.expression.name === "NgModule"
        ));

        const def: ISdNgModuleDef = {
          sourceFile,

          isForGenerate: !filePath.endsWith(".d.ts") && !anymatch(this._excludes, filePath) && !isNgModuleClass,
          filePath: "",
          moduleName: moduleItem.module.name,
          className: "",
          exports: []
        };

        if (!def.isForGenerate) {
          const decorator = moduleItem.decorators.single(item => (
            item.expression.module === "@angular/core" &&
            item.expression.name === "NgModule"
          ));
          if (!decorator) continue;

          if (moduleItem.name === undefined) throw new NeverEntryError();
          def.className = moduleItem.name;
          def.filePath = filePath;

          const arg = decorator.arguments[0];
          if (arg === undefined) throw new NeverEntryError();
          if (!(arg instanceof SdObjectMetadata)) throw new NeverEntryError();

          const exports = arg.get("exports");
          if (exports !== undefined) {
            if (!(exports instanceof SdArrayMetadata)) throw new NeverEntryError();

            for (const exp of Array.from(exports)) {
              if (!(exp instanceof SdClassMetadata)) {
                throw new NeverEntryError(JSON.stringify(exp));
              }
              def.exports.push(exp);
            }
          }

          const providers = arg.get("providers");
          if (providers !== undefined) {
            if (!(providers instanceof SdArrayMetadata)) throw new NeverEntryError();

            const providerClassMetadataList = this._getNgModuleProviderClassMetadataList(providers);
            def.exports.push(...providerClassMetadataList);
          }

          for (const staticKey of Object.keys(moduleItem.statics)) {
            const stc = moduleItem.statics[staticKey];
            if (!(stc instanceof SdFunctionMetadata)) continue;
            if (stc.value === undefined) throw new NeverEntryError();
            if (!(stc.value instanceof SdObjectMetadata)) {
              throw new NeverEntryError();
            }

            const staticProviders = stc.value.get("providers");
            if (staticProviders === undefined) continue;
            if (!(staticProviders instanceof SdArrayMetadata)) throw new NeverEntryError();

            const providerClassMetadataList = this._getNgModuleProviderClassMetadataList(staticProviders);
            def.exports.push(...providerClassMetadataList);
          }
        }
        else {
          const decorator = moduleItem.decorators.single(item => (
            item.expression.module === "@angular/core" &&
            [
              "Component",
              "Directive",
              "Pipe",
              "Injectable"
            ].includes(item.expression.name)
          ));
          if (!decorator) continue;

          if (moduleItem.name === undefined) throw new NeverEntryError();
          def.className = moduleItem.name + "Module";
          def.filePath = path.resolve(
            this._modulesGenDirPath,
            path.relative(this._srcPath, moduleItem.module.filePath)
          ).replace(/\.ts$/, "Module.ts");


          if (!decorator.expression.name.endsWith("Injectable")) {
            def.exports.push(moduleItem);
          }
          else if (moduleItem.name.endsWith("Provider")) {
            const arg = decorator.arguments[0];
            if (arg === undefined) {
              def.exports.push(moduleItem);
            }
            else {
              if (!(arg instanceof SdObjectMetadata)) throw new NeverEntryError();

              const providedIn = arg.get("providedIn");
              if (providedIn !== "root") {
                def.exports.push(moduleItem);
              }
            }
          }
        }

        if (def.exports.length > 0) {
          result.push(def);
        }
      }
    }

    return result;
  }

  private _getNgModuleProviderClassMetadataList(providers: TSdMetadata): SdClassMetadata[] {
    return (providers instanceof SdArrayMetadata ? Array.from(providers) : [providers])
      .mapMany(provider => {
        if (provider instanceof SdObjectMetadata) {
          const subProvider = provider.get("provide");
          if (subProvider === undefined) throw new NeverEntryError();
          return this._getNgModuleProviderClassMetadataList(subProvider);
        }
        else if (provider instanceof SdClassMetadata) {
          return [provider];
        }
        else if (provider instanceof SdCallMetadata) {
          const sdMetadata = this._metadataCollector.getSdMetadata(provider.module, provider.metadata.expression);
          return this._getNgModuleProviderClassMetadataList(sdMetadata);
        }
        else if (provider instanceof SdFunctionMetadata) {
          return this._getNgModuleProviderClassMetadataList(provider.value);
        }
        else if (provider instanceof SdArrayMetadata || provider instanceof Array) {
          const result: SdClassMetadata[] = [];
          for (const providerItem of Array.from(provider)) {
            const p = this._getNgModuleProviderClassMetadataList(providerItem);
            result.push(...p);
          }
          return result;
        }
        else {
          // throw new NeverEntryError();
          return [undefined];
        }
      }).filterExists();
  }

  public async emitAsync(): Promise<void> {
    await this._writeNgModuleFileAsync();
    await this._writeNgRoutingModuleAsync();
    await this._removeDeletedModuleFileAsync();
  }

  private async _writeNgModuleFileAsync(): Promise<void> {
    this._logger.debug("모듈 구성 시작...");

    const info = await this._getInfoAsync();

    for (const ngModuleInfo of info.ngModules) {
      if (this._outputCache[ngModuleInfo.def.filePath] === undefined && FsUtils.exists(ngModuleInfo.def.filePath)) {
        this._outputCache[ngModuleInfo.def.filePath] = await FsUtils.readFileAsync(ngModuleInfo.def.filePath);
      }

      if (ngModuleInfo.declarations.length > 0 || ngModuleInfo.providers.length > 0) {
        // NgModule
        const importText = Object.keys(ngModuleInfo.importMapObj)
          .map(key => {
            const imp = ngModuleInfo.importMapObj[key];
            if (imp === undefined) throw new NeverEntryError();
            return `import {${imp.distinct().join(", ")}} from "${key}";`;
          });
        const ngModuleContent = `
${importText.join(os.EOL)}

@NgModule({
  imports: [${ngModuleInfo.modules.length > 0 ? os.EOL + "    " + ngModuleInfo.modules.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}],
  declarations: [${ngModuleInfo.declarations.length > 0 ? os.EOL + "    " + ngModuleInfo.declarations.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}],
  exports: [${ngModuleInfo.exports.length > 0 ? os.EOL + "    " + ngModuleInfo.exports.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}],
  entryComponents: [${ngModuleInfo.entryComponents.length > 0 ? os.EOL + "    " + ngModuleInfo.entryComponents.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}],
  providers: [${ngModuleInfo.providers.length > 0 ? os.EOL + "    " + ngModuleInfo.providers.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}]
})
export class ${ngModuleInfo.def.className} {
}`.trim();

        if (this._outputCache[ngModuleInfo.def.filePath] !== ngModuleContent) {
          this._outputCache[ngModuleInfo.def.filePath] = ngModuleContent;
          await FsUtils.writeFileAsync(ngModuleInfo.def.filePath, ngModuleContent);
        }
      }
      else {
        if (this._outputCache[ngModuleInfo.def.filePath] !== undefined) {
          await FsUtils.removeAsync(ngModuleInfo.def.filePath);
          delete this._outputCache[ngModuleInfo.def.filePath];
        }
      }
    }

    this._logger.debug("모듈 구성 완료");
  }

  private async _writeNgRoutingModuleAsync(): Promise<void> {
    this._logger.debug("라우팅 모듈 구성 시작...");

    const info = await this._getInfoAsync();

    for (const ngRoutingModuleInfo of info.ngRoutingModule) {
      if (this._outputCache[ngRoutingModuleInfo.filePath] === undefined && FsUtils.exists(ngRoutingModuleInfo.filePath)) {
        this._outputCache[ngRoutingModuleInfo.filePath] = await FsUtils.readFileAsync(ngRoutingModuleInfo.filePath);
      }

      if (ngRoutingModuleInfo.ngModuleDef !== undefined && ngRoutingModuleInfo.pageFilePath !== undefined) {
        const moduleFilePath = ngRoutingModuleInfo.ngModuleDef.filePath;
        const moduleClassName = ngRoutingModuleInfo.ngModuleDef.className;
        const pageFilePath = ngRoutingModuleInfo.pageFilePath;

        const moduleRelativePath = path.relative(path.dirname(ngRoutingModuleInfo.filePath), moduleFilePath)
          .replace(/\\/g, "/")
          .replace(/\.ts$/, "");

        const pageClassName = path.basename(pageFilePath, path.extname(pageFilePath));
        const pageRelativePath = path.relative(path.dirname(ngRoutingModuleInfo.filePath), pageFilePath)
          .replace(/\\/g, "/")
          .replace(/\.ts$/, "");

        const className = path.basename(ngRoutingModuleInfo.filePath, path.extname(ngRoutingModuleInfo.filePath));

        const content = `
import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";
import {${moduleClassName}} from "${moduleRelativePath.startsWith(".") ? moduleRelativePath : "./" + moduleRelativePath}";
import {${pageClassName}} from "${pageRelativePath}";

@NgModule({
  imports: [
    CommonModule,
    ${moduleClassName},
    RouterModule.forChild([
      {
        path: "",
        component: ${pageClassName}${ngRoutingModuleInfo.children.length > 0 ? "," + os.EOL + "        children: [" + os.EOL + "          " + this._getRoutingChildrenArrText(ngRoutingModuleInfo.children).replace(/\n/g, "\n          ") + os.EOL + "        ]" : ""}
      }
    ])
  ]
})
export class ${className} {
}`.trim();

        if (this._outputCache[ngRoutingModuleInfo.filePath] !== content) {
          this._outputCache[ngRoutingModuleInfo.filePath] = content;
          await FsUtils.writeFileAsync(ngRoutingModuleInfo.filePath, content);
        }
      }
      else {
        const content = `
export const routes = [
  ${this._getRoutingChildrenArrText(ngRoutingModuleInfo.children).replace(/\n/g, "\n  ")}
];`.trim();

        if (this._outputCache[ngRoutingModuleInfo.filePath] !== content) {
          this._outputCache[ngRoutingModuleInfo.filePath] = content;
          await FsUtils.writeFileAsync(ngRoutingModuleInfo.filePath, content);
        }
      }
    }

    this._logger.debug("라우팅 모듈 구성 완료");
  }

  private async _removeDeletedModuleFileAsync(): Promise<void> {
    if (!this._info) throw new NeverEntryError();

    const filePaths = await FsUtils.globAsync(path.resolve(this._modulesGenDirPath, "**", "*"), {nodir: true});
    for (const filePath of filePaths) {
      if (
        !this._info.ngModules.some(item => item.def.filePath === filePath) &&
        !this._info.ngRoutingModule.some(item => item.filePath === filePath)
      ) {
        this._logger.debug("필요없는 모듈 파일 삭제", filePath);
        await FsUtils.removeAsync(filePath);
        delete this._outputCache[filePath];
      }
    }
  }

  private async _getInfoAsync(): Promise<{ ngModules: ISdNgModuleInfo[]; ngRoutingModule: ISdNgRoutingModuleInfo[] }> {
    if (!this._info) {
      this._logger.debug("새로 생성할 모듈 정보 목록 구성...");

      this._info = {
        ngModules: [],
        ngRoutingModule: []
      };

      for (const defs of Object.values(this._defMapObj)) {
        if (defs === undefined) throw new NeverEntryError();

        for (const def of defs) {
          if (!def.isForGenerate) continue;

          const ngModuleInfo: ISdNgModuleInfo = {
            def,
            importMapObj: {
              "@angular/core": ["NgModule"],
              "@angular/common": ["CommonModule"]
            },
            modules: ["CommonModule"],
            declarations: [],
            exports: [],
            entryComponents: [],
            providers: []
          };

          for (const exp of def.exports) {
            if (exp.name === undefined) throw new NeverEntryError();
            const exportName = exp.name;

            const expDefs = this._defMapObj[exp.module.filePath];
            const expDef = expDefs?.single(item => item.moduleName === exp.module.name);
            if (!expDef) throw new NeverEntryError();

            //------------------------------------
            // NgModule
            //------------------------------------

            // 1: default imports

            const sourceFilePath = path.resolve(expDef.sourceFile.fileName);
            const moduleSourceFilePath = expDef.filePath;
            const classRequirePath = path.relative(path.dirname(moduleSourceFilePath), sourceFilePath)
              .replace(/\\/g, "/")
              .replace(/\.ts$/, "");
            ngModuleInfo.importMapObj[classRequirePath] = ngModuleInfo.importMapObj[exportName] ?? [];
            if (!ngModuleInfo.importMapObj[classRequirePath]?.includes(exportName)) {
              ngModuleInfo.importMapObj[classRequirePath]?.push(exportName);
            }

            // 2: exports/declarations/providers

            if (
              this._hasDecorator(exp, "@angular/core", "Component") ||
              this._hasDecorator(exp, "@angular/core", "Pipe") ||
              this._hasDecorator(exp, "@angular/core", "Directive")
            ) {
              ngModuleInfo.exports.push(exportName);
              ngModuleInfo.declarations.push(exportName);
              if (
                exportName.endsWith("PrintTemplate") ||
                exportName.endsWith("EntryControl") ||
                exportName.endsWith("Modal") ||
                exp.extends?.name === "SdModalBase" ||
                exp.extends?.name === "SdPrintTemplateBase"
              ) {
                ngModuleInfo.entryComponents.push(exportName);
              }
            }
            else if (this._hasDecorator(exp, "@angular/core", "Injectable")) {
              ngModuleInfo.providers.push(exportName);
            }

            // 3: modules

            const sourceFile = expDef.sourceFile;
            const importNodes = sourceFile["imports"];
            if (importNodes !== undefined) {
              if (!(importNodes instanceof Array)) throw new NeverEntryError();

              for (const importNode of importNodes) {
                const importModuleNameOrFilePath = importNode.text === undefined ? undefined :
                  // (importNode.text as string).startsWith(".") ? path.relative(this._srcPath, path.resolve(path.dirname(sourceFilePath), importNode.text)) :
                  (importNode.text as string).startsWith(".") ? path.resolve(path.dirname(sourceFilePath), importNode.text) + ".ts" :
                    importNode.text as string;
                if (importModuleNameOrFilePath === undefined) throw new NeverEntryError();
                if (importModuleNameOrFilePath === "tslib") continue;

                const importClassNames = importNode.parent?.importClause?.namedBindings?.elements?.map((item: any) => item.name.text) as string[] | undefined;

                if (importClassNames !== undefined) {
                  const needModuleDefs = Object.values(this._defMapObj).filterExists().mapMany().filter(moduleDef => (
                    moduleDef.exports.some(ngModuleExport => {
                      return (
                          (ngModuleExport.module.filePath === importModuleNameOrFilePath) ||
                          (ngModuleExport.module.filePath === importModuleNameOrFilePath + ".ts") ||
                          (ngModuleExport.module.name === importModuleNameOrFilePath)
                        ) &&
                        ngModuleExport.name !== undefined &&
                        importClassNames.includes(ngModuleExport.name);
                    })
                  ));

                  for (const needModuleDef of needModuleDefs) {
                    const importInfo = this._getNgModuleImportInfo(def, needModuleDef);

                    ngModuleInfo.modules.push(importInfo.targetName);

                    const requirePath = importInfo.requirePath;
                    ngModuleInfo.importMapObj[requirePath] = ngModuleInfo.importMapObj[requirePath] ?? [];
                    if (!ngModuleInfo.importMapObj[requirePath]?.includes(importInfo.targetName)) {
                      ngModuleInfo.importMapObj[requirePath]?.push(importInfo.targetName);
                    }
                  }
                }
              }
            }

            // 4: modules: from template

            const decorator = Array.from(exp.decorators)
              .single(item => (
                item.expression.module === "@angular/core" &&
                item.expression.name === "Component"
              ));
            if (decorator) {
              const arg = decorator.arguments[0];
              if (arg === undefined) throw new NeverEntryError();
              if (!(arg instanceof SdObjectMetadata)) throw new NeverEntryError();

              const templateText = arg.get("template");
              if (templateText !== undefined) {
                if (typeof templateText !== "string") throw new NeverEntryError();
                const templateDOM = new JSDOM(templateText);

                const needModuleDefs = Object.values(this._defMapObj).filterExists().mapMany().filter(moduleDef => (
                  moduleDef.exports.some(exp1 => (
                    exp1.decorators.some(dec => (
                      dec.expression.module === "@angular/core" &&
                      (
                        dec.expression.name === "Component" ||
                        dec.expression.name === "Directive"
                      ) &&
                      dec.arguments[0] instanceof SdObjectMetadata &&
                      typeof dec.arguments[0].get("selector") === "string" &&
                      templateDOM.window.document.querySelector([
                        (dec.arguments[0].get("selector") as string),
                        (dec.arguments[0].get("selector") as string)
                          .replace(/\[/g, "[\\[")
                          .replace(/]/g, "\\]]"),
                        (dec.arguments[0].get("selector") as string)
                          .replace(/\[/g, "[\\(")
                          .replace(/]/g, "\\)]")
                      ].join(", "))
                    ))
                  ))
                ));

                for (const needModuleDef of needModuleDefs) {
                  const importInfo = this._getNgModuleImportInfo(def, needModuleDef);

                  ngModuleInfo.modules.push(importInfo.targetName);

                  const requirePath = importInfo.requirePath;
                  ngModuleInfo.importMapObj[requirePath] = ngModuleInfo.importMapObj[requirePath] ?? [];
                  if (!ngModuleInfo.importMapObj[requirePath]?.includes(importInfo.targetName)) {
                    ngModuleInfo.importMapObj[requirePath]?.push(importInfo.targetName);
                  }
                }
              }
            }


            //------------------------------------
            // NgRoutingModule
            //------------------------------------

            // route

            if (
              !sourceFilePath.endsWith(".d.ts") &&
              FsUtils.exists(this._pagesDirPath) &&
              !path.relative(this._pagesDirPath, sourceFilePath).includes("..")
            ) {
              const tsFilePath = sourceFilePath;
              const className = path.basename(tsFilePath, path.extname(tsFilePath))
                .replace(/\.ts$/, "");

              const ngRoutingModuleInfo: ISdNgRoutingModuleInfo = {
                ngModuleDef: def,
                pageFilePath: sourceFilePath,
                filePath: def.filePath.replace(/Module\.ts$/, "RoutingModule.ts"),
                children: []
              };

              const childDirName = className[0].toLowerCase() +
                className.slice(1).replace(/Page$/, "")
                  .replace(/[A-Z]/, item => "-" + item.toLowerCase());
              const childDirPath = path.resolve(path.dirname(tsFilePath), childDirName);
              if (FsUtils.exists(childDirPath) && await FsUtils.isDirectoryAsync(childDirPath)) {
                ngRoutingModuleInfo.children = await this._getRouteChildrenAsync(tsFilePath, childDirPath);
              }

              this._info.ngRoutingModule.push(ngRoutingModuleInfo);
            }
          }

          if (def.exports.length > 0) {
            this._info.ngModules.push(ngModuleInfo);
          }
        }
      }

      if (this._pagesDirPath !== undefined && FsUtils.exists(this._pagesDirPath)) {
        this._info.ngRoutingModule.push({
          ngModuleDef: undefined,
          pageFilePath: undefined,
          filePath: this._routesGenFilePath,
          children: await this._getRouteChildrenAsync(undefined, this._pagesDirPath)
        });
      }
      this._logger.debug("새로 생성할 모듈 정보 목록 구성 완료");

      this._logger.debug("새로 생성할 모듈 정보 중복 병합...");
      this._mergeImportCircleInfos();
      this._logger.debug("새로 생성할 모듈 정보 중복 병합 완료...");
    }

    return this._info;
  }

  private _mergeImportCircleInfos(): void {
    if (!this._info) throw new NeverEntryError();

    let alreadyImports: string[] = [];
    const doing = (): boolean => {
      if (!this._info) throw new NeverEntryError();

      const importFilePathObj: { [filePath: string]: string[] | undefined } = {};
      for (const ngModuleInfo of this._info.ngModules) {
        importFilePathObj[ngModuleInfo.def.filePath] = Object.keys(ngModuleInfo.importMapObj)
          .filter(key => key.startsWith("."))
          .map(key => path.resolve(path.dirname(ngModuleInfo.def.filePath), key) + ".ts");
      }

      const checkIsImportCircle = (filePath: string): boolean => {
        if (alreadyImports.includes(filePath)) {
          alreadyImports.push(filePath);
          return false;
        }

        const impFilePaths = importFilePathObj[filePath];
        if (impFilePaths !== undefined) {
          alreadyImports.push(filePath);

          for (const subFilePath of impFilePaths) {
            const result = checkIsImportCircle(subFilePath);
            if (!result) {
              return false;
            }
          }

          alreadyImports.remove(filePath);
        }

        return true;
      };

      for (const filePath of Object.keys(importFilePathObj)) {
        const result = checkIsImportCircle(filePath);
        if (!result) {
          return false;
        }
      }

      return true;
    };

    while (!doing()) {
      if (alreadyImports.length === 1) throw new NeverEntryError();

      const firstIndex = alreadyImports.indexOf(alreadyImports.last()!);
      const circularImports = alreadyImports.slice(firstIndex);

      this._logger.debug(
        "순환 모듈 병합" + os.EOL +
        circularImports.join(" =>" + os.EOL)
      );

      // 첫번째 모듈에 다른 모듈 모두 병합
      const mergeInfos = this._info.ngModules.filter(item => circularImports.includes(item.def.filePath));
      let newInfo: ISdNgModuleInfo = mergeInfos[0];
      for (const mergeInfo of mergeInfos.slice(1).orderByDesc(item => item.def.className.length)) {
        if (Object.keys(newInfo.importMapObj).length < Object.keys(mergeInfo.importMapObj).length) {
          newInfo = mergeInfo;
        }
      }
      mergeInfos.remove(newInfo);

      for (const mergeInfo of mergeInfos) {
        for (const mergeInfoImportKey of Object.keys(mergeInfo.importMapObj)) {
          let newInfoImportKey: string;
          if (mergeInfoImportKey.startsWith(".")) {
            newInfoImportKey = path.relative(path.dirname(newInfo.def.filePath), path.resolve(path.dirname(mergeInfo.def.filePath), mergeInfoImportKey))
              .replace(/\\/g, "/");
            newInfoImportKey = newInfoImportKey.startsWith(".") ? newInfoImportKey : "./" + newInfoImportKey;
          }
          else {
            newInfoImportKey = mergeInfoImportKey;
          }

          newInfo.importMapObj[newInfoImportKey] = newInfo.importMapObj[newInfoImportKey] ?? [];
          newInfo.importMapObj[newInfoImportKey]!.push(...mergeInfo.importMapObj[mergeInfoImportKey]!);
          newInfo.importMapObj[newInfoImportKey] = newInfo.importMapObj[newInfoImportKey]!.distinct();
        }

        newInfo.modules = [...newInfo.modules, ...mergeInfo.modules].distinct();
        newInfo.declarations = [...newInfo.declarations, ...mergeInfo.declarations].distinct();
        newInfo.exports = [...newInfo.exports, ...mergeInfo.exports].distinct();
        newInfo.entryComponents = [...newInfo.entryComponents, ...mergeInfo.entryComponents].distinct();
        newInfo.providers = [...newInfo.providers, ...mergeInfo.providers].distinct();
      }

      // 첫번째 모듈외 모든 모듈 삭제
      for (const mergeInfo of mergeInfos) {
        this._info.ngModules.remove(mergeInfo);
      }

      // 첫번째 모듈외 모든 모듈을 의존하고 있던 모든 다른 모듈에서, importObj/modules 를 새 모듈로 변경
      for (const ngModuleInfo of this._info.ngModules) {
        const removeKeys = Object.keys(ngModuleInfo.importMapObj)
          .filter(key => {
            const filePath = path.resolve(path.dirname(ngModuleInfo.def.filePath), key) + ".ts";
            return mergeInfos.some(item => item.def.filePath === filePath);
          });
        if (removeKeys.length > 0) {
          for (const key of removeKeys) {
            const imp = ngModuleInfo.importMapObj[key];
            if (imp === undefined) throw new NeverEntryError();

            for (const className of imp) {
              ngModuleInfo.modules.remove(className);
            }
            delete ngModuleInfo.importMapObj[key];
          }

          let newKey = path.relative(path.dirname(ngModuleInfo.def.filePath), newInfo.def.filePath)
            .replace(/\\/g, "/")
            .replace(/\.ts$/, "");
          newKey = newKey.startsWith(".") ? newKey : "./" + newKey;

          if (ngModuleInfo !== newInfo) {
            ngModuleInfo.importMapObj[newKey] = [newInfo.def.className];
            ngModuleInfo.modules.push(newInfo.def.className);
            ngModuleInfo.modules = ngModuleInfo.modules.distinct();
          }
          else {
            delete ngModuleInfo.importMapObj[newKey];
            ngModuleInfo.modules.remove(newInfo.def.className);
          }
        }
      }

      const routingModules = this._info.ngRoutingModule.filter(item => mergeInfos.some(item1 => item1.def === item.ngModuleDef));
      for (const routingModule of routingModules) {
        routingModule.ngModuleDef = newInfo.def;
      }

      alreadyImports = [];
    }
  }

  private _getRoutingChildrenArrText(children: ISdNgRoutingModuleRoute[]): string {
    return children.map(child => {
      let result = `{${os.EOL}`;
      result += `  path: "${child.path}",${os.EOL}`;
      if (child.loadChildren !== undefined) {
        result += `  loadChildren: "${child.loadChildren}"${os.EOL}`;
      }
      if (child.children && child.children.length > 0) {
        result += `  children: [${os.EOL}    ${this._getRoutingChildrenArrText(child.children).replace(/\n/g, "\n    ")}${os.EOL}]${os.EOL}`;
      }

      result += "}";
      return result;
    }).join("," + os.EOL);
  }

  private _hasDecorator(cls: SdClassMetadata, module: string, name: string): boolean {
    return cls.decorators.some(item => (
      item.expression.module === module &&
      item.expression.name === name
    ));
  }

  private _getNgModuleImportInfo(def: ISdNgModuleDef, needDef: ISdNgModuleDef): { requirePath: string; targetName: string } {
    let requirePath = "";
    if (needDef.sourceFile.fileName.endsWith(".d.ts")) {
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

  private async _getRouteChildrenAsync(pagePath: string | undefined, pageChildDirPath: string): Promise<ISdNgRoutingModuleRoute[]> {
    if (this._pagesDirPath === undefined) throw new NeverEntryError();

    const children: ISdNgRoutingModuleRoute[] = [];

    const childNames = await FsUtils.readdirAsync(pageChildDirPath);

    for (const childName of childNames) {
      const childPath = path.resolve(pageChildDirPath, childName);
      if (await FsUtils.isDirectoryAsync(childPath)) {
        const fileName = childName[0].toUpperCase() +
          childName.slice(1).replace(/-[a-z]/g, item => item[1].toUpperCase()) +
          "Page.ts";
        if (FsUtils.exists(path.resolve(pageChildDirPath, fileName))) continue;

        children.push({
          path: childName,
          children: await this._getRouteChildrenAsync(pagePath, childPath)
        });
      }
      else {
        const className = path.basename(childName, path.extname(childName));
        const pathName = className[0].toLowerCase() +
          className.slice(1).replace(/Page$/, "")
            .replace(/[A-Z]/g, item => "-" + item.toLowerCase());


        children.push({
          path: pathName,
          loadChildren: (
            "./" +
            (pagePath !== undefined ? "" : path.relative(this._srcPath, this._modulesGenDirPath) + "/") +
            path.relative(pagePath !== undefined ? path.dirname(pagePath) : this._srcPath, pageChildDirPath)
              .replace(/\\/g, "/") +
            "/" + className + "RoutingModule" +
            "#" + className + "RoutingModule" +
            "?chunkName=" + className
          ).replace(/\/\//g, "/")
        });
      }
    }

    return children;
  }
}

interface ISdNgModuleDef {
  sourceFile: ts.SourceFile;
  isForGenerate: boolean;
  moduleName: string;
  className: string;
  filePath: string;
  exports: SdClassMetadata[];
}


export interface ISdNgModuleInfo {
  def: ISdNgModuleDef;

  importMapObj: { [requirePath: string]: string[] | undefined };
  modules: string[];
  declarations: string[];
  exports: string[];
  entryComponents: string[];
  providers: string[];
}

export interface ISdNgRoutingModuleInfo {
  ngModuleDef: ISdNgModuleDef | undefined;
  pageFilePath: string | undefined;
  filePath: string;
  children: ISdNgRoutingModuleRoute[];
}

interface ISdNgRoutingModuleRoute {
  path: string;
  loadChildren?: string;
  children?: ISdNgRoutingModuleRoute[];
}