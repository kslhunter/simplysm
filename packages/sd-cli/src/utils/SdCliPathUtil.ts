import * as path from "path";

export class SdCliPathUtil {
  public static getTsConfigBaseFilePath(rootPath: string): string {
    return path.resolve(rootPath, "tsconfig.json");
  }

  public static getTsConfigBuildFilePath(rootPath: string, target: "node" | "browser" | undefined): string {
    return target !== undefined
      ? path.resolve(rootPath, `tsconfig-${target}.build.json`)
      : SdCliPathUtil.getTsConfigBaseFilePath(rootPath);
  }

  public static getSourcePath(rootPath: string): string {
    return path.resolve(rootPath, "src");
  }

  public static getDistTypesPath(rootPath: string): string {
    return path.resolve(rootPath, "dist-types");
  }

  public static getDistPath(rootPath: string, target?: "node" | "browser"): string {
    return path.resolve(rootPath, `dist${target === undefined ? "" : `-${target}`}`);
  }

  public static getMetadataFilePath(rootPath: string, filePath: string): string | undefined {
    // const typesPath = SdCliPathUtil.getDistTypesPath(rootPath);
    const typesPath = path.resolve(rootPath, "dist");
    const srcPath = SdCliPathUtil.getSourcePath(rootPath);

    const isMySource = filePath.endsWith(".ts") && !filePath.endsWith(".d.ts");
    const isLibSource = filePath.endsWith(".d.ts");

    let metadataFilePath: string;
    if (isMySource) {
      const relativeFilePath = path.relative(srcPath, filePath);
      metadataFilePath = path.resolve(typesPath, relativeFilePath).replace(/\.ts$/, ".metadata.json");
    }
    else if (isLibSource) {
      metadataFilePath = filePath.replace(/\.d\.ts$/, ".metadata.json");
    }
    else {
      return undefined;
    }

    return metadataFilePath;
  }

  public static getNpmConfigFilePath(rootPath: string): string {
    return path.resolve(rootPath, "package.json");
  }

  public static getIndexFilePath(rootPath: string): string {
    return path.resolve(SdCliPathUtil.getSourcePath(rootPath), "index.ts");
  }
}