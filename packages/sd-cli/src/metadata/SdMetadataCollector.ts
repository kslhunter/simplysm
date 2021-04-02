import {
  isClassMetadata,
  isFunctionMetadata,
  isMetadataError,
  isMetadataGlobalReferenceExpression,
  isMetadataImportedSymbolReferenceExpression,
  isMetadataSymbolicCallExpression,
  MetadataEntry,
  MetadataObject,
  ModuleMetadata
} from "@angular/compiler-cli";
import { SdModuleMetadata } from "./SdModuleMetadata";
import * as path from "path";
import { FsUtil, Logger, PathUtil } from "@simplysm/sd-core-node";
import { INpmConfig } from "../commons";
import { NeverEntryError, ObjectUtil, StringUtil } from "@simplysm/sd-core-common";
import * as ts from "typescript";
import { SdObjectMetadata } from "./SdObjectMetadata";
import { SdClassMetadata } from "./SdClassMetadata";
import { SdCallMetadata } from "./SdCallMetadata";
import { SdErrorMetadata } from "./SdErrorMetadata";
import { SdArrayMetadata } from "./SdArrayMetadata";
import { SdFunctionMetadata } from "./SdFunctionMetadata";
import { JSDOM } from "jsdom";
import * as os from "os";
import { SdMetadataError } from "./SdMetadataError";

export class SdMetadataCollector {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private readonly _packageSourcePath = path.resolve(this._rootPath, "src");
  private readonly _packageSourceRoutePagesPath = path.resolve(this._packageSourcePath, "pages");
  private readonly _packageSourceLazyPagesPath = path.resolve(this._packageSourcePath, "lazy-pages");

  private readonly _routesGenFilePath = path.resolve(this._packageSourcePath, "_routes.ts");
  private readonly _lazyComponentsGenFilePath = path.resolve(this._modulesGenPath, "_lazyComponents.ts");

  /** [소스파일경로 => 모듈] 매핑 */
  private readonly _filePathToModuleMap = new Map<string, SdModuleMetadata>();

  /** [소스파일경로 => 소스파일] 매핑 */
  private readonly _filePathToSourceFileMap = new Map<string, ts.SourceFile>();

  /** 변경파일 목록 */
  private _changedInfos: (
    { type: "change"; filePath: string; sourceFile: ts.SourceFile; metadata: ModuleMetadata } |
    { type: "unlink"; filePath: string }
    )[] = [];

  /** [모듈파일경로 => 내용] 캐시 */
  private readonly _moduleGenCacheMap = new Map<string, string>();

  /** [모듈명 => 모듈파일경로] 매핑 */
  private _moduleNameToFilePathsMap?: Map<string, string[]>;

  private readonly _filePathToSdNgModuleInfoCacheMap = new Map<string, ISdNgModuleInfo[]>();
  private readonly _filePathToSdNgModuleDefCacheMap = new Map<string, ISdNgModuleDef>();
  private readonly _filePathToSdNgRoutingModuleDefCacheMap = new Map<string, ISdNgRoutingModuleDef>();
  private readonly _filePathToSdNgLazyComponentCacheMap = new Map<string, ISdNgLazyComponent>();

  public constructor(private readonly _rootPath: string,
                     private readonly _modulesGenPath: string) {
  }

  public async initializeAsync(): Promise<void> {
    this._logger.debug("초기화...");
    const ngModuleFilePaths = await FsUtil.globAsync(path.resolve(this._modulesGenPath, "**", "*.ts"));
    for (const ngModuleFilePath of ngModuleFilePaths) {
      const content = await FsUtil.readFileAsync(ngModuleFilePath);
      this._moduleGenCacheMap.set(ngModuleFilePath, content);
    }

    if (FsUtil.exists(this._routesGenFilePath)) {
      const routesContent = await FsUtil.readFileAsync(this._routesGenFilePath);
      this._moduleGenCacheMap.set(this._routesGenFilePath, routesContent);
    }
  }

  public register(sourceFile: ts.SourceFile, metadata: ModuleMetadata): void {
    const filePath = path.normalize(sourceFile.fileName);
    this._changedInfos.push({ type: "change", filePath, sourceFile, metadata });
  }

  public delete(filePath: string): void {
    this._changedInfos.push({ type: "unlink", filePath });
  }

