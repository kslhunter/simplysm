import { describe, expect, it } from "vitest";
import path from "path";
import { PathUtils, type NormPath } from "../../src/utils/path";

describe("PathUtils", () => {
  //#region posix

  describe("posix", () => {
    it("단일 경로 인자를 POSIX 스타일로 변환", () => {
      const result = PathUtils.posix("C:\\Users\\test\\file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });

    it("여러 경로 인자를 조합하여 POSIX 스타일로 변환", () => {
      const result = PathUtils.posix("C:\\Users", "test", "file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });

    it("이미 POSIX 스타일인 경로는 그대로 유지", () => {
      const result = PathUtils.posix("/usr/local/bin");
      expect(result).toBe("/usr/local/bin");
    });

    it("혼합된 경로 구분자 처리", () => {
      const result = PathUtils.posix("C:/Users\\test/file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });
  });

  //#endregion

  //#region norm

  describe("norm", () => {
    it("경로를 정규화하고 NormPath 타입으로 반환", () => {
      const result: NormPath = PathUtils.norm("./test/../file.txt");
      expect(result).toBe(path.resolve("./test/../file.txt"));
    });

    it("여러 경로 인자를 조합하여 정규화", () => {
      const basePath = path.resolve("/base");
      const result = PathUtils.norm(basePath, "sub", "file.txt");
      expect(result).toBe(path.resolve(basePath, "sub", "file.txt"));
    });

    it("상대 경로를 절대 경로로 변환", () => {
      const result = PathUtils.norm("relative/path");
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  //#endregion

  //#region isChildPath

  describe("isChildPath", () => {
    it("자식 경로인 경우 true 반환", () => {
      const parent = PathUtils.norm("/parent/dir");
      const child = PathUtils.norm("/parent/dir/child/file.txt");
      expect(PathUtils.isChildPath(child, parent)).toBe(true);
    });

    it("같은 경로인 경우 false 반환", () => {
      const parent = PathUtils.norm("/parent/dir");
      const child = PathUtils.norm("/parent/dir");
      expect(PathUtils.isChildPath(child, parent)).toBe(false);
    });

    it("자식 경로가 아닌 경우 false 반환", () => {
      const parent = PathUtils.norm("/parent/dir");
      const child = PathUtils.norm("/other/dir/file.txt");
      expect(PathUtils.isChildPath(child, parent)).toBe(false);
    });

    it("부모 경로의 일부 문자열만 일치하는 경우 false 반환", () => {
      const parent = PathUtils.norm("/parent/dir");
      const child = PathUtils.norm("/parent/directory/file.txt");
      expect(PathUtils.isChildPath(child, parent)).toBe(false);
    });
  });

  //#endregion

  //#region changeFileDirectory

  describe("changeFileDirectory", () => {
    it("파일의 디렉토리를 변경", () => {
      const file = PathUtils.norm("/source/sub/file.txt");
      const from = PathUtils.norm("/source");
      const to = PathUtils.norm("/target");

      const result = PathUtils.changeFileDirectory(file, from, to);
      expect(result).toBe(PathUtils.norm("/target/sub/file.txt"));
    });

    it("중첩된 경로에서 디렉토리 변경", () => {
      const file = PathUtils.norm("/a/b/c/d/file.txt");
      const from = PathUtils.norm("/a/b");
      const to = PathUtils.norm("/x/y");

      const result = PathUtils.changeFileDirectory(file, from, to);
      expect(result).toBe(PathUtils.norm("/x/y/c/d/file.txt"));
    });

    it("파일이 fromDirectory 안에 없으면 에러 발생", () => {
      const file = PathUtils.norm("/other/path/file.txt");
      const from = PathUtils.norm("/source");
      const to = PathUtils.norm("/target");

      expect(() => PathUtils.changeFileDirectory(file, from, to)).toThrow();
    });
  });

  //#endregion

  //#region removeExt

  describe("removeExt", () => {
    it("단일 확장자 제거 (basename만 반환)", () => {
      const result = PathUtils.removeExt("/path/to/file.txt");
      expect(result).toBe("file");
    });

    it("다중 확장자에서 마지막 확장자만 제거", () => {
      const result = PathUtils.removeExt("/path/to/file.spec.ts");
      expect(result).toBe("file.spec");
    });

    it("확장자가 없는 파일은 basename 반환", () => {
      const result = PathUtils.removeExt("/path/to/file");
      expect(result).toBe("file");
    });

    it("숨김 파일(점으로 시작)은 그대로 반환", () => {
      const result = PathUtils.removeExt("/path/to/.gitignore");
      expect(result).toBe(".gitignore");
    });
  });

  //#endregion
});
