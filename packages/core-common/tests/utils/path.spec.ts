import { describe, it, expect } from "vitest";
import { path } from "@simplysm/core-common";

describe("path utils", () => {
  describe("join()", () => {
    it("Combines path segments", () => {
      expect(path.join("a", "b", "c")).toBe("a/b/c");
    });

    it("Preserves leading slash", () => {
      expect(path.join("/a", "b")).toBe("/a/b");
    });

    it("Removes duplicate slashes", () => {
      expect(path.join("a/", "/b/", "/c")).toBe("a/b/c");
    });

    it("Ignores empty segments", () => {
      expect(path.join("a", "", "b")).toBe("a/b");
    });

    it("Empty input returns empty string", () => {
      expect(path.join()).toBe("");
    });
  });

  describe("basename()", () => {
    it("Extracts filename", () => {
      expect(path.basename("a/b/file.txt")).toBe("file.txt");
    });

    it("Removes extension", () => {
      expect(path.basename("a/b/file.txt", ".txt")).toBe("file");
    });

    it("Ignores non-matching extension", () => {
      expect(path.basename("a/b/file.txt", ".md")).toBe("file.txt");
    });

    it("Handles filename without path", () => {
      expect(path.basename("file.txt")).toBe("file.txt");
    });
  });

  describe("extname()", () => {
    it("Extracts extension", () => {
      expect(path.extname("file.txt")).toBe(".txt");
    });

    it("Extracts only last extension", () => {
      expect(path.extname("archive.tar.gz")).toBe(".gz");
    });

    it("File without extension returns empty string", () => {
      expect(path.extname("Makefile")).toBe("");
    });

    it("Hidden file returns empty string", () => {
      expect(path.extname(".gitignore")).toBe("");
    });

    it("Extracts extension from file with path", () => {
      expect(path.extname("a/b/file.ts")).toBe(".ts");
    });

    it("Empty string returns empty string", () => {
      expect(path.extname("")).toBe("");
    });
  });
});
