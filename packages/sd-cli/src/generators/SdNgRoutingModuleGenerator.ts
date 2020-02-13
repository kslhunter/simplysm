import * as path from "path";
import {FsUtil} from "@simplysm/sd-core-node";
import {SdNgModuleGenerator} from "./SdNgModuleGenerator";
import {NotImplementError} from "@simplysm/sd-core-common";

export class SdNgRoutingModuleGenerator {
  private readonly _cacheObj: { [filePath: string]: string } = {};
  private readonly _pagesPath: string;
  private readonly _routesGenPath: string;
  public infos: ISdNgRoutingModuleInfo[] = [];

  public constructor(private readonly _srcPath: string,
                     private readonly _ngModuleGenerator: SdNgModuleGenerator) {
    this._pagesPath = path.resolve(this._srcPath, "pages");
    this._routesGenPath = path.resolve(this._srcPath, "_routes");

    if (FsUtil.exists(this._routesGenPath)) {
      const filePaths = FsUtil.glob(path.resolve(this._routesGenPath, "**", "*.ts"));
      for (const filePath of filePaths) {
        this._cacheObj[path.resolve(filePath)] = FsUtil.readFile(filePath);
      }
    }
  }

  public async generateAsync(): Promise<boolean> {
    await this._configInfosAsync();
    const changed1 = await this._writeFilesAsync();
    const changed2 = await this._removeDeletedModuleFileAsync();
    return changed1 || changed2;
  }

  private async _configInfosAsync(): Promise<void> {
    this.infos = [];

    if (!FsUtil.exists(this._pagesPath)) return;

    const pageTsFilePaths = await FsUtil.globAsync(path.resolve(this._pagesPath, "**", "*.ts"));
    for (const pageTsFilePath of pageTsFilePaths) {
      const info: ISdNgRoutingModuleInfo = {
        pagePath: pageTsFilePath,
        filePath: path.resolve(this._routesGenPath, path.relative(this._pagesPath, pageTsFilePath))
          .replace(/Page\.ts$/, "RoutingModule.ts"),
        modulePath: "",
        children: []
      };

      // Component Class
      const className = path.basename(pageTsFilePath, path.extname(pageTsFilePath))
        .replace(/\.ts$/, "");

      // NgModule
      const ngModuleInfo = this._ngModuleGenerator.infos.single((item) => {
        const key = Object.keys(item.importObj).single((key1) =>
          path.resolve(path.dirname(item.filePath), key1) === pageTsFilePath.replace(/\.ts$/, "")
        );
        if (!key) return false;
        if (!item.importObj[key]) return false;
        return item.importObj[key].includes(className);
      });
      if (!ngModuleInfo) throw new NotImplementError();
      info.modulePath = ngModuleInfo.filePath;

      // Routing
      const childDirName = className[0].toLowerCase() +
        className.slice(1).replace(/Page$/, "")
          .replace(/[A-Z]/, (item) => "-" + item.toLowerCase());
      const childDirPath = path.resolve(path.dirname(pageTsFilePath), childDirName);
      if (FsUtil.exists(childDirPath) && await FsUtil.isDirectoryAsync(childDirPath)) {
        info.children = await this._getRouteChildrenAsync(pageTsFilePath, childDirPath);
      }

      if (!info.filePath) throw new NotImplementError();
      if (!info.pagePath) throw new NotImplementError();
      if (!info.modulePath) throw new NotImplementError();

      this.infos.push(info);
    }

    this.infos.push({
      pagePath: undefined,
      modulePath: undefined,
      filePath: path.resolve(this._srcPath, "_routes.ts"),
      children: await this._getRouteChildrenAsync(undefined, this._pagesPath)
    });
  }