  public async generateAsync(): Promise<void> {
    // 변경사항이 없으면 바로 반환
    if (!this._changedInfos.some((item) => (
      !FsUtil.isChildPath(item.filePath, this._modulesGenPath)
      && item.filePath !== this._routesGenFilePath
    ))) {
      return;
    }
    const changedInfos = [...this._changedInfos];
    this._changedInfos = [];

    //----------------------------
    // 시작을 위한 각종 매핑 준비
    //----------------------------
    this._logger.debug("시작을 위한 각종 매핑 준비...");

    for (const changedInfo of changedInfos) {
      if (changedInfo.type === "unlink") {
        this._filePathToModuleMap.delete(changedInfo.filePath);
        this._filePathToSourceFileMap.delete(changedInfo.filePath);
      }
      else {
        const moduleName = changedInfo.metadata.importAs ?? await this._getPackageNameAsync(changedInfo.filePath);
        const metadataObj = changedInfo.metadata.metadata;

        const sdModuleMetadata = new SdModuleMetadata(this, changedInfo.filePath, moduleName, metadataObj);
        this._filePathToModuleMap.set(changedInfo.filePath, sdModuleMetadata);
        this._filePathToSourceFileMap.set(changedInfo.filePath, changedInfo.sourceFile);
      }

      this._filePathToSdNgModuleInfoCacheMap.delete(changedInfo.filePath);
      this._filePathToSdNgModuleDefCacheMap.delete(changedInfo.filePath);
      this._filePathToSdNgLazyComponentCacheMap.delete(changedInfo.filePath);

      // Routing Module은 상위 Routing모듈까지 전부 다시 읽어야 함
      let cursorFilePath = changedInfo.filePath;
      while (true) {
        this._filePathToSdNgRoutingModuleDefCacheMap.delete(cursorFilePath);
        cursorFilePath = path.resolve(
          path.dirname(cursorFilePath),
          "..",
          StringUtil.toPascalCase(path.basename(path.dirname(cursorFilePath))) + "Page.ts"
        );
        if (!FsUtil.isChildPath(cursorFilePath, this._packageSourceRoutePagesPath)) {
          break;
        }
      }
    }

    // [모듈명 => 소속파일 경로 목록] 매핑 구성
    this._moduleNameToFilePathsMap = new Map<string, string[]>();
    for (const module of Array.from(this._filePathToModuleMap.values())) {
      if (!this._moduleNameToFilePathsMap.has(module.name)) {
        this._moduleNameToFilePathsMap.set(module.name, []);
      }
      this._moduleNameToFilePathsMap.get(module.name)!.push(module.filePath);
    }

    //----------------------------
    // NgModule 목록 구성
    //----------------------------
    this._logger.debug("NgModule 목록 구성...");

    const ngModuleInfos: ISdNgModuleInfo[] = [];
    for (const filePath of Array.from(this._filePathToModuleMap.keys())) {
      const loadedNgModuleInfos = this._getNgModuleInfos(filePath);
      ngModuleInfos.push(...loadedNgModuleInfos);
    }

    //----------------------------
    // NgModule 생성을 위한 각종 매핑 준비
    //----------------------------
    this._logger.debug("각종 매핑 준비...");

    // EXPORT의 [모듈명 + 클래스명]으로 모듈을 가져올 매핑 구성
    const exportToModuleMap = new Map<string, { filePath: string; moduleName: string; className: string }>();
    for (const ngModuleExportsInfo of ngModuleInfos) {
      for (const exp of ngModuleExportsInfo.exports) {
        const key = exp.moduleName + "|_|" + exp.className;
        if (exportToModuleMap.has(key)) {
          throw new SdMetadataError(
            ngModuleExportsInfo.filePath,
            `이 파일의 '${exp.className}'를 '${exportToModuleMap.get(key)!.filePath}'에서도 exports 하고있습니다.(중복)`
          );
        }
        exportToModuleMap.set(key, {
          filePath: ngModuleExportsInfo.filePath,
          moduleName: ngModuleExportsInfo.moduleName,
          className: ngModuleExportsInfo.className
        });
      }
    }

    // EXPORT의 Template [selecor]로 모듈을 가져올 목록 구성
    const exportSelectors: { selector: string; filePath: string; moduleName: string; className: string }[] = [];
    for (const ngModuleExportsInfo of ngModuleInfos) {
      for (const exp of ngModuleExportsInfo.exports) {
        if (exp.templateSelector === undefined) continue;

        exportSelectors.push({
          selector: exp.templateSelector,
          filePath: ngModuleExportsInfo.filePath,
          moduleName: ngModuleExportsInfo.moduleName,
          className: ngModuleExportsInfo.className
        });
      }
    }

    //----------------------------
    // 생성할 NgModule 정의 구성
    //----------------------------
    this._logger.debug("생성할 NgModule 정의 구성...");

    const newNgModuleDefs: ISdNgModuleDef[] = [];
    await Array.from(this._filePathToModuleMap.keys()).parallelAsync(async (filePath) => {
      const newNgModuleDef = await this._getNewNgModuleDefAsync(filePath, exportToModuleMap, exportSelectors);
      if (!newNgModuleDef) return;

      newNgModuleDefs.push(newNgModuleDef);
    });

    //----------------------------
    // 생성할 NgModule 정의 구성
    //----------------------------
    this._logger.debug("생성할 NgRoutingModule 정의 구성...");

    const newNgRoutingModuleDefs: ISdNgRoutingModuleDef[] = [];

    await Array.from(this._filePathToModuleMap.keys()).parallelAsync(async (filePath) => {
      const newNgRoutingModuleDef = await this._getNewNgRoutingModuleDefAsync(filePath);
      if (!newNgRoutingModuleDef) return;

      newNgRoutingModuleDefs.push(newNgRoutingModuleDef);
    });

    //----------------------------
    // lazyComponent 정의 구성
    //----------------------------
    this._logger.debug("lazyComponent 정의 구성...");
    const lazyComponents: ISdNgLazyComponent[] = [];
    for (const filePath of Array.from(this._filePathToModuleMap.keys())) {
      const lazyComponent = this._getLazyComponent(filePath);
      if (!lazyComponent) continue;

      lazyComponents.push(lazyComponent);
    }

    //----------------------------
    // NgModule 중복 IMPORT 병합
    // => NgRoutingModule은 병합되지 않고, ngModule 설정만 수정됨
    //----------------------------
    this._logger.debug("NgModule 중복 IMPORT 병합...");

    const mergedNewNgModuleDefs = ObjectUtil.clone(newNgModuleDefs);
    const mergedNewNgRoutingModuleDefs = ObjectUtil.clone(newNgRoutingModuleDefs);

    while (true) {
      const mergeNgModuleFilePathsList: string[][] = [];

      const newNgModuleDefMap = mergedNewNgModuleDefs.toMap((item) => item.filePath);

      const checkDupImportFilePaths = (filePath: string, parents: string[]): void => {
        const importsObj = newNgModuleDefMap.get(filePath)?.importsObj;
        if (!importsObj) return;

        for (const importKey of Object.keys(importsObj)) {
          const importFilePath = path.resolve(path.dirname(filePath), importKey) + ".ts";
          if (newNgModuleDefMap.has(importFilePath)) {
            if (parents.includes(importFilePath)) {
              mergeNgModuleFilePathsList.push(parents.slice(parents.indexOf(importFilePath)).orderBy());
            }
            else {
              checkDupImportFilePaths(importFilePath, parents.concat([importFilePath]));
            }
          }
        }
      };

      // 모든 모듈에 중복 IMPORT 체크
      for (const newNgModuleDef of mergedNewNgModuleDefs) {
        checkDupImportFilePaths(newNgModuleDef.filePath, [newNgModuleDef.filePath]);
      }

      // 중복이 없으면 종료
      if (mergeNgModuleFilePathsList.length === 0) {
        break;
      }

      // 중복 병합
      for (const mergeNgModuleFilePaths of mergeNgModuleFilePathsList.distinct()) {
        const firstNgModuleDef = newNgModuleDefMap.get(mergeNgModuleFilePaths[0])!;

        for (const mergeNgModuleFilePath of mergeNgModuleFilePaths.slice(1)) {
          const mergeNgModuleDef = newNgModuleDefMap.get(mergeNgModuleFilePath)!;
          firstNgModuleDef.declarations.push(...mergeNgModuleDef.declarations);
          firstNgModuleDef.entryComponents.push(...mergeNgModuleDef.entryComponents);
          firstNgModuleDef.exports.push(...mergeNgModuleDef.exports);
          firstNgModuleDef.imports.push(...mergeNgModuleDef.imports);
          firstNgModuleDef.providers.push(...mergeNgModuleDef.providers);

          for (const requireKey of Object.keys(mergeNgModuleDef.importsObj)) {
            let resultRequireKey = requireKey;
            if (requireKey.startsWith(".")) {
              resultRequireKey = this._getRequirePath(firstNgModuleDef.filePath, path.resolve(path.dirname(mergeNgModuleDef.filePath), requireKey));
            }

            if (resultRequireKey in Object.keys(firstNgModuleDef.importsObj)) {
              firstNgModuleDef.importsObj[resultRequireKey].push(...mergeNgModuleDef.importsObj[requireKey]);
              firstNgModuleDef.importsObj[resultRequireKey] = firstNgModuleDef.importsObj[requireKey].distinct();
            }
            else {
              firstNgModuleDef.importsObj[resultRequireKey] = mergeNgModuleDef.importsObj[requireKey];
            }
          }

          const removeImportRequireKeys = Object.keys(firstNgModuleDef.importsObj).filter((item) => {
            const importFilePath = path.resolve(path.dirname(firstNgModuleDef.filePath), item) + ".ts";
            return importFilePath === firstNgModuleDef.filePath || importFilePath === mergeNgModuleDef.filePath;
          });
          for (const removeImportRequireKey of removeImportRequireKeys) {
            delete firstNgModuleDef.importsObj[removeImportRequireKey];
          }

          firstNgModuleDef.imports.remove((item) => {
            return item === firstNgModuleDef.className || item === mergeNgModuleDef.className;
          });

          // 모든 NgModuleDef의 IMPORT 관련 수정
          for (const newNgModuleDef of mergedNewNgModuleDefs) {
            for (const requireKey of Object.keys(newNgModuleDef.importsObj)) {
              const requireFilePath = path.resolve(path.dirname(newNgModuleDef.filePath), requireKey) + ".ts";
              if (requireFilePath === mergeNgModuleDef.filePath) {
                newNgModuleDef.imports.remove(newNgModuleDef.importsObj[requireKey][0]);
                delete newNgModuleDef.importsObj[requireKey];

                const resultFileRequireKey = this._getRequirePath(newNgModuleDef.filePath, firstNgModuleDef.filePath);
                if (!Object.keys(newNgModuleDef.importsObj).includes(resultFileRequireKey)) {
                  newNgModuleDef.importsObj[resultFileRequireKey] = [firstNgModuleDef.className];
                  newNgModuleDef.imports.push(firstNgModuleDef.className);
                }
              }
            }
          }

          // 모든 NgRoutingModule의 IMPORT 관련 수정
          for (const newNgRoutingModuleDef of mergedNewNgRoutingModuleDefs) {
            if (newNgRoutingModuleDef.ngModuleFilePath === mergeNgModuleFilePath) {
              newNgRoutingModuleDef.ngModuleFilePath = firstNgModuleDef.filePath;
              newNgRoutingModuleDef.ngModuleClassName = firstNgModuleDef.className;
            }
          }
        }

        firstNgModuleDef.declarations = firstNgModuleDef.declarations.distinct();
        firstNgModuleDef.entryComponents = firstNgModuleDef.entryComponents.distinct();
        firstNgModuleDef.exports = firstNgModuleDef.exports.distinct();
        firstNgModuleDef.imports = firstNgModuleDef.imports.distinct();
        firstNgModuleDef.providers = firstNgModuleDef.providers.distinct();

        mergedNewNgModuleDefs.remove((item) => mergeNgModuleFilePaths.includes(item.filePath));
        mergedNewNgModuleDefs.push(firstNgModuleDef);
      }
    }

    //----------------------------
    // NgModule 파일 쓰기
    //----------------------------
    this._logger.debug("새로운 NgModule 파일 쓰기...");

    // 새로운 NgModule 파일과 그 내용 구성
    const newNgModuleFilePathToContentMap = new Map<string, string>();
    for (const newNgModuleDef of mergedNewNgModuleDefs) {
      const importText = Object.keys(newNgModuleDef.importsObj)
        .map((requirePath) => {
          const classNames = newNgModuleDef.importsObj[requirePath];
          return `import { ${classNames.distinct().join(", ")} } from "${requirePath}";`;
        });

      const content = `
${importText.join(os.EOL)}

@NgModule({
  imports: [${newNgModuleDef.imports.length > 0 ? os.EOL + "    " + newNgModuleDef.imports.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}],
  declarations: [${newNgModuleDef.declarations.length > 0 ? os.EOL + "    " + newNgModuleDef.declarations.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}],
  exports: [${newNgModuleDef.exports.length > 0 ? os.EOL + "    " + newNgModuleDef.exports.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}],
  entryComponents: [${newNgModuleDef.entryComponents.length > 0 ? os.EOL + "    " + newNgModuleDef.entryComponents.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}],
  providers: [${newNgModuleDef.providers.length > 0 ? os.EOL + "    " + newNgModuleDef.providers.distinct().join("," + os.EOL + "    ") + os.EOL + "  " : ""}]
})
export class ${newNgModuleDef.className} {
${newNgModuleDef.entryComponents.distinct().map((item) => `  // eslint-disable-next-line @typescript-eslint/naming-convention${os.EOL}  public ${item} = ${item};`).join(os.EOL)}
}`.trim().replace(new RegExp(os.EOL, "g"), "\n").replace(/\n/g, os.EOL);

      newNgModuleFilePathToContentMap.set(newNgModuleDef.filePath, content);
    }

    // NgModule 파일 쓰기
    await Array.from(newNgModuleFilePathToContentMap.keys()).parallelAsync(async (ngModuleFilePath) => {
      const content = newNgModuleFilePathToContentMap.get(ngModuleFilePath)!;
      const cacheContent = this._moduleGenCacheMap.get(ngModuleFilePath);
      if (content !== cacheContent) {
        await FsUtil.writeFileAsync(ngModuleFilePath, content);
        this._moduleGenCacheMap.set(ngModuleFilePath, content);
      }
    });

    //----------------------------
    // NgRoutingModule 파일 쓰기
    //----------------------------
    this._logger.debug("새로운 NgRoutingModule 파일 쓰기...");

    const newNgRoutingModuleFilePathToContentMap = new Map<string, string>();
    for (const newNgRoutingModuleDef of mergedNewNgRoutingModuleDefs) {
      const filePath = newNgRoutingModuleDef.filePath;
      const className = newNgRoutingModuleDef.className;
      const ngModuleFilePath = newNgRoutingModuleDef.ngModuleFilePath;
      const ngModuleClassName = newNgRoutingModuleDef.ngModuleClassName;
      const pageFilePath = newNgRoutingModuleDef.pageFilePath;
      const pageClassName = newNgRoutingModuleDef.pageClassName;
      const children = newNgRoutingModuleDef.children;

      const ngModuleRequirePath = this._getRequirePath(filePath, ngModuleFilePath);
      const pageRequirePath = this._getRequirePath(filePath, pageFilePath);

      const content = `
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ${ngModuleClassName} } from "${ngModuleRequirePath}";
import { ${pageClassName} } from "${pageRequirePath}";

@NgModule({
  imports: [
    CommonModule,
    ${ngModuleClassName},
    RouterModule.forChild([
      {
        path: "",
        component: ${pageClassName}${children.length > 0 ? "," + os.EOL + "        children: [" + os.EOL + "          " + this._getRouteChildrenText(children).replace(/\n/g, "\n          ") + os.EOL + "        ]" : ""}
      }
    ])
  ]
})
export class ${className} {
}`.trim().replace(new RegExp(os.EOL, "g"), "\n").replace(/\n/g, os.EOL);

      newNgRoutingModuleFilePathToContentMap.set(filePath, content);
    }

    await Array.from(newNgRoutingModuleFilePathToContentMap.keys()).parallelAsync(async (ngRoutingModuleFilePath) => {
      const content = newNgRoutingModuleFilePathToContentMap.get(ngRoutingModuleFilePath)!;
      const cacheContent = this._moduleGenCacheMap.get(ngRoutingModuleFilePath);
      if (content !== cacheContent) {
        await FsUtil.writeFileAsync(ngRoutingModuleFilePath, content);
        this._moduleGenCacheMap.set(ngRoutingModuleFilePath, content);
      }
    });

    //----------------------------
    // _routes.ts 파일 쓰기
    //----------------------------
    this._logger.debug("새로운 _routes.ts 파일 쓰기...");

    const routes = await this._getRoutingModuleChildrenAsync(this._packageSourcePath, this._packageSourceRoutePagesPath);
    if (routes.length > 0) {
      const content = `
export const routes = [
  ${this._getRouteChildrenText(routes).replace(/\n/g, "\n  ")}
];`.trim().replace(new RegExp(os.EOL, "g"), "\n").replace(/\n/g, os.EOL);

      const cacheContent = this._moduleGenCacheMap.get(this._routesGenFilePath);
      if (content !== cacheContent) {
        await FsUtil.writeFileAsync(this._routesGenFilePath, content);
        this._moduleGenCacheMap.set(this._routesGenFilePath, content);
      }
    }
    else {
      await FsUtil.removeAsync(this._routesGenFilePath);
      this._moduleGenCacheMap.delete(this._routesGenFilePath);
    }

    //----------------------------
    // _lazyComponents.ts 파일 쓰기
    //----------------------------
    this._logger.debug("새로운 _lazyPages.ts 파일 쓰기...");

    if (lazyComponents.length > 0) {
      const texts: string[] = lazyComponents.map((lazyComponent) => {
        const code = lazyComponent.code;
        const ngModuleFilePath = lazyComponent.ngModuleFilePath;
        const ngModuleClassName = lazyComponent.ngModuleClassName;
        const requirePath = this._getRequirePath(this._lazyComponentsGenFilePath, ngModuleFilePath);

        /*return `  "${code}": () => import("./_modules/lazy-pages/${moduleDirPath}${moduleName}").then(m => m.${moduleName})`;*/
        return `  {\n    code: "${code}",\n    loadChildren: "${requirePath}#${ngModuleClassName}?chunkName=${ngModuleClassName}",\n    matcher: (): null => null\n  }`;
      }).filterExists();

      const content = `
export const lazyPages = [
${texts.join(`,${os.EOL}`)}
];`.trim().replace(new RegExp(os.EOL, "g"), "\n").replace(/\n/g, os.EOL);

      const cacheContent = this._moduleGenCacheMap.get(this._lazyComponentsGenFilePath);
      if (content !== cacheContent) {
        await FsUtil.writeFileAsync(this._lazyComponentsGenFilePath, content);
        this._moduleGenCacheMap.set(this._lazyComponentsGenFilePath, content);
      }
    }
    else {
      await FsUtil.removeAsync(this._lazyComponentsGenFilePath);
      this._moduleGenCacheMap.delete(this._lazyComponentsGenFilePath);
    }

    //----------------------------
    // 더이상 사용하지 않는 파일 정리
    //----------------------------
    this._logger.debug("더이상 사용하지 않는 파일 정리...");

    // 새로 생성한 파일이 아니면 삭제
    for (const cacheFilePath of Array.from(this._moduleGenCacheMap.keys())) {
      if (
        !newNgModuleFilePathToContentMap.has(cacheFilePath)
        && !newNgRoutingModuleFilePathToContentMap.has(cacheFilePath)
        && cacheFilePath !== this._routesGenFilePath
        && cacheFilePath !== this._lazyComponentsGenFilePath
      ) {
        await FsUtil.removeAsync(cacheFilePath);
        this._moduleGenCacheMap.delete(cacheFilePath);
      }
    }

    // 빈 디렉토리 삭제
    await FsUtil.clearEmptyDirectoryAsync(this._modulesGenPath);
  }

  public findRealMetadataInfo(info: ISdMetadataInfo): ISdMetadataInfo {
    if (isMetadataImportedSymbolReferenceExpression(info.metadata)) {
      const moduleName = !info.metadata.module.startsWith(".") ? info.metadata.module : info.module.name;
      const moduleMetadataEntry = this._getModuleMetadataEntry(moduleName, info.metadata.name);
      if (!moduleMetadataEntry) throw new SdMetadataError(info.module.filePath, `${moduleName}에서 ${info.metadata.name}을 찾을 수 없습니다.`);

      return this.findRealMetadataInfo(moduleMetadataEntry);
    }
    else if (isMetadataGlobalReferenceExpression(info.metadata)) {
      const moduleMetadataEntry = this._getModuleMetadataEntry(info.module.name, info.metadata.name);
      if (!moduleMetadataEntry) throw new SdMetadataError(info.module.filePath, `${info.metadata.name}을 찾을 수 없습니다.`);

      return this.findRealMetadataInfo(moduleMetadataEntry);
    }

    return info;
  }

  public getSdMetadata(module: SdModuleMetadata, metadata: any, targetName?: string): TSdMetadata {
    const realInfo = this.findRealMetadataInfo({ module, metadata });

    if (realInfo.metadata == null) {
      return undefined;
    }
    else if (
      typeof realInfo.metadata === "string"
      || typeof realInfo.metadata === "number"
      || typeof realInfo.metadata === "boolean"
    ) {
      return realInfo.metadata;
    }
    else if (isClassMetadata(realInfo.metadata)) {
      if (targetName !== undefined) {
        return new SdClassMetadata(this, realInfo.module, targetName, realInfo.metadata);
      }
      else if (
        isMetadataImportedSymbolReferenceExpression(metadata)
        || isMetadataGlobalReferenceExpression(metadata)
      ) {
        return new SdClassMetadata(this, realInfo.module, metadata.name, realInfo.metadata);
      }
      else {
        throw new NeverEntryError();
      }
    }
    else if (isMetadataSymbolicCallExpression(realInfo.metadata)) {
      return new SdCallMetadata(this, realInfo.module, realInfo.metadata);
    }
    else if (isFunctionMetadata(realInfo.metadata)) {
      if (targetName !== undefined) {
        return new SdFunctionMetadata(this, realInfo.module, targetName, realInfo.metadata);
      }
      else if (
        isMetadataImportedSymbolReferenceExpression(metadata)
        || isMetadataGlobalReferenceExpression(metadata)
      ) {
        return new SdFunctionMetadata(this, realInfo.module, metadata.name, realInfo.metadata);
      }
      else {
        throw new NeverEntryError();
      }
    }
    else if (realInfo.metadata instanceof Array) {
      return new SdArrayMetadata(this, realInfo.module, realInfo.metadata);
    }
    else if (!("__symbolic" in realInfo.metadata) && typeof realInfo.metadata === "object") {
      return new SdObjectMetadata(this, realInfo.module, realInfo.metadata as MetadataObject);
    }
    else if (isMetadataError(realInfo.metadata)) {
      return new SdErrorMetadata(this, realInfo.module, realInfo.metadata);
    }
    else {
      return undefined;
    }
  }

  private _getNgModuleInfos(filePath: string): ISdNgModuleInfo[] {
    const results: ISdNgModuleInfo[] = [];

    // 새로 생성된 모듈파일은 무시
    if (
      FsUtil.isChildPath(filePath, this._modulesGenPath)
      || filePath === this._routesGenFilePath
    ) return results;

    if (this._filePathToSdNgModuleInfoCacheMap.has(filePath)) {
      return this._filePathToSdNgModuleInfoCacheMap.get(filePath)!;
    }

    const module = this._filePathToModuleMap.get(filePath)!;
    for (const entrySdMetadata of module.getMetadatas()) {
      if (!(entrySdMetadata instanceof SdClassMetadata)) continue;

      // BrowserModule 무시
      if (entrySdMetadata.module.name === "@angular/platform-browser" && entrySdMetadata.name === "BrowserModule") {
        continue;
      }

      const decorators = entrySdMetadata.getCallDecorators();
      if (!decorators) continue;

      const ngModuleDecorator = decorators.single((item) => {
        const exp = item.getExpression();
        return exp.moduleName === "@angular/core" && exp.name === "NgModule";
      });

      // 내/외부 NgModule 클래스 일때, 모듈 정의 기록
      if (ngModuleDecorator) {
        // EXPORT 목록 구성
        const exps: ISdNgModuleExportInfo[] = [];

        const ngModuleDecoratorArguments = ngModuleDecorator.getArguments();
        if (!ngModuleDecoratorArguments) throw new NeverEntryError();

        const ngModuleDecoratorFirstArgument = ngModuleDecoratorArguments.get(0);
        if (!(ngModuleDecoratorFirstArgument instanceof SdObjectMetadata)) throw new NeverEntryError();

        // NgModule Decorator 의 EXPORT 목록
        const ngModuleDecoratorExports = ngModuleDecoratorFirstArgument.get("exports");
        if (ngModuleDecoratorExports !== undefined) {
          if (!(ngModuleDecoratorExports instanceof SdArrayMetadata)) throw new NeverEntryError();

          for (const ngModuleDecoratorExport of ngModuleDecoratorExports.getArray()) {
            if (!(ngModuleDecoratorExport instanceof SdClassMetadata)) throw new NeverEntryError();
            if (!ngModuleDecoratorExport.getCallDecorators()) continue;

            exps.push(this._getNgModuleExportInfo(ngModuleDecoratorExport));
          }
        }

        // NgModule Decorator의 PROVIDER 목록
        const ngModuleDecoratorProviders = ngModuleDecoratorFirstArgument.get("providers");
        if (ngModuleDecoratorProviders !== undefined) {
          if (!(ngModuleDecoratorProviders instanceof SdArrayMetadata)) throw new NeverEntryError();

          for (const ngModuleDecoratorProvider of ngModuleDecoratorProviders.getArray()) {
            const ngModuleDecoratorProviderClassMetadata = this._getNgModuleProviderClassMetadata(ngModuleDecoratorProvider);
            if (!ngModuleDecoratorProviderClassMetadata) continue;
            if (!ngModuleDecoratorProviderClassMetadata.getCallDecorators()) continue;

            exps.push(this._getNgModuleExportInfo(ngModuleDecoratorProviderClassMetadata));
          }
        }

        // ngModule Decorator의 forRoot등에 있는 PROVIDER 목록
        const ngModuleStaticsObj = entrySdMetadata.getStaticsObj();
        if (ngModuleStaticsObj !== undefined) {
          const ngModuleStaticsObjObject = ngModuleStaticsObj.getObject();
          for (const ngModuleStaticKey of Object.keys(ngModuleStaticsObjObject)) {
            const ngModuleStaticItem = ngModuleStaticsObjObject[ngModuleStaticKey];
            if (!(ngModuleStaticItem instanceof SdFunctionMetadata)) continue;

            const ngModuleForRootValue = ngModuleStaticItem.getValue();
            if (!(ngModuleForRootValue instanceof SdObjectMetadata)) throw new NeverEntryError();

            const ngModuleForRootProviders = ngModuleForRootValue.get("providers");
            if (ngModuleForRootProviders !== undefined) {
              if (!(ngModuleForRootProviders instanceof SdArrayMetadata)) throw new NeverEntryError();

              for (const ngModuleForRootProvider of ngModuleForRootProviders.getArray()) {
                const ngModuleForRootProviderClassMetadata = this._getNgModuleProviderClassMetadata(ngModuleForRootProvider);
                if (!ngModuleForRootProviderClassMetadata) continue;
                if (!ngModuleForRootProviderClassMetadata.getCallDecorators()) continue;

                exps.push(this._getNgModuleExportInfo(ngModuleForRootProviderClassMetadata));
              }
            }
          }
        }

        // NgModule 목록에 추가
        results.push({
          filePath,
          moduleName: entrySdMetadata.module.name,
          className: entrySdMetadata.name,
          exports: exps.distinct()
        });
      }
      // 내부 파일 일때, 임시 모듈 정의 기록
      else if (FsUtil.isChildPath(filePath, this._packageSourcePath)) {
        // Component등 Module에 들어가야하는 파일만
        const decorator = decorators.single((item) => {
          const exp = item.getExpression();
          return exp.moduleName === "@angular/core"
            && [
              "Component",
              "Directive",
              "Pipe",
              "Injectable"
            ].includes(exp.name);
        });
        if (!decorator) continue;

        // 미리 지정된 값으로 끝나지 않는것은 제외
        if (
          !entrySdMetadata.name.endsWith("Page")
          && !entrySdMetadata.name.endsWith("Component")
          && !entrySdMetadata.name.endsWith("Modal")
          && !entrySdMetadata.name.endsWith("Control")
          && !entrySdMetadata.name.endsWith("PrintTemplate")
          && !entrySdMetadata.name.endsWith("Toast")
          && !entrySdMetadata.name.endsWith("Directive")
          && !entrySdMetadata.name.endsWith("Provider")
          && !entrySdMetadata.name.endsWith("Pipe")
        ) continue;

        // providedIn: "root" 인 Injectable은 제외
        if (decorator.getExpression().name === "Injectable") {
          const args = decorator.getArguments();
          const firstArg = args?.get(0);
          if (firstArg !== undefined) {
            if (!(firstArg instanceof SdObjectMetadata)) throw new NeverEntryError();
            const providedIn = firstArg.get("providedIn");
            if (providedIn === "root") continue;
          }
        }

        results.push({
          filePath: this._convertToNgModuleFilePath(filePath),
          moduleName: entrySdMetadata.module.name,
          className: this._convertToNgModuleClassName(entrySdMetadata.name),
          exports: [this._getNgModuleExportInfo(entrySdMetadata)]
        });
      }
    }

    this._filePathToSdNgModuleInfoCacheMap.set(filePath, results);

    return results;
  }

  private async _getNewNgModuleDefAsync(filePath: string,
                                        exportToModuleMap: Map<string, {
                                          filePath: string;
                                          moduleName: string;
                                          className: string;
                                        }>,
                                        exportSelectors: {
                                          selector: string;
                                          filePath: string;
                                          moduleName: string;
                                          className: string;
                                        }[]): Promise<ISdNgModuleDef | undefined> {
    // 소스파일이 아닌건 무시
    if (!FsUtil.isChildPath(filePath, this._packageSourcePath)) return undefined;

    if (this._filePathToSdNgModuleDefCacheMap.has(filePath)) {
      return this._filePathToSdNgModuleDefCacheMap.get(filePath);
    }

    const module = this._filePathToModuleMap.get(filePath)!;
    for (const entrySdMetadata of module.getMetadatas()) {
      if (!(entrySdMetadata instanceof SdClassMetadata)) continue;

      const decorators = entrySdMetadata.getCallDecorators();
      if (!decorators) continue;

      // Component등 새로운 Module에 들어가야하는 파일만
      const decorator = decorators.single((item) => {
        const exp = item.getExpression();
        return exp.moduleName === "@angular/core"
          && [
            "Component",
            "Directive",
            "Pipe",
            "Injectable"
          ].includes(exp.name);
      });
      if (!decorator) continue;

      // 미리 지정된 값으로 끝나지 않는것은 제외
      if (
        !entrySdMetadata.name.endsWith("Page")
        && !entrySdMetadata.name.endsWith("Component")
        && !entrySdMetadata.name.endsWith("Modal")
        && !entrySdMetadata.name.endsWith("Control")
        && !entrySdMetadata.name.endsWith("PrintTemplate")
        && !entrySdMetadata.name.endsWith("Toast")
        && !entrySdMetadata.name.endsWith("Directive")
        && !entrySdMetadata.name.endsWith("Provider")
        && !entrySdMetadata.name.endsWith("Pipe")
      ) continue;

      // providedIn: "root" 인 Injectable은 제외
      if (decorator.getExpression().name === "Injectable") {
        const args = decorator.getArguments();
        const firstArg = args?.get(0);
        if (firstArg !== undefined) {
          if (!(firstArg instanceof SdObjectMetadata)) throw new NeverEntryError();
          const providedIn = firstArg.get("providedIn");
          if (providedIn === "root") continue;
        }
      }

      const moduleFilePath = this._convertToNgModuleFilePath(filePath);

      const ngModuleDef: ISdNgModuleDef = {
        originFilePath: filePath,
        filePath: moduleFilePath,
        className: this._convertToNgModuleClassName(entrySdMetadata.name),

        importsObj: {
          "@angular/core": ["NgModule"],
          "@angular/common": ["CommonModule"]
        },
        imports: ["CommonModule"],
        declarations: [],
        exports: [],
        entryComponents: [],
        providers: []
      };

      const registImportObj = (requirePath: string, className: string): void => {
        if (!(requirePath in ngModuleDef.importsObj)) {
          ngModuleDef.importsObj[requirePath] = [];
        }
        if (!ngModuleDef.importsObj[requirePath].includes(className)) {
          ngModuleDef.importsObj[requirePath].push(className);
        }
      };

      // importObj에 현재파일 등록
      const importFilePath = this._getRequirePath(moduleFilePath, filePath);
      registImportObj(importFilePath, entrySdMetadata.name);

      // exports/declarations/entryComponents에 현재파일 등록
      if (["Component", "Directive", "Pipe"].includes(decorator.getExpression().name)) {
        ngModuleDef.exports.push(entrySdMetadata.name);
        ngModuleDef.declarations.push(entrySdMetadata.name);
      }
      if (decorator.getExpression().name === "Component") {
        ngModuleDef.entryComponents.push(entrySdMetadata.name);
      }

      // providers에 현재파일 등록
      if (decorator.getExpression().name === "Injectable") {
        ngModuleDef.providers.push(entrySdMetadata.name);
      }

      // imports에 현재파일에서 import된 클래스에 대한 module들 등록 (provider나 entryComponent 등에 대한 모듈 포함)
      const sourceFile = this._filePathToSourceFileMap.get(filePath);
      if (!sourceFile) throw new NeverEntryError();

      const sourceFileImports = sourceFile["imports"];
      if (!(sourceFileImports instanceof Array)) throw new NeverEntryError();

      for (const sourceFileImport of sourceFileImports) {
        const importNode = sourceFileImport as ts.Node;
        if (!ts.isStringLiteral(importNode)) throw new NeverEntryError();

        const moduleName = importNode.text.startsWith(".")
          ? await this._getPackageNameAsync(path.resolve(path.dirname(filePath), importNode.text))
          : importNode.text;
        if (moduleName === "tslib") continue;

        if (!ts.isImportDeclaration(importNode.parent)) throw new NeverEntryError();
        const namedBindings = importNode.parent.importClause?.namedBindings;
        if (!namedBindings) throw new NeverEntryError();
        if (!ts.isNamedImports(namedBindings)) continue;

        const exportKeys = namedBindings.elements.map((item) => moduleName + "|_|" + item.name.text);
        const importModules = exportKeys.map((exportKey) => exportToModuleMap.get(exportKey)).filterExists();


        ngModuleDef.imports.push(...importModules.map((item) => item.className));

        // importObjs
        for (const importModule of importModules) {
          if (FsUtil.isChildPath(importModule.filePath, this._packageSourcePath)) {
            const currImportFilePath = this._getRequirePath(moduleFilePath, importModule.filePath);
            registImportObj(currImportFilePath, importModule.className);
          }
          else {
            registImportObj(importModule.moduleName, importModule.className);
          }
        }
      }

      // imports에 현재파일 template에 포함된 컴포넌트에 대한 module들 등록 (provider나 entryComponent 등에 대한 모듈 포함)
      if (decorator.getExpression().name === "Component") {
        const arg = decorator.getArguments()?.get(0);
        if (arg === undefined) throw new NeverEntryError();
        if (!(arg instanceof SdObjectMetadata)) throw new NeverEntryError();

        const templateText = arg.get("template");
        if (templateText !== undefined) {
          if (typeof templateText !== "string") throw new NeverEntryError();
          const templateDOM = new JSDOM(templateText);

          for (const exportSelector of exportSelectors) {
            if (
              templateDOM.window.document.querySelector([
                exportSelector.selector,
                exportSelector.selector.replace(/\[/g, "[\\[").replace(/]/g, "\\]]"),
                exportSelector.selector.replace(/\[/g, "[\\(").replace(/]/g, "\\)]")
              ].join(", ")) != null
            ) {
              ngModuleDef.imports.push(exportSelector.className);

              // importObjs
              if (FsUtil.isChildPath(exportSelector.filePath, this._packageSourcePath)) {
                const currImportFilePath = this._getRequirePath(moduleFilePath, exportSelector.filePath);
                registImportObj(currImportFilePath, exportSelector.className);
              }
              else {
                registImportObj(exportSelector.moduleName, exportSelector.className);
              }
            }
          }
        }
      }

      this._filePathToSdNgModuleDefCacheMap.set(filePath, ngModuleDef);

      return ngModuleDef;
    }

    return undefined;
  }

  private async _getNewNgRoutingModuleDefAsync(filePath: string): Promise<ISdNgRoutingModuleDef | undefined> {
    // 소스파일이 아닌건 무시
    if (!FsUtil.isChildPath(filePath, this._packageSourcePath)) return undefined;

    if (this._filePathToSdNgRoutingModuleDefCacheMap.has(filePath)) {
      return this._filePathToSdNgRoutingModuleDefCacheMap.get(filePath);
    }

    const module = this._filePathToModuleMap.get(filePath)!;
    for (const entrySdMetadata of module.getMetadatas()) {
      if (!(entrySdMetadata instanceof SdClassMetadata)) continue;

      const decorators = entrySdMetadata.getCallDecorators();
      if (!decorators) continue;

      // Page만 포함 (LazyPage 비포함)
      if (
        !entrySdMetadata.name.endsWith("Page")
        || entrySdMetadata.name.endsWith("LazyPage")
      ) continue;

      // SRC DIR에 있는 파일 무시
      if (path.dirname(filePath) === this._packageSourcePath) continue;

      const childrenDirPath = path.resolve(path.dirname(filePath), this._convertFilePathToKebabCaseName(filePath, "Page"));

      const result = {
        pageFilePath: filePath,
        pageClassName: entrySdMetadata.name,
        ngModuleFilePath: this._convertToNgModuleFilePath(filePath),
        ngModuleClassName: this._convertToNgModuleClassName(entrySdMetadata.name),
        filePath: this._convertToNgRoutingModuleFilePath(filePath),
        className: this._convertToNgRoutingModuleClassName(entrySdMetadata.name),
        children: await this._getRoutingModuleChildrenAsync(filePath, childrenDirPath)
      };

      this._filePathToSdNgRoutingModuleDefCacheMap.set(filePath, result);

      return result;
    }

    return undefined;
  }

  private _getLazyComponent(filePath: string): ISdNgLazyComponent | undefined {
    // 소스파일이 아닌건 무시
    if (!FsUtil.isChildPath(filePath, this._packageSourcePath)) return undefined;

    if (this._filePathToSdNgLazyComponentCacheMap.has(filePath)) {
      return this._filePathToSdNgLazyComponentCacheMap.get(filePath);
    }

    const module = this._filePathToModuleMap.get(filePath)!;
    for (const entrySdMetadata of module.getMetadatas()) {
      if (!(entrySdMetadata instanceof SdClassMetadata)) continue;

      const decorators = entrySdMetadata.getCallDecorators();
      if (!decorators) continue;

      // LazyPage/LazyComponent/LazyControl만 포함
      if (
        !entrySdMetadata.name.endsWith("LazyPage")
        && !entrySdMetadata.name.endsWith("LazyComponent")
        && !entrySdMetadata.name.endsWith("LazyControl")
      ) continue;

      const requirePath = this._getRequirePath(this._packageSourceLazyPagesPath, filePath).replace(/LazyPage$/, "");
      const code = requirePath.split("/").slice(1).map((item) => StringUtil.toKebabCase(item)).join(".");

      const result = {
        code,
        ngModuleFilePath: this._convertToNgModuleFilePath(filePath),
        ngModuleClassName: this._convertToNgModuleClassName(entrySdMetadata.name)
      };

      this._filePathToSdNgLazyComponentCacheMap.set(filePath, result);

      return result;
    }

    return undefined;
  }

  private _getRouteChildrenText(children: ISdNgRoutingModuleChild[]): string {
    return children.map((child) => {
      let result = `{${os.EOL}`;
      result += `  path: "${child.path}",${os.EOL}`;
      if (child.loadChildren !== undefined) {
        result += `  loadChildren: "${child.loadChildren}"${os.EOL}`;
      }
      if (child.children && child.children.length > 0) {
        result += `  children: [${os.EOL}    ${this._getRouteChildrenText(child.children).replace(/\n/g, "\n    ")}${os.EOL}  ]${os.EOL}`;
      }

      result += "}";
      return result;
    }).join("," + os.EOL);
  }

  private _getNgModuleExportInfo(classMetadata: SdClassMetadata): ISdNgModuleExportInfo {
    const decorators = classMetadata.getCallDecorators();
    if (!decorators) throw new NeverEntryError();
    const firstArg = decorators
      .single((item) => (
        (item.getExpression().moduleName === "@angular/core" && item.getExpression().name === "Component")
        || (item.getExpression().moduleName === "@angular/core" && item.getExpression().name === "Directive")
      ))
      ?.getArguments()
      ?.get(0);

    if (firstArg === undefined) {
      return {
        moduleName: classMetadata.module.name,
        className: classMetadata.name,
        templateSelector: undefined
      };
    }

    if (!(firstArg instanceof SdObjectMetadata)) throw new NeverEntryError();
    const selector = firstArg.get("selector");
    if (typeof selector !== "undefined" && typeof selector !== "string") throw new NeverEntryError();
    return {
      moduleName: classMetadata.module.name,
      className: classMetadata.name,
      templateSelector: selector
    };
  }

  private _getModuleMetadataEntry(moduleName: string, metadataName: string): { module: SdModuleMetadata; metadata: MetadataEntry } | undefined {
    if (!this._moduleNameToFilePathsMap) throw new NeverEntryError();

    const filePaths = this._moduleNameToFilePathsMap.get(moduleName);
    if (!filePaths) return undefined;
    for (const filePath of filePaths) {
      const module = this._filePathToModuleMap.get(filePath);
      if (!module) continue;

      if (!(metadataName in module.metadataObj)) continue;

      const metadata = module.metadataObj[metadataName];
      return { module, metadata };
    }

    return undefined;
  }

  private _getNgModuleProviderClassMetadata(sdMetadata: TSdMetadata): SdClassMetadata | undefined {
    if (sdMetadata instanceof SdClassMetadata) {
      return sdMetadata;
    }
    else if (sdMetadata instanceof SdObjectMetadata) {
      const provideArg = sdMetadata.get("provide");
      if (!(provideArg instanceof SdClassMetadata)) return undefined;
      if (provideArg.module !== sdMetadata.module) return undefined;
      return provideArg;
    }
    else {
      return undefined;
    }
  }

  private async _getPackageNameAsync(filePath: string): Promise<string> {
    let cursorDirPath = path.dirname(filePath);
    while (true) {
      if (FsUtil.exists(path.resolve(cursorDirPath, "package.json"))) {
        break;
      }
      cursorDirPath = path.dirname(cursorDirPath);
    }
    const npmConfigFilePath = path.resolve(cursorDirPath, "package.json");
    const npmConfig: INpmConfig = await FsUtil.readJsonAsync(npmConfigFilePath);
    return npmConfig.name;
  }

  private async _getRoutingModuleChildrenAsync(rootPagePath: string, pagesDirPath: string): Promise<ISdNgRoutingModuleChild[]> {
    const children: ISdNgRoutingModuleChild[] = [];

    if (!FsUtil.exists(pagesDirPath)) return [];
    const childNames = await FsUtil.readdirAsync(pagesDirPath);

    for (const childName of childNames) {
      // 파일일때
      if (!(await FsUtil.isDirectoryAsync(path.resolve(pagesDirPath, childName)))) {
        // PAGE 외의 파일 무시
        if (
          !childName.endsWith("Page.ts")
          || childName.endsWith("LazyPage.ts")
        ) continue;

        const childFilePath = path.resolve(pagesDirPath, childName);

        const pathName = this._convertFilePathToKebabCaseName(childFilePath, "Page");

        const childNgRoutingModuleRequirePath = this._getRequirePath(
          (rootPagePath === this._packageSourcePath ? rootPagePath : this._convertToNgRoutingModuleFilePath(rootPagePath)),
          this._convertToNgRoutingModuleFilePath(childFilePath)
        );

        const childNgRoutingModuleClassName = PathUtil.removeExt(childNgRoutingModuleRequirePath);

        children.push({
          path: pathName,
          loadChildren: childNgRoutingModuleRequirePath
            + "#" + childNgRoutingModuleClassName
            + "?chunkName=" + childNgRoutingModuleClassName
        });
      }
      // 디렉토리일때
      else {
        const childDirPath = path.resolve(pagesDirPath, childName);

        // 이 디렉토리에 대한 별도의 RoutingModule이 생성될게 아니면, 현재 RoutingModule에 children으로 추가함
        const pageFileName = StringUtil.toPascalCase(childName) + "Page.ts";
        if (FsUtil.exists(path.resolve(pagesDirPath, pageFileName))) continue;

        const childChildren = await this._getRoutingModuleChildrenAsync(rootPagePath, childDirPath);

        if (childChildren.length > 0) {
          children.push({
            path: childName,
            children: await this._getRoutingModuleChildrenAsync(rootPagePath, childDirPath)
          });
        }
      }
    }

    return children;
  }

  private _convertToNgModuleFilePath(filePath: string): string {
    return PathUtil.changeFileDirectory(filePath, this._packageSourcePath, this._modulesGenPath)
      .replace(/\.ts$/, "Module.ts");
  }

  private _convertToNgModuleClassName(origClassName: string): string {
    return origClassName + "Module";
  }

  private _convertToNgRoutingModuleFilePath(filePath: string): string {
    return PathUtil.changeFileDirectory(filePath, this._packageSourcePath, this._modulesGenPath)
      .replace(/\.ts$/, "RoutingModule.ts");
  }

  private _convertToNgRoutingModuleClassName(origClassName: string): string {
    return origClassName + "RoutingModule";
  }

  private _convertFilePathToKebabCaseName(filePath: string, suffix: string): string {
    return StringUtil.toKebabCase(path.basename(filePath).replace(new RegExp(suffix + "\\.ts$"), ""));
  }

  private _getRequirePath(sourcePath: string, importFilePath: string): string {
    const sourceDirPath = (FsUtil.exists(sourcePath) && FsUtil.isDirectory(sourcePath)) ? sourcePath : path.dirname(sourcePath);
    const result = path.relative(sourceDirPath, importFilePath)
      .replace(/\\/g, "/")
      .replace(/\.ts$/, "");
    return result.startsWith(".") ? result : ("./" + result);
  }
}

interface ISdMetadataInfo {
  module: SdModuleMetadata;
  metadata: MetadataEntry;
}

interface ISdNgModuleInfo {
  filePath: string;
  moduleName: string;
  className: string;
  exports: ISdNgModuleExportInfo[];
}

interface ISdNgModuleExportInfo {
  moduleName: string;
  className: string;
  templateSelector: string | undefined;
}

interface ISdNgModuleDef {
  originFilePath: string;
  filePath: string;
  className: string;

  importsObj: Record<string, string[]>;
  imports: string[];
  declarations: string[];
  exports: string[];
  entryComponents: string[];
  providers: string[];
}

interface ISdNgRoutingModuleDef {
  filePath: string;
  className: string;
  ngModuleFilePath: string;
  ngModuleClassName: string;
  pageFilePath: string;
  pageClassName: string;
  children: ISdNgRoutingModuleChild[];
}

interface ISdNgRoutingModuleChild {
  path: string;
  loadChildren?: string;
  children?: ISdNgRoutingModuleChild[];
}

interface ISdNgLazyComponent {
  code: string;
  ngModuleFilePath: string;
  ngModuleClassName: string;
}

export type TSdMetadata =
  undefined
  | string
  | number
  | boolean
  | SdClassMetadata
  | SdCallMetadata
  | SdFunctionMetadata
  | SdArrayMetadata
  | SdObjectMetadata
  | SdErrorMetadata;