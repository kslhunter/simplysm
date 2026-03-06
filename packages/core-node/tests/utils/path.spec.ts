import { describe, expect, it } from "vitest";
import path from "path";
import {
  posix,
  norm,
  isChildPath,
  changeFileDirectory,
  basenameWithoutExt,
  filterByTargets,
  type NormPath,
} from "../../src/utils/path";

describe("path functions", () => {
  //#region posix

  describe("posix", () => {
    it("converts single path argument to POSIX style", () => {
      const result = posix("C:\\Users\\test\\file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });

    it("combines multiple path arguments and converts to POSIX style", () => {
      const result = posix("C:\\Users", "test", "file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });

  });

  //#endregion

  //#region norm

  describe("norm", () => {
    it("normalizes path and returns NormPath type", () => {
      const result: NormPath = norm("./test/../file.txt");
      expect(result).toBe(path.resolve("./test/../file.txt"));
    });

    it("combines multiple path arguments and normalizes", () => {
      const basePath = path.resolve("/base");
      const result = norm(basePath, "sub", "file.txt");
      expect(result).toBe(path.resolve(basePath, "sub", "file.txt"));
    });

  });

  //#endregion

  //#region isChildPath

  describe("isChildPath", () => {
    it("returns true for child path", () => {
      const parent = norm("/parent/dir");
      const child = norm("/parent/dir/child/file.txt");
      expect(isChildPath(child, parent)).toBe(true);
    });

    it("returns false for same path", () => {
      const parent = norm("/parent/dir");
      const child = norm("/parent/dir");
      expect(isChildPath(child, parent)).toBe(false);
    });

    it("returns false for non-child path", () => {
      const parent = norm("/parent/dir");
      const child = norm("/other/dir/file.txt");
      expect(isChildPath(child, parent)).toBe(false);
    });

    it("returns false when only part of parent path matches", () => {
      const parent = norm("/parent/dir");
      const child = norm("/parent/directory/file.txt");
      expect(isChildPath(child, parent)).toBe(false);
    });
  });

  //#endregion

  //#region changeFileDirectory

  describe("changeFileDirectory", () => {
    it("changes file directory", () => {
      const file = norm("/source/sub/file.txt");
      const from = norm("/source");
      const to = norm("/target");

      const result = changeFileDirectory(file, from, to);
      expect(result).toBe(norm("/target/sub/file.txt"));
    });

    it("changes directory in nested path", () => {
      const file = norm("/a/b/c/d/file.txt");
      const from = norm("/a/b");
      const to = norm("/x/y");

      const result = changeFileDirectory(file, from, to);
      expect(result).toBe(norm("/x/y/c/d/file.txt"));
    });

    it("throws error when file is not inside fromDirectory", () => {
      const file = norm("/other/path/file.txt");
      const from = norm("/source");
      const to = norm("/target");

      expect(() => changeFileDirectory(file, from, to)).toThrow();
    });

    it("returns toDirectory when filePath and fromDirectory are the same", () => {
      const file = norm("/source");
      const from = norm("/source");
      const to = norm("/target");

      const result = changeFileDirectory(file, from, to);
      expect(result).toBe(to);
    });
  });

  //#endregion

  //#region basenameWithoutExt

  describe("basenameWithoutExt", () => {
    it("removes single extension (returns basename only)", () => {
      const result = basenameWithoutExt("/path/to/file.txt");
      expect(result).toBe("file");
    });

    it("removes only last extension in multiple extensions", () => {
      const result = basenameWithoutExt("/path/to/file.spec.ts");
      expect(result).toBe("file.spec");
    });

    it("returns basename for file without extension", () => {
      const result = basenameWithoutExt("/path/to/file");
      expect(result).toBe("file");
    });

    it("returns hidden file (starting with dot) as is", () => {
      const result = basenameWithoutExt("/path/to/.gitignore");
      expect(result).toBe(".gitignore");
    });
  });

  //#endregion

  //#region filterByTargets

  describe("filterByTargets", () => {
    const cwd = "/proj";
    const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts", "/proj/lib/d.ts"];

    it("returns all files if targets array is empty", () => {
      const result = filterByTargets(files, [], cwd);
      expect(result).toEqual(files);
    });

    it("filters by single target", () => {
      const result = filterByTargets(files, ["src"], cwd);
      expect(result).toEqual(["/proj/src/a.ts", "/proj/src/b.ts"]);
    });

    it("filters by multiple targets", () => {
      const result = filterByTargets(files, ["src", "tests"], cwd);
      expect(result).toEqual(["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"]);
    });

    it("returns empty array when no matching file is found", () => {
      const result = filterByTargets(files, ["nonexistent"], cwd);
      expect(result).toEqual([]);
    });

    it("filters by exact file path", () => {
      const result = filterByTargets(files, ["src/a.ts"], cwd);
      expect(result).toEqual(["/proj/src/a.ts"]);
    });
  });

  //#endregion
});
