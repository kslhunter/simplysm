import { FsUtils, HashUtils, PathUtils, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";
import { StringUtils } from "@simplysm/sd-core-common";
import { INpmConfig } from "../../types/common-config/INpmConfig";

export class SdCliDbContextFileGenerator {
  cachedHash?: string;

  watch(pkgPath: string, kebabName: string) {
    const targetFilePath = path.resolve(pkgPath, `src/${kebabName}.ts`);
    this.cachedHash = FsUtils.exists(targetFilePath)
      ? HashUtils.get(FsUtils.readFile(targetFilePath))
      : undefined;

    SdFsWatcher.watch([path.resolve(pkgPath, "src")], {
      ignored: [targetFilePath],
    }).onChange({ delay: 50 }, (changeInfos) => {
      if (changeInfos.some((item) => ["add", "addDir", "unlink", "unlinkDir"].includes(item.event)))
        this.run(pkgPath, kebabName);
    });

    this.run(pkgPath, kebabName);
  }

  run(pkgPath: string, kebabName: string): { changed: boolean; filePath: string; content: string } {
    const npmConfig = FsUtils.readJson(path.resolve(pkgPath, "package.json")) as INpmConfig;
    const useExt = npmConfig.dependencies?.["@simplysm/sd-orm-common-ext"] != null;

    const targetFilePath = path.resolve(pkgPath, `src/${kebabName}.ts`);

    const importTexts: string[] = [];

    if (useExt) {
      importTexts.push('import { DbContextExt } from "@simplysm/sd-orm-common-ext";');
    } else {
      importTexts.push('import { DbContext } from "@simplysm/sd-orm-common";');
    }

    // Migrations
    const migTexts: string[] = [];
    {
      const filePaths = FsUtils.glob(path.resolve(pkgPath, "src/migrations/**/*.ts"), {
        nodir: true,
      });

      for (const filePath of filePaths.orderBy()) {
        const requirePath = PathUtils.posix(path.relative(path.dirname(targetFilePath), filePath))
          .replace(/\.tsx?$/, "")
          .replace(/\/index$/, "");
        const fileName = path.basename(filePath, path.extname(filePath));

        const className = fileName.includes("_") ? fileName : StringUtils.toPascalCase(fileName);

        importTexts.push(`import { ${className} } from "./${requirePath}";`);
        migTexts.push(className + ",");
      }
    }

    // Models
    const modelTexts: string[] = [];
    {
      const filePaths = FsUtils.glob(path.resolve(pkgPath, "src/models/**/*.ts"), { nodir: true });

      for (const filePath of filePaths.orderBy()) {
        const requirePath = PathUtils.posix(path.relative(path.dirname(targetFilePath), filePath))
          .replace(/\.tsx?$/, "")
          .replace(/\/index$/, "");
        const fileName = path.basename(filePath, path.extname(filePath));

        const varName = fileName.includes("_") ? fileName : StringUtils.toCamelCase(fileName);
        const className = fileName.includes("_") ? fileName : StringUtils.toPascalCase(fileName);

        importTexts.push(`import { ${className} } from "./${requirePath}";`);
        if (
          useExt &&
          [
            "systemDataLog",
            "systemLog",
            "authentication",
            "user",
            "userConfig",
            "userPermission",
          ].includes(varName)
        ) {
          modelTexts.push(`override ${varName} = new Queryable(this, ${className})`);
        } else {
          modelTexts.push(`${varName} = new Queryable(this, ${className})`);
        }
      }
    }

    // Views
    const viewTexts: string[] = [];
    {
      const filePaths = FsUtils.glob(path.resolve(pkgPath, "src/views/**/*.ts"), { nodir: true });

      for (const filePath of filePaths.orderBy()) {
        const requirePath = PathUtils.posix(path.relative(path.dirname(targetFilePath), filePath))
          .replace(/\.tsx?$/, "")
          .replace(/\/index$/, "");
        const fileName = path.basename(filePath, path.extname(filePath));

        const varName = fileName.includes("_") ? fileName : StringUtils.toCamelCase(fileName);
        const className = fileName.includes("_") ? fileName : StringUtils.toPascalCase(fileName);

        importTexts.push(`import { ${className} } from "./${requirePath}";`);
        viewTexts.push(`${varName} = new Queryable(this, ${className})`);
      }
    }

    // Stored Procedures
    const spTexts: string[] = [];
    {
      const filePaths = FsUtils.glob(path.resolve(pkgPath, "src/stored-procedures/**/*.ts"), {
        nodir: true,
      });

      for (const filePath of filePaths.orderBy()) {
        const requirePath = PathUtils.posix(path.relative(path.dirname(targetFilePath), filePath))
          .replace(/\.tsx?$/, "")
          .replace(/\/index$/, "");
        const fileName = path.basename(filePath, path.extname(filePath));

        const varName = fileName.includes("_") ? fileName : StringUtils.toCamelCase(fileName);
        const className = fileName.includes("_") ? fileName : StringUtils.toPascalCase(fileName);

        importTexts.push(`import { ${className} } from "./${requirePath}";`);
        spTexts.push(`${varName} = new StoredProcedure(this, ${className})`);
      }
    }

    importTexts.push(
      ...[
        `import { IDbMigration${
          modelTexts.length > 0 || viewTexts.length > 0 ? ", Queryable" : ""
        }${spTexts.length > 0 ? ", StoredProcedure" : ""} } from "@simplysm/sd-orm-common";`,
        'import { Type } from "@simplysm/sd-core-common";',
      ],
    );

    const content = `
${importTexts.join("\n")}

export class ${StringUtils.toPascalCase(kebabName)} extends DbContext${useExt ? "Ext" : ""} {
  get migrations(): Type<IDbMigration>[] {
    return [
${migTexts.map((item) => "    " + item).join("\n")}
    ];
  }
${modelTexts.length > 0 ? "\n  // Models\n" + modelTexts.map((item) => "  " + item).join("\n") : ""}
${viewTexts.length > 0 ? "\n  // Views\n" + viewTexts.map((item) => "  " + item).join("\n") : ""}
${spTexts.length > 0 ? "\n  // StoredProcedures\n" + spTexts.map((item) => "  " + item).join("\n") : ""}
}
`.trim();
    const currHash = HashUtils.get(content);
    if (currHash !== this.cachedHash) {
      FsUtils.writeFile(targetFilePath, content);
      this.cachedHash = currHash;
      return { changed: true, filePath: targetFilePath, content };
    } else {
      return { changed: false, filePath: targetFilePath, content };
    }
  }
}
