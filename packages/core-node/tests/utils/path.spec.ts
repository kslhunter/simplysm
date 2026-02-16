import { describe, expect, it } from "vitest";
import path from "path";
import {
  pathPosix,
  pathNorm,
  pathIsChildPath,
  pathChangeFileDirectory,
  pathBasenameWithoutExt,
  pathFilterByTargets,
  type NormPath,
} from "../../src/utils/path";

describe("path 함수들", () => {
  //#region posix

  describe("pathPosix", () => {
    it("단일 경로 인자를 POSIX 스타일로 변환", () => {
      const result = pathPosix("C:\\Users\\test\\file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });

    it("여러 경로 인자를 조합하여 POSIX 스타일로 변환", () => {
      const result = pathPosix("C:\\Users", "test", "file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });

    it("이미 POSIX 스타일인 경로는 그대로 유지", () => {
      const result = pathPosix("/usr/local/bin");
      expect(result).toBe("/usr/local/bin");
    });

    it("혼합된 경로 구분자 처리", () => {
      const result = pathPosix("C:/Users\\test/file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });
  });

  //#endregion

  //#region norm

  describe("pathNorm", () => {
    it("경로를 정규화하고 NormPath 타입으로 반환", () => {
      const result: NormPath = pathNorm("./test/../file.txt");
      expect(result).toBe(path.resolve("./test/../file.txt"));
    });

    it("여러 경로 인자를 조합하여 정규화", () => {
      const basePath = path.resolve("/base");
      const result = pathNorm(basePath, "sub", "file.txt");
      expect(result).toBe(path.resolve(basePath, "sub", "file.txt"));
    });

    it("상대 경로를 절대 경로로 변환", () => {
      const result = pathNorm("relative/path");
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  //#endregion

  //#region isChildPath

  describe("pathIsChildPath", () => {
    it("자식 경로인 경우 true 반환", () => {
      const parent = pathNorm("/parent/dir");
      const child = pathNorm("/parent/dir/child/file.txt");
      expect(pathIsChildPath(child, parent)).toBe(true);
    });

    it("같은 경로인 경우 false 반환", () => {
      const parent = pathNorm("/parent/dir");
      const child = pathNorm("/parent/dir");
      expect(pathIsChildPath(child, parent)).toBe(false);
    });

    it("자식 경로가 아닌 경우 false 반환", () => {
      const parent = pathNorm("/parent/dir");
      const child = pathNorm("/other/dir/file.txt");
      expect(pathIsChildPath(child, parent)).toBe(false);
    });

    it("부모 경로의 일부 문자열만 일치하는 경우 false 반환", () => {
      const parent = pathNorm("/parent/dir");
      const child = pathNorm("/parent/directory/file.txt");
      expect(pathIsChildPath(child, parent)).toBe(false);
    });
  });

  //#endregion

  //#region changeFileDirectory

  describe("pathChangeFileDirectory", () => {
    it("파일의 디렉토리를 변경", () => {
      const file = pathNorm("/source/sub/file.txt");
      const from = pathNorm("/source");
      const to = pathNorm("/target");

      const result = pathChangeFileDirectory(file, from, to);
      expect(result).toBe(pathNorm("/target/sub/file.txt"));
    });

    it("중첩된 경로에서 디렉토리 변경", () => {
      const file = pathNorm("/a/b/c/d/file.txt");
      const from = pathNorm("/a/b");
      const to = pathNorm("/x/y");

      const result = pathChangeFileDirectory(file, from, to);
      expect(result).toBe(pathNorm("/x/y/c/d/file.txt"));
    });

    it("파일이 fromDirectory 안에 없으면 에러 발생", () => {
      const file = pathNorm("/other/path/file.txt");
      const from = pathNorm("/source");
      const to = pathNorm("/target");

      expect(() => pathChangeFileDirectory(file, from, to)).toThrow();
    });

    it("filePath와 fromDirectory가 동일한 경우 toDirectory 반환", () => {
      const file = pathNorm("/source");
      const from = pathNorm("/source");
      const to = pathNorm("/target");

      const result = pathChangeFileDirectory(file, from, to);
      expect(result).toBe(to);
    });
  });

  //#endregion

  //#region basenameWithoutExt

  describe("pathBasenameWithoutExt", () => {
    it("단일 확장자 제거 (basename만 반환)", () => {
      const result = pathBasenameWithoutExt("/path/to/file.txt");
      expect(result).toBe("file");
    });

    it("다중 확장자에서 마지막 확장자만 제거", () => {
      const result = pathBasenameWithoutExt("/path/to/file.spec.ts");
      expect(result).toBe("file.spec");
    });

    it("확장자가 없는 파일은 basename 반환", () => {
      const result = pathBasenameWithoutExt("/path/to/file");
      expect(result).toBe("file");
    });

    it("숨김 파일(점으로 시작)은 그대로 반환", () => {
      const result = pathBasenameWithoutExt("/path/to/.gitignore");
      expect(result).toBe(".gitignore");
    });
  });

  //#endregion

  //#region filterByTargets

  describe("pathFilterByTargets", () => {
    const cwd = "/proj";
    const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts", "/proj/lib/d.ts"];

    it("빈 타겟 배열이면 모든 파일 반환", () => {
      const result = pathFilterByTargets(files, [], cwd);
      expect(result).toEqual(files);
    });

    it("단일 타겟으로 필터링", () => {
      const result = pathFilterByTargets(files, ["src"], cwd);
      expect(result).toEqual(["/proj/src/a.ts", "/proj/src/b.ts"]);
    });

    it("다중 타겟으로 필터링", () => {
      const result = pathFilterByTargets(files, ["src", "tests"], cwd);
      expect(result).toEqual(["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"]);
    });

    it("매칭되는 파일이 없으면 빈 배열 반환", () => {
      const result = pathFilterByTargets(files, ["nonexistent"], cwd);
      expect(result).toEqual([]);
    });

    it("정확한 파일 경로로 필터링", () => {
      const result = pathFilterByTargets(files, ["src/a.ts"], cwd);
      expect(result).toEqual(["/proj/src/a.ts"]);
    });
  });

  //#endregion
});
