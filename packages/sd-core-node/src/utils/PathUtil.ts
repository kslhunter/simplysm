import path from "path";

export class PathUtil {
  public static posix(...args: string[]): string {
    const resolvedPath = path.join(...args);
    return resolvedPath.replace(/\\/g, "/");
  }

  public static changeFileDirectory(filePath: string, fromDirectory: string, toDirectory: string): string {
    if (filePath === fromDirectory) {
      return toDirectory;
    }

    if (!PathUtil.isChildPath(filePath, fromDirectory)) {
      throw new Error(`'${filePath}'가 ${fromDirectory}안에 없습니다.`);
    }

    return path.resolve(toDirectory, path.relative(fromDirectory, filePath));
  }

  public static removeExt(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  public static isChildPath(childPath: string, parentPath: string): boolean {
    const relativePath = path.relative(parentPath, childPath);
    return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
  }
}