  private async _writeFilesAsync(): Promise<boolean> {
    let changed = false;

    for (const info of this.infos) {
      if (info.modulePath && info.pagePath) {
        const moduleClassName = path.basename(info.modulePath, path.extname(info.modulePath));
        const moduleRelativePath = path.relative(path.dirname(info.filePath), info.modulePath)
          .replace(/\\/g, "/")
          .replace(/\.ts$/, "");

        const pageClassName = path.basename(info.pagePath, path.extname(info.pagePath));
        const pageRelativePath = path.relative(path.dirname(info.filePath), info.pagePath)
          .replace(/\\/g, "/")
          .replace(/\.ts$/, "");

        const className = path.basename(info.filePath, path.extname(info.filePath));

        const content = `
import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";
import {${moduleClassName}} from "${moduleRelativePath}";
import {${pageClassName}} from "${pageRelativePath}";

@NgModule({
  imports: [
    CommonModule,
    ${moduleClassName},
    RouterModule.forChild([
      {path: "", component: ${pageClassName}${info.children.length > 0 ? ", children: [\n        " + this._getChildrenArrText(info.children).replace(/\n/g, "\n        ") + "\n      ]" : ""}}
    ])
  ]
})
export class ${className} {
}`.trim();

        if (this._cacheObj[info.filePath] !== content) {
          this._cacheObj[info.filePath] = content;
          await FsUtil.writeFileAsync(info.filePath, content);
          changed = true;
        }
      }
      else {
        const content = `
export const routes = [
  ${this._getChildrenArrText(info.children).replace(/\n/g, "\n  ")}
];`.trim();

        if (this._cacheObj[info.filePath] !== content) {
          this._cacheObj[info.filePath] = content;
          await FsUtil.writeFileAsync(info.filePath, content);
          changed = true;
        }
      }
    }

    return changed;
  }

  private async _removeDeletedModuleFileAsync(): Promise<boolean> {
    let changed = false;

    for (const filePath of Object.keys(this._cacheObj)) {
      if (!this.infos.some((item) => item.filePath === filePath)) {
        await FsUtil.removeAsync(filePath);
        delete this._cacheObj[filePath];
        changed = true;
      }
    }

    return changed;
  }

  private async _getRouteChildrenAsync(pagePath: string | undefined, pageChildDirPath: string): Promise<ISdNgRoutingModuleRoute[]> {
    const children: ISdNgRoutingModuleRoute[] = [];

    const childNames = await FsUtil.readdirAsync(pageChildDirPath);

    for (const childName of childNames) {
      const childPath = path.resolve(pageChildDirPath, childName);
      if (await FsUtil.isDirectoryAsync(childPath)) {
        const fileName = childName[0].toUpperCase() +
          childName.slice(1).replace(/-[a-z]/g, (item) => item[1].toUpperCase()) +
          "Page.ts";
        if (FsUtil.exists(path.resolve(pageChildDirPath, fileName))) continue;

        children.push({
          path: childName,
          children: await this._getRouteChildrenAsync(pagePath, childPath)
        });
      }
      else {
        const className = path.basename(childName, path.extname(childName));
        const pathName = className[0].toLowerCase() +
          className.slice(1).replace(/Page$/, "")
            .replace(/[A-Z]/g, (item) => "-" + item.toLowerCase());

        children.push({
          path: pathName,
          loadChildren: "./" + (!pagePath ? "_routes/" : "") + path.relative(pagePath ? path.dirname(pagePath) : this._pagesPath, pageChildDirPath).replace(/\\/g, "/")
            + "/" + className.replace(/Page$/, "RoutingModule")
            + "#" + className.replace(/Page$/, "RoutingModule")
        });
      }
    }

    return children;
  }

  private _getChildrenArrText(children: ISdNgRoutingModuleRoute[]): string {
    return children.map((child) => {
      let result = `{path: "${child.path}", `;
      if (child.loadChildren) {
        result += `loadChildren: "${child.loadChildren}"`;
      }
      if (child.children && child.children.length > 0) {
        result += `children: [\n  ${this._getChildrenArrText(child.children).replace(/\n/g, "\n  ")}\n]`;
      }

      result += "}";
      return result;
    }).join(",\n");
  }
}

export interface ISdNgRoutingModuleInfo {
  pagePath: string | undefined;
  modulePath: string | undefined;
  filePath: string;
  children: ISdNgRoutingModuleRoute[];
}

export interface ISdNgRoutingModuleRoute {
  path: string;
  loadChildren?: string;
  children?: ISdNgRoutingModuleRoute[];
}