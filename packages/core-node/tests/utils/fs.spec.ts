import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { FsUtils } from "../../src/utils/fs";

describe("FsUtils", () => {
  const testDir = path.join(os.tmpdir(), "fs-utils-test-" + Date.now());

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  //#region exists

  describe("exists", () => {
    it("존재하는 파일에 대해 true 반환", () => {
      const filePath = path.join(testDir, "test.txt");
      fs.writeFileSync(filePath, "test");

      expect(FsUtils.exists(filePath)).toBe(true);
    });

    it("존재하지 않는 파일에 대해 false 반환", () => {
      const filePath = path.join(testDir, "nonexistent.txt");
      expect(FsUtils.exists(filePath)).toBe(false);
    });

    it("존재하는 디렉토리에 대해 true 반환", () => {
      expect(FsUtils.exists(testDir)).toBe(true);
    });
  });

  //#endregion

  //#region mkdir

  describe("mkdir", () => {
    it("디렉토리 생성", () => {
      const dirPath = path.join(testDir, "newdir");
      FsUtils.mkdir(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    it("중첩 디렉토리 생성 (recursive)", () => {
      const dirPath = path.join(testDir, "a/b/c");
      FsUtils.mkdir(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
    });

    it("이미 존재하는 디렉토리는 에러 없이 통과", () => {
      expect(() => FsUtils.mkdir(testDir)).not.toThrow();
    });
  });

  describe("mkdirAsync", () => {
    it("비동기로 디렉토리 생성", async () => {
      const dirPath = path.join(testDir, "asyncdir");
      await FsUtils.mkdirAsync(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  //#endregion

  //#region rm

  describe("rm", () => {
    it("파일 삭제", () => {
      const filePath = path.join(testDir, "todelete.txt");
      fs.writeFileSync(filePath, "test");

      FsUtils.rm(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("디렉토리 삭제 (recursive)", () => {
      const dirPath = path.join(testDir, "todelete");
      fs.mkdirSync(dirPath);
      fs.writeFileSync(path.join(dirPath, "file.txt"), "test");

      FsUtils.rm(dirPath);

      expect(fs.existsSync(dirPath)).toBe(false);
    });

    it("존재하지 않는 경로는 에러 없이 통과", () => {
      expect(() => FsUtils.rm(path.join(testDir, "nonexistent"))).not.toThrow();
    });
  });

  describe("rmAsync", () => {
    it("비동기로 파일 삭제", async () => {
      const filePath = path.join(testDir, "asyncdelete.txt");
      fs.writeFileSync(filePath, "test");

      await FsUtils.rmAsync(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  //#endregion

  //#region read/write

  describe("read", () => {
    it("파일 내용을 UTF-8 문자열로 읽기", () => {
      const filePath = path.join(testDir, "read.txt");
      fs.writeFileSync(filePath, "Hello, World!");

      const content = FsUtils.read(filePath);

      expect(content).toBe("Hello, World!");
    });

    it("한글 내용 읽기", () => {
      const filePath = path.join(testDir, "korean.txt");
      fs.writeFileSync(filePath, "안녕하세요");

      const content = FsUtils.read(filePath);

      expect(content).toBe("안녕하세요");
    });
  });

  describe("readAsync", () => {
    it("비동기로 파일 읽기", async () => {
      const filePath = path.join(testDir, "asyncread.txt");
      fs.writeFileSync(filePath, "async content");

      const content = await FsUtils.readAsync(filePath);

      expect(content).toBe("async content");
    });
  });

  describe("readBuffer", () => {
    it("파일을 Buffer로 읽기", () => {
      const filePath = path.join(testDir, "buffer.txt");
      fs.writeFileSync(filePath, "buffer content");

      const buffer = FsUtils.readBuffer(filePath);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe("buffer content");
    });
  });

  describe("write", () => {
    it("문자열을 파일로 쓰기", () => {
      const filePath = path.join(testDir, "write.txt");

      FsUtils.write(filePath, "written content");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("written content");
    });

    it("부모 디렉토리가 없으면 자동 생성", () => {
      const filePath = path.join(testDir, "sub/dir/write.txt");

      FsUtils.write(filePath, "nested content");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("nested content");
    });
  });

  describe("writeAsync", () => {
    it("비동기로 파일 쓰기", async () => {
      const filePath = path.join(testDir, "asyncwrite.txt");

      await FsUtils.writeAsync(filePath, "async written");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("async written");
    });
  });

  //#endregion

  //#region JSON

  describe("readJson", () => {
    it("JSON 파일 읽기", () => {
      const filePath = path.join(testDir, "data.json");
      fs.writeFileSync(filePath, '{"name": "test", "value": 42}');

      const data = FsUtils.readJson<{ name: string; value: number }>(filePath);

      expect(data).toEqual({ name: "test", value: 42 });
    });
  });

  describe("writeJson", () => {
    it("JSON 파일 쓰기", () => {
      const filePath = path.join(testDir, "output.json");
      const data = { name: "test", value: 42 };

      FsUtils.writeJson(filePath, data);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
      expect(content).toEqual(data);
    });

    it("JSON 파일 쓰기 (포맷팅)", () => {
      const filePath = path.join(testDir, "formatted.json");
      const data = { name: "test" };

      FsUtils.writeJson(filePath, data, { space: 2 });

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("\n");
    });
  });

  //#endregion

  //#region copy

  describe("copy", () => {
    it("파일 복사", () => {
      const source = path.join(testDir, "source.txt");
      const target = path.join(testDir, "target.txt");
      fs.writeFileSync(source, "source content");

      FsUtils.copy(source, target);

      expect(fs.readFileSync(target, "utf-8")).toBe("source content");
    });

    it("디렉토리 복사 (recursive)", () => {
      const sourceDir = path.join(testDir, "sourceDir");
      const targetDir = path.join(testDir, "targetDir");
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, "file.txt"), "content");
      fs.mkdirSync(path.join(sourceDir, "sub"));
      fs.writeFileSync(path.join(sourceDir, "sub/nested.txt"), "nested");

      FsUtils.copy(sourceDir, targetDir);

      expect(fs.existsSync(path.join(targetDir, "file.txt"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "sub/nested.txt"))).toBe(true);
    });

    it("존재하지 않는 소스는 무시", () => {
      const source = path.join(testDir, "nonexistent");
      const target = path.join(testDir, "target");

      expect(() => FsUtils.copy(source, target)).not.toThrow();
    });
  });

  //#endregion

  //#region readdir

  describe("readdir", () => {
    it("디렉토리 내용 읽기", () => {
      fs.writeFileSync(path.join(testDir, "file1.txt"), "");
      fs.writeFileSync(path.join(testDir, "file2.txt"), "");
      fs.mkdirSync(path.join(testDir, "subdir"));

      const entries = FsUtils.readdir(testDir);

      expect(entries).toContain("file1.txt");
      expect(entries).toContain("file2.txt");
      expect(entries).toContain("subdir");
    });
  });

  //#endregion

  //#region stat

  describe("stat", () => {
    it("파일 정보 가져오기", () => {
      const filePath = path.join(testDir, "statfile.txt");
      fs.writeFileSync(filePath, "content");

      const stat = FsUtils.stat(filePath);

      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBeGreaterThan(0);
    });

    it("디렉토리 정보 가져오기", () => {
      const stat = FsUtils.stat(testDir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  //#endregion

  //#region glob

  describe("glob", () => {
    it("글로브 패턴으로 파일 검색", () => {
      fs.writeFileSync(path.join(testDir, "a.txt"), "");
      fs.writeFileSync(path.join(testDir, "b.txt"), "");
      fs.writeFileSync(path.join(testDir, "c.js"), "");

      const txtFiles = FsUtils.glob(path.join(testDir, "*.txt"));

      expect(txtFiles.length).toBe(2);
      expect(txtFiles.some((f) => f.endsWith("a.txt"))).toBe(true);
      expect(txtFiles.some((f) => f.endsWith("b.txt"))).toBe(true);
    });

    it("중첩 디렉토리 검색", () => {
      fs.mkdirSync(path.join(testDir, "nested"));
      fs.writeFileSync(path.join(testDir, "nested/deep.txt"), "");

      const files = FsUtils.glob(path.join(testDir, "**/*.txt"));

      expect(files.some((f) => f.endsWith("deep.txt"))).toBe(true);
    });
  });

  describe("globAsync", () => {
    it("비동기 글로브 검색", async () => {
      fs.writeFileSync(path.join(testDir, "async.txt"), "");

      const files = await FsUtils.globAsync(path.join(testDir, "*.txt"));

      expect(files.length).toBeGreaterThan(0);
    });
  });

  //#endregion

  //#region clearEmptyDirectoryAsync

  describe("clearEmptyDirectoryAsync", () => {
    it("빈 디렉토리 재귀적으로 삭제", async () => {
      const emptyDir = path.join(testDir, "empty/nested/deep");
      fs.mkdirSync(emptyDir, { recursive: true });

      await FsUtils.clearEmptyDirectoryAsync(path.join(testDir, "empty"));

      expect(fs.existsSync(path.join(testDir, "empty"))).toBe(false);
    });

    it("파일이 있는 디렉토리는 유지", async () => {
      const dirWithFile = path.join(testDir, "notempty");
      fs.mkdirSync(dirWithFile);
      fs.writeFileSync(path.join(dirWithFile, "file.txt"), "content");

      await FsUtils.clearEmptyDirectoryAsync(dirWithFile);

      expect(fs.existsSync(dirWithFile)).toBe(true);
    });
  });

  //#endregion

  //#region findAllParentChildPaths

  describe("findAllParentChildPaths", () => {
    it("부모 디렉토리들에서 특정 파일 찾기", () => {
      const deepDir = path.join(testDir, "a/b/c");
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, "marker.txt"), "");
      fs.writeFileSync(path.join(testDir, "a/marker.txt"), "");

      const results = FsUtils.findAllParentChildPaths("marker.txt", deepDir, testDir);

      expect(results.length).toBe(2);
    });
  });

  //#endregion

  //#region 에러 케이스

  describe("에러 케이스", () => {
    it("존재하지 않는 파일 읽기 시 에러 발생", () => {
      expect(() => FsUtils.read(path.join(testDir, "nonexistent.txt"))).toThrow();
    });

    it("존재하지 않는 파일 비동기 읽기 시 에러 발생", async () => {
      await expect(FsUtils.readAsync(path.join(testDir, "nonexistent.txt"))).rejects.toThrow();
    });

    it("존재하지 않는 디렉토리 내용 읽기 시 에러 발생", () => {
      expect(() => FsUtils.readdir(path.join(testDir, "nonexistent"))).toThrow();
    });

    it("존재하지 않는 파일 stat 시 에러 발생", () => {
      expect(() => FsUtils.stat(path.join(testDir, "nonexistent.txt"))).toThrow();
    });
  });

  //#endregion
});
