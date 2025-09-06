import { FsUtils, HashUtils, PathUtils, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";

export class SdCliIndexFileGenerator {
  cachedHash?: string;

  watch(pkgPath: string, polyfills?: string[]) {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");
    this.cachedHash = FsUtils.exists(indexFilePath)
      ? HashUtils.get(FsUtils.readFile(indexFilePath))
      : undefined;

    SdFsWatcher.watch([path.resolve(pkgPath, "src")], {
      ignored: [indexFilePath],
    }).onChange({ delay: 50 }, (changeInfos) => {
      if (changeInfos.some((item) => ["add", "addDir", "unlink", "unlinkDir"].includes(item.event)))
        this.run(pkgPath, polyfills);
    });

    this.run(pkgPath, polyfills);
  }

  run(
    pkgPath: string,
    polyfills?: string[],
  ): { changed: boolean; filePath: string; content: string } {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");

    const importTexts: string[] = [];

    // polyfills 를 모두 import
    if (polyfills) {
      for (const polyfill of polyfills.orderBy()) {
        importTexts.push(`import "${polyfill}";`);
      }
    }

    // 내부 파일들 import
    const filePaths = this.#getFilePaths(pkgPath);
    for (const filePath of filePaths.orderBy()) {
      const requirePath = PathUtils.posix(path.relative(path.dirname(indexFilePath), filePath))
        .replace(/\.tsx?$/, "")
        .replace(/\/index$/, "");

      const sourceTsFileContent = FsUtils.readFile(filePath);
      if (sourceTsFileContent.split("\n").some((line) => line.startsWith("export "))) {
        importTexts.push(`export * from "./${requirePath}";`);
      } else {
        importTexts.push(`import "./${requirePath}";`);
      }
    }

    const content = importTexts.join("\n") + "\n";
    const currHash = HashUtils.get(content);
    if (currHash !== this.cachedHash) {
      FsUtils.writeFile(indexFilePath, content);
      this.cachedHash = currHash;
      return { changed: true, filePath: indexFilePath, content };
    } else {
      return { changed: false, filePath: indexFilePath, content };
    }
  }

  #getFilePaths(pkgPath: string): string[] {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");

    const tsconfig = FsUtils.readJson(path.resolve(pkgPath, "tsconfig.json"));
    const entryFilePaths: string[] =
      tsconfig.files?.map((item) => path.resolve(pkgPath, item)) ?? [];

    return FsUtils.glob(path.resolve(pkgPath, "src/**/*{.ts,.tsx}"), {
      nodir: true,
      ignore: tsconfig.excludes,
    }).filter(
      (item) => !entryFilePaths.includes(item) && item !== indexFilePath && !item.endsWith(".d.ts"),
    );
  }
}
