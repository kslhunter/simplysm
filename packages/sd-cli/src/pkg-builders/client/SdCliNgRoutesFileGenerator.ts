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
    const filePaths = FsUtil.glob(path.resolve(appDirPath, "**/*{P,.p}age.ts"));
    for (const filePath of filePaths.orderBy()) {
      const relModulePath = PathUtil.posix(path.relative(appDirPath, filePath)).slice(0, -3);
      const codes = relModulePath
        .replace(/\.page$/, "")
        .replace(/Page$/, "")
        .split("/");
      // .map((item) => StringUtil.toKebabCase(item));

      let cursorItem!: { relModulePath?: string; children: TInfo };
      let cursor = result;

      for (let i = 0; i < codes.length; i++) {
        if (i === codes.length - 2) continue; // 마지막 모음 폴더 무시.
        const code = codes[i];
        cursorItem = cursor.getOrCreate(StringUtil.toKebabCase(code), { children: new Map() });
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
            cont += indentStr
              + `  component: ${StringUtil.toPascalCase(path.basename(val.relModulePath))},\n`;
            imports.push(`import { ${StringUtil.toPascalCase(path.basename(val.relModulePath))} } from "./app/${val.relModulePath}";`);
          }
          else {
            cont +=
              indentStr +
              `  loadComponent: () => import("./app/${val.relModulePath}").then((m) => m.${StringUtil.toPascalCase(
                path.basename(
                  val.relModulePath))}),\n`;
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
import { type Routes } from "@angular/router";
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
