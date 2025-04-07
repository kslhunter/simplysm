import { FsUtils, PathUtils, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";
import { StringUtils } from "@simplysm/sd-core-common";
import { INpmConfig } from "../../types/common-configs.types";

export class SdCliDbContextFileGenerator {
  static watch(pkgPath: string, kebabName: string) {
    const targetFilePath = path.resolve(pkgPath, `src/${kebabName}.ts`);
    let cache = FsUtils.exists(targetFilePath) ? FsUtils.readFile(targetFilePath) : undefined;

    SdFsWatcher.watch([path.resolve(pkgPath, "src")]).onChange({ delay: 50 }, () => {
      cache = this.run(pkgPath, kebabName, cache);
    });

    cache = this.run(pkgPath, kebabName, cache);
  }

  static run(pkgPath: string, kebabName: string, cache?: string): string {
    const npmConfig = FsUtils.readJson(path.resolve(pkgPath, "package.json")) as INpmConfig;
    const useExt = npmConfig.dependencies?.["@simplysm/sd-orm-common-ext"] != null;

    const targetFilePath = path.resolve(pkgPath, `src/${kebabName}.ts`);

    const importTexts: string[] = [
      "import { IDbMigration, Queryable } from \"@simplysm/sd-orm-common\";",
      "import { Type } from \"@simplysm/sd-core-common\";",
    ];

    if (useExt) {
      importTexts.push("import { DbContextExt } from \"@simplysm/sd-orm-common-ext\";");
    }
    else {
      importTexts.push("import { DbContext } from \"@simplysm/sd-orm-common\";");
    }

    // Migrations
    const migTexts: string[] = [];
    {
      const filePaths = FsUtils.glob(
        path.resolve(pkgPath, "src/migrations/**/*.ts"),
        { nodir: true },
      );

      for (const filePath of filePaths.orderBy()) {
        const requirePath = PathUtils.posix(path.relative(path.dirname(targetFilePath), filePath))
          .replace(/\.tsx?$/, "")
          .replace(/\/index$/, "");
        const className = StringUtils.toPascalCase(path.basename(
          filePath,
          path.extname(filePath),
        ));
        importTexts.push(`import { ${className} } from "./${requirePath}";`);
        migTexts.push(className + ",");
      }
    }

    // Models
    const modelTexts: string[] = [];
    {
      const filePaths = FsUtils.glob(
        path.resolve(pkgPath, "src/models/**/*.ts"),
        { nodir: true },
      );

      for (const filePath of filePaths.orderBy()) {
        const requirePath = PathUtils.posix(path.relative(path.dirname(targetFilePath), filePath))
          .replace(/\.tsx?$/, "")
          .replace(/\/index$/, "");
        const varName = StringUtils.toCamelCase(path.basename(
          filePath,
          path.extname(filePath),
        ));
        const className = StringUtils.toPascalCase(path.basename(
          filePath,
          path.extname(filePath),
        ));
        importTexts.push(`import { ${className} } from "./${requirePath}";`);
        modelTexts.push(`${varName} = new Queryable(this, ${className})`);
      }
    }

    const content = `
${importTexts.join("\n")}

export class MainDbContext extends DbContext${useExt ? "Ext" : ""} {
  get migrations(): Type<IDbMigration>[] {
    return [
${migTexts.map(item => "    " + item).join("\n")}
    ];
  }

${modelTexts.map(item => "  " + item).join("\n")}
}
`.trim();
    if (content.trim() !== cache?.trim()) {
      FsUtils.writeFile(targetFilePath, content);
    }
    return content;
  }
}
