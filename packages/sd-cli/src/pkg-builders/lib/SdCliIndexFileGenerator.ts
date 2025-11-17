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
      ignored: [indexFilePath],
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
    const filePaths = await this.#getFilePathsAsync(pkgPath, excludes);
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

  async #getFilePathsAsync(pkgPath: string, excludes?: string[]) {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");

    const tsconfig = await FsUtils.readJsonAsync(path.resolve(pkgPath, "tsconfig.json"));
    const entryFilePaths: string[] =
      tsconfig.files?.map((item) => path.resolve(pkgPath, item)) ?? [];

    return (
      await FsUtils.globAsync(path.resolve(pkgPath, "src/**/*{.ts,.tsx}"), {
        nodir: true,
        ignore: [...(tsconfig.excludes ?? []), ...(excludes ?? [])],
      })
    ).filter(
      (item) => !entryFilePaths.includes(item) && item !== indexFilePath && !item.endsWith(".d.ts"),
    );
  }
}
