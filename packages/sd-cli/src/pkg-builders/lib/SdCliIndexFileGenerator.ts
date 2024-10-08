import { FsUtil, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";

export class SdCliIndexFileGenerator {
  static watch(pkgPath: string, polyfills?: string[]) {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");
    let cache = FsUtil.exists(indexFilePath) ? FsUtil.readFile(indexFilePath) : undefined;

    SdFsWatcher.watch([path.resolve(pkgPath, "src")]).onChange({ delay: 50 }, () => {
      cache = this.run(pkgPath, polyfills, cache);
    });

    cache = this.run(pkgPath, polyfills, cache);
  }

  static run(pkgPath: string, polyfills?: string[], cache?: string): string {
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
      const requirePath = PathUtil.posix(path.relative(path.dirname(indexFilePath), filePath))
        .replace(/\.tsx?$/, "")
        .replace(/\/index$/, "");

      const sourceTsFileContent = FsUtil.readFile(filePath);
      if (sourceTsFileContent.split("\n").some((line) => line.startsWith("export "))) {
        importTexts.push(`export * from "./${requirePath}";`);
      } else {
        importTexts.push(`import "./${requirePath}";`);
      }
    }

    const content = importTexts.join("\n") + "\n";
    if (content.trim() !== cache?.trim()) {
      FsUtil.writeFile(indexFilePath, content);
    }
    return content;
  }

  static #getFilePaths(pkgPath: string): string[] {
    const indexFilePath = path.resolve(pkgPath, "src/index.ts");

    const tsconfig = FsUtil.readJson(path.resolve(pkgPath, "tsconfig.json"));
    const entryFilePaths: string[] = tsconfig.files?.map((item) => path.resolve(pkgPath, item)) ?? [];

    return FsUtil.glob(path.resolve(pkgPath, "src/**/*{.ts,.tsx}"), { nodir: true }).filter(
      (item) => !entryFilePaths.includes(item) && item !== indexFilePath && !item.endsWith(".d.ts"),
    );
  }
}
