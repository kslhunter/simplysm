import { describe, it, expect } from "vitest";
import { pathJoin, pathBasename, pathExtname } from "@simplysm/core-common";

describe("path utils", () => {
  describe("pathJoin()", () => {
    it("Combines path segments", () => {
      expect(pathJoin("a", "b", "c")).toBe("a/b/c");
    });

    it("Preserves leading slash", () => {
      expect(pathJoin("/a", "b")).toBe("/a/b");
    });

    it("Removes duplicate slashes", () => {
      expect(pathJoin("a/", "/b/", "/c")).toBe("a/b/c");
    });

    it("Ignores empty segments", () => {
      expect(pathJoin("a", "", "b")).toBe("a/b");
    });

    it("Returns single segment", () => {
      expect(pathJoin("a")).toBe("a");
    });

    it("Empty input returns empty string", () => {
      expect(pathJoin()).toBe("");
    });
  });

  describe("pathBasename()", () => {
    it("Extracts filename", () => {
      expect(pathBasename("a/b/file.txt")).toBe("file.txt");
    });

    it("Removes extension", () => {
      expect(pathBasename("a/b/file.txt", ".txt")).toBe("file");
    });

    it("Ignores non-matching extension", () => {
      expect(pathBasename("a/b/file.txt", ".md")).toBe("file.txt");
    });

    it("Handles filename without path", () => {
      expect(pathBasename("file.txt")).toBe("file.txt");
    });

    it("Empty string returns empty string", () => {
      expect(pathBasename("")).toBe("");
    });
  });

  describe("pathExtname()", () => {
    it("Extracts extension", () => {
      expect(pathExtname("file.txt")).toBe(".txt");
    });

    it("Extracts only last extension", () => {
      expect(pathExtname("archive.tar.gz")).toBe(".gz");
    });

    it("File without extension returns empty string", () => {
      expect(pathExtname("Makefile")).toBe("");
    });

    it("Hidden file returns empty string", () => {
      expect(pathExtname(".gitignore")).toBe("");
    });

    it("Extracts extension from file with path", () => {
      expect(pathExtname("a/b/file.ts")).toBe(".ts");
    });

    it("Empty string returns empty string", () => {
      expect(pathExtname("")).toBe("");
    });
  });
});
