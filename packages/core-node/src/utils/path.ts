import path from "path";
import { ArgumentError } from "@simplysm/core-common";

//#region Types

const NORM = Symbol("NormPath");

/**
 * 정규화된 경로를 나타내는 브랜드 타입.
 * pathNorm()을 통해서만 생성 가능.
 */
export type NormPath = string & {
  [NORM]: never;
};

//#endregion

//#region 함수

/**
 * POSIX 스타일 경로로 변환 (백슬래시 → 슬래시).
 *
 * @example
 * pathPosix("C:\\Users\\test"); // "C:/Users/test"
 * pathPosix("src", "index.ts"); // "src/index.ts"
 */
export function pathPosix(...args: string[]): string {
  const resolvedPath = path.join(...args);
  return resolvedPath.replace(/\\/g, "/");
}

/**
 * 파일 경로의 디렉토리를 변경.
 *
 * @example
 * pathChangeFileDirectory("/a/b/c.txt", "/a", "/x");
 * // → "/x/b/c.txt"
 *
 * @throws 파일이 fromDirectory 안에 없으면 에러
 */
export function pathChangeFileDirectory(
  filePath: string,
  fromDirectory: string,
  toDirectory: string,
): string {
  if (filePath === fromDirectory) {
    return toDirectory;
  }

  if (!pathIsChildPath(filePath, fromDirectory)) {
    throw new ArgumentError(`'${filePath}'가 ${fromDirectory} 안에 없습니다.`, {
      filePath,
      fromDirectory,
    });
  }

  return path.resolve(toDirectory, path.relative(fromDirectory, filePath));
}

/**
 * 확장자를 제거한 파일명(basename)을 반환.
 *
 * @example
 * pathBasenameWithoutExt("file.txt"); // "file"
 * pathBasenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"
 */
export function pathBasenameWithoutExt(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * childPath가 parentPath의 자식 경로인지 확인.
 * 같은 경로는 false 반환.
 *
 * 경로는 내부적으로 `pathNorm()`으로 정규화된 후 비교되며,
 * 플랫폼별 경로 구분자(Windows: `\`, Unix: `/`)를 사용한다.
 *
 * @example
 * pathIsChildPath("/a/b/c", "/a/b"); // true
 * pathIsChildPath("/a/b", "/a/b/c"); // false
 * pathIsChildPath("/a/b", "/a/b"); // false (같은 경로)
 */
export function pathIsChildPath(childPath: string, parentPath: string): boolean {
  const normalizedChild = pathNorm(childPath);
  const normalizedParent = pathNorm(parentPath);

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
 * pathNorm("/some/path"); // NormPath
 * pathNorm("relative", "path"); // NormPath (절대 경로로 변환)
 */
export function pathNorm(...paths: string[]): NormPath {
  return path.resolve(...paths) as NormPath;
}

/**
 * 타겟 경로 목록을 기준으로 파일을 필터링.
 * 파일이 타겟 경로와 같거나 타겟의 자식 경로일 때 포함.
 *
 * @param files - 필터링할 파일 경로 목록.
 *                **주의**: cwd 하위의 절대 경로여야 함.
 *                cwd 외부 경로는 상대 경로(../ 형태)로 변환되어 처리됨.
 * @param targets - 타겟 경로 목록 (cwd 기준 상대 경로, POSIX 스타일 권장)
 * @param cwd - 현재 작업 디렉토리 (절대 경로)
 * @returns targets가 빈 배열이면 files 그대로, 아니면 타겟 경로 하위 파일만
 *
 * @example
 * const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
 * pathFilterByTargets(files, ["src"], "/proj");
 * // → ["/proj/src/a.ts", "/proj/src/b.ts"]
 */
export function pathFilterByTargets(files: string[], targets: string[], cwd: string): string[] {
  if (targets.length === 0) return files;
  const normalizedTargets = targets.map((t) => pathPosix(t));
  return files.filter((file) => {
    const relativePath = pathPosix(path.relative(cwd, file));
    return normalizedTargets.some(
      (target) => relativePath === target || relativePath.startsWith(target + "/"),
    );
  });
}

//#endregion
