import path from "path";
import { ArgumentError } from "@simplysm/core-common";

//#region Types

const POSIX = Symbol("PosixPath");

/**
 * POSIX 스타일(슬래시) 경로를 나타내는 브랜드 타입.
 * posix() 또는 posixResolve()를 통해서만 생성할 수 있다.
 */
export type PosixPath = string & {
  [POSIX]: never;
};

//#endregion

//#region 함수

/**
 * POSIX 스타일 경로로 변환한다 (백슬래시 → 슬래시).
 * 경로 결합이나 resolve는 수행하지 않는다.
 *
 * @example
 * posix("C:\\Users\\test"); // "C:/Users/test"
 */
export function posix(p: string): PosixPath {
  return p.replace(/\\/g, "/") as PosixPath;
}

/**
 * 절대 경로로 resolve한 뒤 POSIX 스타일로 변환한다.
 *
 * @example
 * posixResolve("/base", "sub", "file.txt"); // "/base/sub/file.txt"
 * posixResolve("relative/path"); // "D:/cwd/relative/path"
 */
export function posixResolve(...args: string[]): PosixPath {
  return path.resolve(...args).replace(/\\/g, "/") as PosixPath;
}

/**
 * 파일 경로의 디렉토리를 변경한다.
 *
 * @example
 * changeFileDirectory("/a/b/c.txt", "/a", "/x");
 * // → "/x/b/c.txt"
 *
 * @throws 파일이 fromDirectory 내부에 없는 경우 에러 발생
 */
export function changeFileDirectory(
  filePath: string,
  fromDirectory: string,
  toDirectory: string,
): string {
  if (filePath === fromDirectory) {
    return toDirectory;
  }

  if (!isChildPath(filePath, fromDirectory)) {
    throw new ArgumentError(`'${filePath}'은(는) ${fromDirectory} 내부에 없습니다.`, {
      filePath,
      fromDirectory,
    });
  }

  return path.resolve(toDirectory, path.relative(fromDirectory, filePath));
}

/**
 * 확장자를 제외한 파일명(basename)을 반환한다.
 *
 * @example
 * basenameWithoutExt("file.txt"); // "file"
 * basenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"
 */
export function basenameWithoutExt(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * childPath가 parentPath의 하위 경로인지 확인한다.
 * 동일한 경로이면 false를 반환한다.
 *
 * 경로는 내부적으로 `posixResolve()`를 사용하여 정규화되며,
 * POSIX 슬래시(`/`)를 구분자로 사용하여 비교한다.
 *
 * @example
 * isChildPath("/a/b/c", "/a/b"); // true
 * isChildPath("/a/b", "/a/b/c"); // false
 * isChildPath("/a/b", "/a/b"); // false (동일 경로)
 */
export function isChildPath(childPath: string, parentPath: string): boolean {
  const normalizedChild = posixResolve(childPath);
  const normalizedParent = posixResolve(parentPath);

  if (normalizedChild === normalizedParent) {
    return false;
  }

  const parentWithSep = normalizedParent.endsWith("/")
    ? normalizedParent
    : normalizedParent + "/";

  return normalizedChild.startsWith(parentWithSep);
}

/**
 * 대상 경로 목록을 기반으로 파일을 필터링한다.
 * 대상 경로와 일치하거나 하위에 있는 파일을 포함한다.
 *
 * @param files - 필터링할 파일 경로.
 *                **주의**: cwd 하위의 절대 경로여야 한다.
 *                cwd 외부의 경로는 상대 경로(../)로 변환되어 처리된다.
 * @param targets - 대상 경로 (cwd 기준 상대 경로, POSIX 스타일 권장)
 * @param cwd - 현재 작업 디렉토리 (절대 경로)
 * @returns targets가 비어있으면 files를 그대로 반환; 그렇지 않으면 대상 경로 하위의 파일만 반환
 *
 * @example
 * const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
 * filterByTargets(files, ["src"], "/proj");
 * // → ["/proj/src/a.ts", "/proj/src/b.ts"]
 */
export function filterByTargets(files: string[], targets: string[], cwd: string): string[] {
  if (targets.length === 0) return files;
  const normalizedTargets = targets.map((t) => posix(t));
  return files.filter((file) => {
    const relativePath = posix(path.relative(cwd, file));
    return normalizedTargets.some(
      (target) => relativePath === target || relativePath.startsWith(target + "/"),
    );
  });
}

//#endregion
