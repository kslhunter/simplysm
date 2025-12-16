import { FsUtils, HashUtils, PathUtils, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";

export class SdCliIndexFileGenerator {
  cachedHash?: string;

  async watchAsync(pkgPath: string, polyfills?: string[], excludes?: string[]) {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");
    this.cachedHash = FsUtils.exists(indexFilePath)
      ? HashUtils.get(await FsUtils.readFileAsync(indexFilePath))
      : undefined;

    const watcher = await SdFsWatcher.watchAsync([path.resolve(pkgPath, "src")], {
      ignored: await this._getExcludesAsync(pkgPath, excludes),
    });
    watcher.onChange({ delay: 50 }, async (changeInfos) => {
      if (changeInfos.some((item) => ["add", "addDir", "unlink", "unlinkDir"].includes(item.event)))
        await this.runAsync(pkgPath, polyfills, excludes);
    });

    await this.runAsync(pkgPath, polyfills, excludes);
  }

  async runAsync(pkgPath: string, polyfills?: string[], excludes?: string[]) {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");

    const importTexts: string[] = [];

    // polyfills 를 모두 import
    if (polyfills) {
      for (const polyfill of polyfills.orderBy()) {
        importTexts.push(`import "${polyfill}";`);
      }
    }

    // 내부 파일들 import
    const filePaths = await this._getFilePathsAsync(pkgPath, excludes);
    for (const filePath of filePaths.orderBy()) {
      const requirePath = PathUtils.posix(path.relative(path.dirname(indexFilePath), filePath))
        .replace(/\.tsx?$/, "")
        .replace(/\/index$/, "");

      const sourceTsFileContent = await FsUtils.readFileAsync(filePath);
      if (sourceTsFileContent.split("\n").some((line) => line.startsWith("export "))) {
        importTexts.push(`export * from "./${requirePath}";`);
      } else {
        importTexts.push(`import "./${requirePath}";`);
      }
    }

    const content = importTexts.join("\n") + "\n";
    const currHash = HashUtils.get(content);
    if (currHash !== this.cachedHash) {
      await FsUtils.writeFileAsync(indexFilePath, content);
      this.cachedHash = currHash;
      return { changed: true, filePath: indexFilePath, content };
    } else {
      return { changed: false, filePath: indexFilePath, content };
    }
  }

  private async _getFilePathsAsync(pkgPath: string, excludes?: string[]) {
    /*const indexFilePath = path.resolve(pkgPath, "src/index.ts");

    const tsconfig = await FsUtils.readJsonAsync(path.resolve(pkgPath, "tsconfig.json"));
    const entryFilePaths: string[] =
      tsconfig.files?.map((item) => path.resolve(pkgPath, item)) ?? [];*/

    return await FsUtils.globAsync(path.resolve(pkgPath, "src/**/*{.ts,.tsx}"), {
      nodir: true,
      ignore: await this._getExcludesAsync(pkgPath, excludes),
    });
  }

  private async _getExcludesAsync(pkgPath: string, excludes?: string[]) {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");

    const tsconfig = await FsUtils.readJsonAsync(path.resolve(pkgPath, "tsconfig.json"));

    return [
      indexFilePath,
      ...[
        ...(tsconfig.excludes ?? []),
        ...(excludes ?? []),
        "src/**/*.d.ts",
        "src/index.ts",
        "src/workers/**/*{.ts,.tsx}",

        // TODO: index에 없는 파일은 watch가 안됨... 처리 필요함.
        // "src/internal/**/*{.ts,.tsx}",
      ].map((item) => path.resolve(pkgPath, item)),
    ].map((item) => item.replace(/\\/g, "/"));
  }
}
