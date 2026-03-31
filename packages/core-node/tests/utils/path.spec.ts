import { describe, expect, it } from "vitest";
import path from "path";
import {
  posix,
  posixResolve,
  isChildPath,
  changeFileDirectory,
  basenameWithoutExt,
  filterByTargets,
} from "../../src/utils/path";

describe("path functions", () => {
  //#region posix

  describe("posix", () => {
    it("converts backslashes to forward slashes", () => {
      const result = posix("C:\\Users\\test\\file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });

    it("leaves forward slashes unchanged", () => {
      expect(posix("a/b/c")).toBe("a/b/c");
    });

    it("handles mixed separators", () => {
      expect(posix("a\\b/c\\d")).toBe("a/b/c/d");
    });

    it("handles empty string", () => {
      expect(posix("")).toBe("");
    });
  });

  //#endregion

  //#region posixResolve

  describe("posixResolve", () => {
    it("resolves relative path to absolute POSIX path", () => {
      const result = posixResolve("./test/../file.txt");
      expect(result).toBe(path.resolve("./test/../file.txt").replace(/\\/g, "/"));
    });

    it("combines multiple path arguments and resolves", () => {
      const basePath = path.resolve("/base");
      const result = posixResolve(basePath, "sub", "file.txt");
      expect(result).toBe(
        path.resolve(basePath, "sub", "file.txt").replace(/\\/g, "/"),
      );
    });

    it("resolves .. segments", () => {
      const result = posixResolve("/a/b", "..", "c");
      expect(result).toBe(path.resolve("/a/b", "..", "c").replace(/\\/g, "/"));
    });
  });

  //#endregion

  //#region isChildPath

  describe("isChildPath", () => {
    it("returns true for child path", () => {
      const parent = posixResolve("/parent/dir");
      const child = posixResolve("/parent/dir/child/file.txt");
      expect(isChildPath(child, parent)).toBe(true);
    });

    it("returns false for same path", () => {
      const parent = posixResolve("/parent/dir");
      const child = posixResolve("/parent/dir");
      expect(isChildPath(child, parent)).toBe(false);
    });

    it("returns false for non-child path", () => {
      const parent = posixResolve("/parent/dir");
      const child = posixResolve("/other/dir/file.txt");
      expect(isChildPath(child, parent)).toBe(false);
    });

    it("returns false when only part of parent path matches", () => {
      const parent = posixResolve("/parent/dir");
      const child = posixResolve("/parent/directory/file.txt");
      expect(isChildPath(child, parent)).toBe(false);
    });
  });

  //#endregion

  //#region changeFileDirectory

  describe("changeFileDirectory", () => {
    it("changes file directory", () => {
      const file = path.resolve("/source/sub/file.txt");
      const from = path.resolve("/source");
      const to = path.resolve("/target");

      const result = changeFileDirectory(file, from, to);
      expect(result).toBe(path.resolve("/target/sub/file.txt"));
    });

    it("changes directory in nested path", () => {
      const file = path.resolve("/a/b/c/d/file.txt");
      const from = path.resolve("/a/b");
      const to = path.resolve("/x/y");

      const result = changeFileDirectory(file, from, to);
      expect(result).toBe(path.resolve("/x/y/c/d/file.txt"));
    });

    it("throws error when file is not inside fromDirectory", () => {
      const file = path.resolve("/other/path/file.txt");
      const from = path.resolve("/source");
      const to = path.resolve("/target");

      expect(() => changeFileDirectory(file, from, to)).toThrow();
    });

    it("returns toDirectory when filePath and fromDirectory are the same", () => {
      const file = path.resolve("/source");
      const from = path.resolve("/source");
      const to = path.resolve("/target");

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
