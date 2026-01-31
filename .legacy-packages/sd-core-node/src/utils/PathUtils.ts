import path from "path";

export class PathUtils {
  static posix(...args: string[]): string {
    const resolvedPath = path.join(...args);
    return resolvedPath.replace(/\\/g, "/");
  }

  static changeFileDirectory(filePath: string, fromDirectory: string, toDirectory: string): string {
    if (filePath === fromDirectory) {
      return toDirectory;
    }

    if (!PathUtils.isChildPath(filePath, fromDirectory)) {
      throw new Error(`'${filePath}'가 ${fromDirectory}안에 없습니다.`);
    }

    return path.resolve(toDirectory, path.relative(fromDirectory, filePath));
  }

  static removeExt(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  static isChildPath(childPath: string, parentPath: string): boolean {
    return this.norm(childPath).startsWith(this.norm(parentPath));
    // const relativePath = path.relative(parentPath, childPath);
    // return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
  }

  static norm(...paths: string[]): TNormPath {
    const first = paths[0].startsWith("/") ? paths[0].slice(1) : paths[0];
    return path.resolve(first, ...paths.slice(1)) as TNormPath;
  }
}

const NORM = Symbol();
export type TNormPath = string & {
  [NORM]: never;
};
