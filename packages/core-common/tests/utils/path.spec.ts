import { describe, it, expect } from "vitest";
import { path } from "@simplysm/core-common";

describe("path utils", () => {
  describe("join()", () => {
    it("경로 세그먼트 결합", () => {
      expect(path.join("a", "b", "c")).toBe("a/b/c");
    });

    it("선행 슬래시 유지", () => {
      expect(path.join("/a", "b")).toBe("/a/b");
    });

    it("중복 슬래시 제거", () => {
      expect(path.join("a/", "/b/", "/c")).toBe("a/b/c");
    });

    it("빈 세그먼트 무시", () => {
      expect(path.join("a", "", "b")).toBe("a/b");
    });

    it("빈 입력은 빈 문자열 반환", () => {
      expect(path.join()).toBe("");
    });
  });

  describe("basename()", () => {
    it("파일명 추출", () => {
      expect(path.basename("a/b/file.txt")).toBe("file.txt");
    });

    it("확장자 제거", () => {
      expect(path.basename("a/b/file.txt", ".txt")).toBe("file");
    });

    it("일치하지 않는 확장자 무시", () => {
      expect(path.basename("a/b/file.txt", ".md")).toBe("file.txt");
    });

    it("경로 없는 파일명 처리", () => {
      expect(path.basename("file.txt")).toBe("file.txt");
    });
  });

  describe("extname()", () => {
    it("확장자 추출", () => {
      expect(path.extname("file.txt")).toBe(".txt");
    });

    it("마지막 확장자만 추출", () => {
      expect(path.extname("archive.tar.gz")).toBe(".gz");
    });

    it("확장자 없는 파일은 빈 문자열 반환", () => {
      expect(path.extname("Makefile")).toBe("");
    });

    it("숨김 파일은 빈 문자열 반환", () => {
      expect(path.extname(".gitignore")).toBe("");
    });

    it("경로 포함 파일에서 확장자 추출", () => {
      expect(path.extname("a/b/file.ts")).toBe(".ts");
    });

    it("빈 문자열은 빈 문자열 반환", () => {
      expect(path.extname("")).toBe("");
    });
  });
});
