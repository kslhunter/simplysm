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

describe("path functions", () => {
  //#region posix

  describe("pathPosix", () => {
    it("converts single path argument to POSIX style", () => {
      const result = pathPosix("C:\\Users\\test\\file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });

    it("combines multiple path arguments and converts to POSIX style", () => {
      const result = pathPosix("C:\\Users", "test", "file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });

    it("keeps already POSIX-style path as is", () => {
      const result = pathPosix("/usr/local/bin");
      expect(result).toBe("/usr/local/bin");
    });

    it("handles mixed path separators", () => {
      const result = pathPosix("C:/Users\\test/file.txt");
      expect(result).toBe("C:/Users/test/file.txt");
    });
  });

  //#endregion

  //#region norm

  describe("pathNorm", () => {
    it("normalizes path and returns NormPath type", () => {
      const result: NormPath = pathNorm("./test/../file.txt");
      expect(result).toBe(path.resolve("./test/../file.txt"));
    });

    it("combines multiple path arguments and normalizes", () => {
      const basePath = path.resolve("/base");
      const result = pathNorm(basePath, "sub", "file.txt");
      expect(result).toBe(path.resolve(basePath, "sub", "file.txt"));
    });

    it("converts relative path to absolute path", () => {
      const result = pathNorm("relative/path");
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  //#endregion

  //#region isChildPath

  describe("pathIsChildPath", () => {
    it("returns true for child path", () => {
      const parent = pathNorm("/parent/dir");
      const child = pathNorm("/parent/dir/child/file.txt");
      expect(pathIsChildPath(child, parent)).toBe(true);
    });

    it("returns false for same path", () => {
      const parent = pathNorm("/parent/dir");
      const child = pathNorm("/parent/dir");
      expect(pathIsChildPath(child, parent)).toBe(false);
    });

    it("returns false for non-child path", () => {
      const parent = pathNorm("/parent/dir");
      const child = pathNorm("/other/dir/file.txt");
      expect(pathIsChildPath(child, parent)).toBe(false);
    });

    it("returns false when only part of parent path matches", () => {
      const parent = pathNorm("/parent/dir");
      const child = pathNorm("/parent/directory/file.txt");
      expect(pathIsChildPath(child, parent)).toBe(false);
    });
  });

  //#endregion

  //#region changeFileDirectory

  describe("pathChangeFileDirectory", () => {
    it("changes file directory", () => {
      const file = pathNorm("/source/sub/file.txt");
      const from = pathNorm("/source");
      const to = pathNorm("/target");

      const result = pathChangeFileDirectory(file, from, to);
      expect(result).toBe(pathNorm("/target/sub/file.txt"));
    });

    it("changes directory in nested path", () => {
      const file = pathNorm("/a/b/c/d/file.txt");
      const from = pathNorm("/a/b");
      const to = pathNorm("/x/y");

      const result = pathChangeFileDirectory(file, from, to);
      expect(result).toBe(pathNorm("/x/y/c/d/file.txt"));
    });

    it("throws error when file is not inside fromDirectory", () => {
      const file = pathNorm("/other/path/file.txt");
      const from = pathNorm("/source");
      const to = pathNorm("/target");

      expect(() => pathChangeFileDirectory(file, from, to)).toThrow();
    });

    it("returns toDirectory when filePath and fromDirectory are the same", () => {
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
    it("removes single extension (returns basename only)", () => {
      const result = pathBasenameWithoutExt("/path/to/file.txt");
      expect(result).toBe("file");
    });

    it("removes only last extension in multiple extensions", () => {
      const result = pathBasenameWithoutExt("/path/to/file.spec.ts");
      expect(result).toBe("file.spec");
    });

    it("returns basename for file without extension", () => {
      const result = pathBasenameWithoutExt("/path/to/file");
      expect(result).toBe("file");
    });

    it("returns hidden file (starting with dot) as is", () => {
      const result = pathBasenameWithoutExt("/path/to/.gitignore");
      expect(result).toBe(".gitignore");
    });
  });

  //#endregion

  //#region filterByTargets

  describe("pathFilterByTargets", () => {
    const cwd = "/proj";
    const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts", "/proj/lib/d.ts"];

    it("returns all files if targets array is empty", () => {
      const result = pathFilterByTargets(files, [], cwd);
      expect(result).toEqual(files);
    });

    it("filters by single target", () => {
      const result = pathFilterByTargets(files, ["src"], cwd);
      expect(result).toEqual(["/proj/src/a.ts", "/proj/src/b.ts"]);
    });

    it("filters by multiple targets", () => {
      const result = pathFilterByTargets(files, ["src", "tests"], cwd);
      expect(result).toEqual(["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"]);
    });

    it("returns empty array when no matching file is found", () => {
      const result = pathFilterByTargets(files, ["nonexistent"], cwd);
      expect(result).toEqual([]);
    });

    it("filters by exact file path", () => {
      const result = pathFilterByTargets(files, ["src/a.ts"], cwd);
      expect(result).toEqual(["/proj/src/a.ts"]);
    });
  });

  //#endregion
});
