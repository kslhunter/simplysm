import path from "path";
import {FsUtil, PathUtil, SdFsWatcher} from "@simplysm/sd-core-node";

export class SdCliIndexFileGenerator {
  public static async watchAsync(pkgPath: string, polyfills?: string[]): Promise<void> {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");
    let cache = FsUtil.exists(indexFilePath) ? FsUtil.readFile(indexFilePath) : undefined;

    SdFsWatcher
      .watch([path.resolve(pkgPath, "src")])
      .onChange({}, async () => {
        cache = await this.runAsync(pkgPath, polyfills, cache);
      });

    cache = await this.runAsync(pkgPath, polyfills, cache);
  }

  public static async runAsync(pkgPath: string, polyfills?: string[], cache?: string): Promise<string> {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");

    const importTexts: string[] = [];

    // polyfills 를 모두 import
    if (polyfills) {
      for (const polyfill of polyfills.orderBy()) {
        importTexts.push(`import "${polyfill}";`);
      }
    }

    // 내부 파일들 import
    const filePaths = await this._getFilePathsAsync(pkgPath);
    for (const filePath of filePaths.orderBy()) {
      const requirePath = PathUtil.posix(path.relative(path.dirname(indexFilePath), filePath))
        .replace(/\.tsx?$/, "")
        .replace(/\/index$/, "");

      const sourceTsFileContent = await FsUtil.readFileAsync(filePath);
      if (sourceTsFileContent.split("\n").some((line) => line.startsWith("export "))) {
        importTexts.push(`export * from "./${requirePath}";`);
      }
      else {
        importTexts.push(`import "./${requirePath}";`);
      }
    }

    const content = importTexts.join("\n") + "\n";
    if (content.trim() !== cache?.trim()) {
      await FsUtil.writeFileAsync(indexFilePath, content);
    }
    return content;
  }

  private static async _getFilePathsAsync(pkgPath: string): Promise<string[]> {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");

    const tsconfig = await FsUtil.readJsonAsync(path.resolve(pkgPath, "tsconfig.json"));
    const entryFilePaths: string[] = tsconfig.files?.map((item) => path.resolve(pkgPath, item)) ?? [];

    return (await FsUtil.globAsync(path.resolve(pkgPath, "src/**/*{.ts,.tsx}"), {nodir: true}))
      .filter((item) => !entryFilePaths.includes(item) && item !== indexFilePath && !item.endsWith(".d.ts"));
  }
}