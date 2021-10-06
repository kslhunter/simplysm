import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import { StringUtil } from "@simplysm/sd-core-common";

export class SdCliUtils {
  public static findNpmConfigFilePathForSourceFile(filePath: string, rootPath?: string): string | undefined {
    let current = path.dirname(filePath);
    while (current) {
      const potential = path.resolve(current, "package.json");
      if (FsUtil.exists(potential) && !FsUtil.isDirectory(potential)) {
        return potential;
      }

      if (!StringUtil.isNullOrEmpty(rootPath) && current === rootPath) break;

      const next = path.dirname(current);
      if (next === current) break;
      current = next;
    }

    return undefined;
  }

  public static findModulePath(moduleName: string, currentPath: string, rootPath: string): string | undefined {
    const nodeModulesPaths = this.findAllNodeModulesPaths(currentPath, rootPath);

    for (const nodeModulePath of nodeModulesPaths) {
      const potential = path.join(nodeModulePath, moduleName);
      if (FsUtil.exists(potential)) {
        return potential;
      }
    }

    return undefined;
  }

  public static findAllNodeModulesPaths(fromPath: string, rootPath: string): string[] {
    const nodeModules: string[] = [];

    let current = fromPath;
    while (current) {
      const potential = path.join(current, "node_modules");
      if (FsUtil.exists(potential) && FsUtil.isDirectory(potential)) {
        nodeModules.push(potential);
      }

      if (current === rootPath) break;

      const next = path.dirname(current);
      if (next === current) break;
      current = next;
    }

    return nodeModules;
  }
}
