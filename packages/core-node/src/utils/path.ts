import path from "path";

//#region Types

const NORM = Symbol("NormPath");

/**
 * 정규화된 경로를 나타내는 브랜드 타입.
 * PathUtils.norm()을 통해서만 생성 가능.
 */
export type NormPath = string & {
  [NORM]: never;
};

//#endregion

//#region PathUtils

/**
 * 경로 유틸리티 클래스.
 * node:path를 기반으로 추가 기능 제공.
 */
export class PathUtils {
  /**
   * POSIX 스타일 경로로 변환 (백슬래시 → 슬래시).
   *
   * @example
   * PathUtils.posix("C:\\Users\\test"); // "C:/Users/test"
   * PathUtils.posix("src", "index.ts"); // "src/index.ts"
   */
  static posix(...args: string[]): string {
    const resolvedPath = path.join(...args);
    return resolvedPath.replace(/\\/g, "/");
  }

  /**
   * 파일 경로의 디렉토리를 변경.
   *
   * @example
   * PathUtils.changeFileDirectory("/a/b/c.txt", "/a", "/x");
   * // → "/x/b/c.txt"
   *
   * @throws 파일이 fromDirectory 안에 없으면 에러
   */
  static changeFileDirectory(filePath: string, fromDirectory: string, toDirectory: string): string {
    if (filePath === fromDirectory) {
      return toDirectory;
    }

    if (!PathUtils.isChildPath(filePath, fromDirectory)) {
      throw new Error(`'${filePath}'가 ${fromDirectory} 안에 없습니다.`);
    }

    return path.resolve(toDirectory, path.relative(fromDirectory, filePath));
  }

  /**
   * 파일명에서 확장자를 제거.
   *
   * @example
   * PathUtils.removeExt("file.txt"); // "file"
   * PathUtils.removeExt("/path/to/file.spec.ts"); // "file.spec"
   */
  static removeExt(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * childPath가 parentPath의 자식 경로인지 확인.
   * 같은 경로는 false 반환.
   *
   * @example
   * PathUtils.isChildPath("/a/b/c", "/a/b"); // true
   * PathUtils.isChildPath("/a/b", "/a/b/c"); // false
   * PathUtils.isChildPath("/a/b", "/a/b"); // false (같은 경로)
   */
  static isChildPath(childPath: string, parentPath: string): boolean {
    const normalizedChild = this.norm(childPath);
    const normalizedParent = this.norm(parentPath);

    // 같은 경로면 false
    if (normalizedChild === normalizedParent) {
      return false;
    }

    // 부모 경로 + 구분자로 시작하는지 확인
    const parentWithSep = normalizedParent.endsWith(path.sep)
      ? normalizedParent
      : normalizedParent + path.sep;

    return normalizedChild.startsWith(parentWithSep);
  }

  /**
   * 경로를 정규화하여 NormPath로 반환.
   * 절대 경로로 변환되며, 플랫폼별 구분자로 정규화됨.
   *
   * @example
   * PathUtils.norm("/some/path"); // NormPath
   * PathUtils.norm("relative", "path"); // NormPath (절대 경로로 변환)
   */
  static norm(...paths: string[]): NormPath {
    return path.resolve(...paths) as NormPath;
  }
}

//#endregion
