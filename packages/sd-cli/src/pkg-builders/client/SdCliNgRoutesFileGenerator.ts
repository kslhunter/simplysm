import path from "path";
import { FsUtil, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import { StringUtil } from "@simplysm/sd-core-common";

export class SdCliNgRoutesFileGenerator {
  static watch(pkgPath: string, noLazyRoute?: boolean) {
    const routesFilePath = path.resolve(pkgPath, "src/routes.ts");
    let cache = FsUtil.exists(routesFilePath) ? FsUtil.readFile(routesFilePath) : undefined;

    SdFsWatcher.watch([path.resolve(pkgPath, "src")]).onChange({ delay: 50 }, () => {
      cache = this.run(pkgPath, cache, noLazyRoute);
    });

    cache = this.run(pkgPath, cache, noLazyRoute);
  }

  static run(pkgPath: string, cache?: string, noLazyRoute?: boolean): string {
    const appDirPath = path.resolve(pkgPath, "src/app");
    const routesFilePath = path.resolve(pkgPath, "src/routes.ts");

    // 내부 파일들 import
    const result: TInfo = new Map();
    const filePaths = FsUtil.glob(path.resolve(appDirPath, "**/*Page.ts"));
    for (const filePath of filePaths.orderBy()) {
      const relModulePath = PathUtil.posix(path.relative(appDirPath, filePath)).slice(0, -3);
      const codes = relModulePath
        .slice(0, -4)
        .split("/")
        .map((item) => StringUtil.toKebabCase(item));

      let cursorItem!: { relModulePath?: string; children: TInfo };
      let cursor = result;

      for (const code of codes) {
        cursorItem = cursor.getOrCreate(code, { children: new Map() });
        cursor = cursorItem.children;
      }

      cursorItem.relModulePath = relModulePath;
    }

    const imports: string[] = [];
    const fn = (currInfo: TInfo, indent: number): string => {
      const indentStr = new Array(indent).fill(" ").join("");

      let cont = "";
      for (const [key, val] of currInfo) {
        cont += indentStr + "{\n";
        cont += indentStr + `  path: "${key}",\n`;
        if (val.relModulePath != null) {
          if (noLazyRoute) {
            cont += indentStr + `  component: ${path.basename(val.relModulePath)},\n`;
            imports.push(`import { ${path.basename(val.relModulePath)} } from "./app/${val.relModulePath}";`);
          } else {
            cont +=
              indentStr +
              `  loadComponent: () => import("./app/${val.relModulePath}").then((m) => m.${path.basename(val.relModulePath)}),\n`;
          }
        }
        if (val.children.size > 0) {
          cont += indentStr + `  children: [\n`;
          cont += fn(val.children, indent + 4) + "\n";
          cont += indentStr + `  ]\n`;
        }
        cont += indentStr + "},\n";
      }
      return cont.trimEnd();
    };

    const routes = fn(result, 2);

    const content = `
import {Routes} from "@angular/router";
${imports.join("\n")}
export const routes: Routes = [
${routes}
];`.trim();
    if (content !== cache) {
      FsUtil.writeFile(routesFilePath, content);
    }
    return content;
  }
}

type TInfo = Map<
  string,
  {
    relModulePath?: string;
    children: TInfo;
  }
>;