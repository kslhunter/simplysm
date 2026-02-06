import { describe, it, expect } from "vitest";
import { pathJoin, pathBasename, pathExtname } from "@simplysm/core-common";

describe("path utils", () => {
  describe("pathJoin()", () => {
    it("경로 세그먼트를 결합한다", () => {
      expect(pathJoin("a", "b", "c")).toBe("a/b/c");
    });

    it("선행 슬래시를 유지한다", () => {
      expect(pathJoin("/a", "b")).toBe("/a/b");
    });

    it("중복 슬래시를 제거한다", () => {
      expect(pathJoin("a/", "/b/", "/c")).toBe("a/b/c");
    });

    it("빈 세그먼트를 무시한다", () => {
      expect(pathJoin("a", "", "b")).toBe("a/b");
    });

    it("단일 세그먼트를 반환한다", () => {
      expect(pathJoin("a")).toBe("a");
    });

    it("빈 입력은 빈 문자열을 반환한다", () => {
      expect(pathJoin()).toBe("");
    });
  });

  describe("pathBasename()", () => {
    it("파일명을 추출한다", () => {
      expect(pathBasename("a/b/file.txt")).toBe("file.txt");
    });

    it("확장자를 제거한다", () => {
      expect(pathBasename("a/b/file.txt", ".txt")).toBe("file");
    });

    it("일치하지 않는 확장자는 무시한다", () => {
      expect(pathBasename("a/b/file.txt", ".md")).toBe("file.txt");
    });

    it("경로 없는 파일명을 처리한다", () => {
      expect(pathBasename("file.txt")).toBe("file.txt");
    });

    it("빈 문자열은 빈 문자열을 반환한다", () => {
      expect(pathBasename("")).toBe("");
    });
  });

  describe("pathExtname()", () => {
    it("확장자를 추출한다", () => {
      expect(pathExtname("file.txt")).toBe(".txt");
    });

    it("마지막 확장자만 추출한다", () => {
      expect(pathExtname("archive.tar.gz")).toBe(".gz");
    });

    it("확장자 없는 파일은 빈 문자열을 반환한다", () => {
      expect(pathExtname("Makefile")).toBe("");
    });

    it("숨김 파일은 빈 문자열을 반환한다", () => {
      expect(pathExtname(".gitignore")).toBe("");
    });

    it("경로 포함 파일의 확장자를 추출한다", () => {
      expect(pathExtname("a/b/file.ts")).toBe(".ts");
    });

    it("빈 문자열은 빈 문자열을 반환한다", () => {
      expect(pathExtname("")).toBe("");
    });
  });
});
