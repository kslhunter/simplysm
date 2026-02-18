import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import {
  fsExistsSync,
  fsExists,
  fsMkdirSync,
  fsMkdir,
  fsRmSync,
  fsRm,
  fsCopySync,
  fsCopy,
  fsReadSync,
  fsRead,
  fsReadBufferSync,
  fsReadBuffer,
  fsReadJsonSync,
  fsReadJson,
  fsWriteSync,
  fsWrite,
  fsWriteJsonSync,
  fsWriteJson,
  fsReaddirSync,
  fsReaddir,
  fsStatSync,
  fsStat,
  fsLstatSync,
  fsLstat,
  fsGlobSync,
  fsGlob,
  fsClearEmptyDirectory,
  fsFindAllParentChildPathsSync,
  fsFindAllParentChildPaths,
} from "../../src/utils/fs";
import { SdError } from "@simplysm/core-common";

describe("fs 함수들", () => {
  const testDir = path.join(os.tmpdir(), "fs-utils-test-" + Date.now());

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  //#region exists

  describe("fsExistsSync", () => {
    it("존재하는 파일에 대해 true 반환", () => {
      const filePath = path.join(testDir, "test.txt");
      fs.writeFileSync(filePath, "test");

      expect(fsExistsSync(filePath)).toBe(true);
    });

    it("존재하지 않는 파일에 대해 false 반환", () => {
      const filePath = path.join(testDir, "nonexistent.txt");
      expect(fsExistsSync(filePath)).toBe(false);
    });

    it("존재하는 디렉토리에 대해 true 반환", () => {
      expect(fsExistsSync(testDir)).toBe(true);
    });
  });

  describe("fsExists", () => {
    it("존재하는 파일에 대해 true 반환", async () => {
      const filePath = path.join(testDir, "test.txt");
      fs.writeFileSync(filePath, "test");

      expect(await fsExists(filePath)).toBe(true);
    });

    it("존재하지 않는 파일에 대해 false 반환", async () => {
      const filePath = path.join(testDir, "nonexistent.txt");
      expect(await fsExists(filePath)).toBe(false);
    });

    it("존재하는 디렉토리에 대해 true 반환", async () => {
      expect(await fsExists(testDir)).toBe(true);
    });
  });

  //#endregion

  //#region mkdir

  describe("fsMkdirSync", () => {
    it("디렉토리 생성", () => {
      const dirPath = path.join(testDir, "newdir");
      fsMkdirSync(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    it("중첩 디렉토리 생성 (recursive)", () => {
      const dirPath = path.join(testDir, "a/b/c");
      fsMkdirSync(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
    });

    it("이미 존재하는 디렉토리는 에러 없이 통과", () => {
      expect(() => fsMkdirSync(testDir)).not.toThrow();
    });
  });

  describe("fsMkdir", () => {
    it("비동기로 디렉토리 생성", async () => {
      const dirPath = path.join(testDir, "asyncdir");
      await fsMkdir(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  //#endregion

  //#region rm

  describe("fsRmSync", () => {
    it("파일 삭제", () => {
      const filePath = path.join(testDir, "todelete.txt");
      fs.writeFileSync(filePath, "test");

      fsRmSync(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("디렉토리 삭제 (recursive)", () => {
      const dirPath = path.join(testDir, "todelete");
      fs.mkdirSync(dirPath);
      fs.writeFileSync(path.join(dirPath, "file.txt"), "test");

      fsRmSync(dirPath);

      expect(fs.existsSync(dirPath)).toBe(false);
    });

    it("존재하지 않는 경로는 에러 없이 통과", () => {
      expect(() => fsRmSync(path.join(testDir, "nonexistent"))).not.toThrow();
    });
  });

  describe("fsRm", () => {
    it("비동기로 파일 삭제", async () => {
      const filePath = path.join(testDir, "asyncdelete.txt");
      fs.writeFileSync(filePath, "test");

      await fsRm(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  //#endregion

  //#region read/write

  describe("fsReadSync", () => {
    it("파일 내용을 UTF-8 문자열로 읽기", () => {
      const filePath = path.join(testDir, "read.txt");
      fs.writeFileSync(filePath, "Hello, World!");

      const content = fsReadSync(filePath);

      expect(content).toBe("Hello, World!");
    });

    it("한글 내용 읽기", () => {
      const filePath = path.join(testDir, "korean.txt");
      fs.writeFileSync(filePath, "안녕하세요");

      const content = fsReadSync(filePath);

      expect(content).toBe("안녕하세요");
    });
  });

  describe("fsRead", () => {
    it("비동기로 파일 읽기", async () => {
      const filePath = path.join(testDir, "asyncread.txt");
      fs.writeFileSync(filePath, "async content");

      const content = await fsRead(filePath);

      expect(content).toBe("async content");
    });
  });

  describe("fsReadBufferSync", () => {
    it("파일을 Buffer로 읽기", () => {
      const filePath = path.join(testDir, "buffer.txt");
      fs.writeFileSync(filePath, "buffer content");

      const buffer = fsReadBufferSync(filePath);

      expect(buffer instanceof Uint8Array).toBe(true);
      expect(buffer.toString()).toBe("buffer content");
    });
  });

  describe("fsReadBuffer", () => {
    it("비동기로 파일을 Buffer로 읽기", async () => {
      const filePath = path.join(testDir, "asyncbuffer.txt");
      fs.writeFileSync(filePath, "async buffer content");

      const buffer = await fsReadBuffer(filePath);

      expect(buffer instanceof Uint8Array).toBe(true);
      expect(buffer.toString()).toBe("async buffer content");
    });
  });

  describe("fsWriteSync", () => {
    it("문자열을 파일로 쓰기", () => {
      const filePath = path.join(testDir, "write.txt");

      fsWriteSync(filePath, "written content");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("written content");
    });

    it("Buffer를 파일로 쓰기", () => {
      const filePath = path.join(testDir, "buffer-write.bin");
      const buffer = new Uint8Array([0x00, 0x01, 0x02, 0xff]);

      fsWriteSync(filePath, buffer);

      expect(new Uint8Array(fs.readFileSync(filePath))).toEqual(buffer);
    });

    it("부모 디렉토리가 없으면 자동 생성", () => {
      const filePath = path.join(testDir, "sub/dir/write.txt");

      fsWriteSync(filePath, "nested content");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("nested content");
    });
  });

  describe("fsWrite", () => {
    it("비동기로 파일 쓰기", async () => {
      const filePath = path.join(testDir, "asyncwrite.txt");

      await fsWrite(filePath, "async written");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("async written");
    });
  });

  //#endregion

  //#region JSON

  describe("fsReadJsonSync", () => {
    it("JSON 파일 읽기", () => {
      const filePath = path.join(testDir, "data.json");
      fs.writeFileSync(filePath, '{"name": "test", "value": 42}');

      const data = fsReadJsonSync<{ name: string; value: number }>(filePath);

      expect(data).toEqual({ name: "test", value: 42 });
    });

    it("500자 이상의 잘못된 JSON 파일 읽기 시 truncate된 내용 포함", () => {
      const filePath = path.join(testDir, "long-invalid.json");
      const longContent = "{ invalid " + "x".repeat(600) + " }";
      fs.writeFileSync(filePath, longContent);

      try {
        fsReadJsonSync(filePath);
        expect.fail("에러가 발생해야 함");
      } catch (err) {
        expect((err as Error).message).toContain("...(truncated)");
      }
    });
  });

  describe("fsWriteJsonSync", () => {
    it("JSON 파일 쓰기", () => {
      const filePath = path.join(testDir, "output.json");
      const data = { name: "test", value: 42 };

      fsWriteJsonSync(filePath, data);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
      expect(content).toEqual(data);
    });

    it("JSON 파일 쓰기 (포맷팅)", () => {
      const filePath = path.join(testDir, "formatted.json");
      const data = { name: "test" };

      fsWriteJsonSync(filePath, data, { space: 2 });

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("\n");
    });

    it("JSON 파일 쓰기 (replacer 옵션)", () => {
      const filePath = path.join(testDir, "replaced.json");
      const data = { name: "test", secret: "hidden" };

      fsWriteJsonSync(filePath, data, {
        replacer: (_key, value) =>
          typeof value === "string" && value === "hidden" ? undefined : value,
      });

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
      expect(content).toEqual({ name: "test" });
      expect(content["secret"]).toBeUndefined();
    });
  });

  describe("fsReadJson", () => {
    it("비동기로 JSON 파일 읽기", async () => {
      const filePath = path.join(testDir, "asyncdata.json");
      fs.writeFileSync(filePath, '{"name": "async", "value": 100}');

      const data = await fsReadJson<{ name: string; value: number }>(filePath);

      expect(data).toEqual({ name: "async", value: 100 });
    });
  });

  describe("fsWriteJson", () => {
    it("비동기로 JSON 파일 쓰기", async () => {
      const filePath = path.join(testDir, "asyncoutput.json");
      const data = { name: "async", value: 100 };

      await fsWriteJson(filePath, data);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
      expect(content).toEqual(data);
    });
  });

  //#endregion

  //#region copy

  describe("fsCopySync", () => {
    it("파일 복사", () => {
      const source = path.join(testDir, "source.txt");
      const target = path.join(testDir, "target.txt");
      fs.writeFileSync(source, "source content");

      fsCopySync(source, target);

      expect(fs.readFileSync(target, "utf-8")).toBe("source content");
    });

    it("디렉토리 복사 (recursive)", () => {
      const sourceDir = path.join(testDir, "sourceDir");
      const targetDir = path.join(testDir, "targetDir");
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, "file.txt"), "content");
      fs.mkdirSync(path.join(sourceDir, "sub"));
      fs.writeFileSync(path.join(sourceDir, "sub/nested.txt"), "nested");

      fsCopySync(sourceDir, targetDir);

      expect(fs.existsSync(path.join(targetDir, "file.txt"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "sub/nested.txt"))).toBe(true);
    });

    it("존재하지 않는 소스는 무시", () => {
      const source = path.join(testDir, "nonexistent");
      const target = path.join(testDir, "target");

      expect(() => fsCopySync(source, target)).not.toThrow();
    });

    it("filter 옵션으로 선택적 복사", () => {
      const sourceDir = path.join(testDir, "filterSource");
      const targetDir = path.join(testDir, "filterTarget");
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, "include.txt"), "include");
      fs.writeFileSync(path.join(sourceDir, "exclude.log"), "exclude");

      fsCopySync(sourceDir, targetDir, (p) => !p.endsWith(".log"));

      expect(fs.existsSync(path.join(targetDir, "include.txt"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "exclude.log"))).toBe(false);
    });

    it("filter가 디렉토리를 제외하면 하위 항목도 건너뛰기", () => {
      const sourceDir = path.join(testDir, "filterDirSource");
      const targetDir = path.join(testDir, "filterDirTarget");
      fs.mkdirSync(sourceDir);
      fs.mkdirSync(path.join(sourceDir, "excluded"));
      fs.mkdirSync(path.join(sourceDir, "included"));
      fs.writeFileSync(path.join(sourceDir, "excluded", "nested.txt"), "nested");
      fs.writeFileSync(path.join(sourceDir, "included", "nested.txt"), "nested");

      fsCopySync(sourceDir, targetDir, (p) => !p.includes("excluded"));

      expect(fs.existsSync(path.join(targetDir, "excluded"))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, "excluded", "nested.txt"))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, "included"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "included", "nested.txt"))).toBe(true);
    });
  });

  describe("fsCopy", () => {
    it("비동기로 파일 복사", async () => {
      const source = path.join(testDir, "asyncSource.txt");
      const target = path.join(testDir, "asyncTarget.txt");
      fs.writeFileSync(source, "async source content");

      await fsCopy(source, target);

      expect(fs.readFileSync(target, "utf-8")).toBe("async source content");
    });

    it("비동기로 디렉토리 복사 (recursive)", async () => {
      const sourceDir = path.join(testDir, "asyncSourceDir");
      const targetDir = path.join(testDir, "asyncTargetDir");
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, "file.txt"), "content");
      fs.mkdirSync(path.join(sourceDir, "sub"));
      fs.writeFileSync(path.join(sourceDir, "sub/nested.txt"), "nested");

      await fsCopy(sourceDir, targetDir);

      expect(fs.existsSync(path.join(targetDir, "file.txt"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "sub/nested.txt"))).toBe(true);
    });

    it("비동기로 filter 옵션으로 선택적 복사", async () => {
      const sourceDir = path.join(testDir, "asyncFilterSource");
      const targetDir = path.join(testDir, "asyncFilterTarget");
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, "keep.ts"), "keep");
      fs.writeFileSync(path.join(sourceDir, "skip.js"), "skip");

      await fsCopy(sourceDir, targetDir, (p) => p.endsWith(".ts"));

      expect(fs.existsSync(path.join(targetDir, "keep.ts"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "skip.js"))).toBe(false);
    });
  });

  //#endregion

  //#region readdir

  describe("fsReaddirSync", () => {
    it("디렉토리 내용 읽기", () => {
      fs.writeFileSync(path.join(testDir, "file1.txt"), "");
      fs.writeFileSync(path.join(testDir, "file2.txt"), "");
      fs.mkdirSync(path.join(testDir, "subdir"));

      const entries = fsReaddirSync(testDir);

      expect(entries).toContain("file1.txt");
      expect(entries).toContain("file2.txt");
      expect(entries).toContain("subdir");
    });
  });

  describe("fsReaddir", () => {
    it("비동기로 디렉토리 내용 읽기", async () => {
      fs.writeFileSync(path.join(testDir, "async1.txt"), "");
      fs.writeFileSync(path.join(testDir, "async2.txt"), "");

      const entries = await fsReaddir(testDir);

      expect(entries).toContain("async1.txt");
      expect(entries).toContain("async2.txt");
    });
  });

  //#endregion

  //#region stat

  describe("fsStatSync", () => {
    it("파일 정보 가져오기", () => {
      const filePath = path.join(testDir, "statfile.txt");
      fs.writeFileSync(filePath, "content");

      const result = fsStatSync(filePath);

      expect(result.isFile()).toBe(true);
      expect(result.size).toBeGreaterThan(0);
    });

    it("디렉토리 정보 가져오기", () => {
      const result = fsStatSync(testDir);
      expect(result.isDirectory()).toBe(true);
    });
  });

  describe("fsStat", () => {
    it("비동기로 파일 정보 가져오기", async () => {
      const filePath = path.join(testDir, "asyncstatfile.txt");
      fs.writeFileSync(filePath, "async content");

      const stat = await fsStat(filePath);

      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBeGreaterThan(0);
    });
  });

  describe("fsLstatSync", () => {
    it("일반 파일 정보 가져오기", () => {
      const filePath = path.join(testDir, "lstatfile.txt");
      fs.writeFileSync(filePath, "content");

      const stat = fsLstatSync(filePath);

      expect(stat.isFile()).toBe(true);
    });

    it("심볼릭 링크는 링크 자체의 정보 반환", () => {
      const targetPath = path.join(testDir, "target.txt");
      const linkPath = path.join(testDir, "link.txt");
      fs.writeFileSync(targetPath, "target content");
      fs.symlinkSync(targetPath, linkPath);

      const lstatResult = fsLstatSync(linkPath);
      const statResult = fsStatSync(linkPath);

      // lstat은 심볼릭 링크 자체의 정보를 반환
      expect(lstatResult.isSymbolicLink()).toBe(true);
      expect(lstatResult.isFile()).toBe(false);

      // stat은 링크 대상의 정보를 반환
      expect(statResult.isSymbolicLink()).toBe(false);
      expect(statResult.isFile()).toBe(true);
    });
  });

  describe("fsLstat", () => {
    it("비동기로 파일 정보 가져오기", async () => {
      const filePath = path.join(testDir, "asynclstatfile.txt");
      fs.writeFileSync(filePath, "async content");

      const stat = await fsLstat(filePath);

      expect(stat.isFile()).toBe(true);
    });

    it("비동기로 심볼릭 링크는 링크 자체의 정보 반환", async () => {
      const targetPath = path.join(testDir, "async-target.txt");
      const linkPath = path.join(testDir, "async-link.txt");
      fs.writeFileSync(targetPath, "target content");
      fs.symlinkSync(targetPath, linkPath);

      const lstatResult = await fsLstat(linkPath);
      const statResult = await fsStat(linkPath);

      // lstat은 심볼릭 링크 자체의 정보를 반환
      expect(lstatResult.isSymbolicLink()).toBe(true);
      expect(lstatResult.isFile()).toBe(false);

      // stat은 링크 대상의 정보를 반환
      expect(statResult.isSymbolicLink()).toBe(false);
      expect(statResult.isFile()).toBe(true);
    });
  });

  //#endregion

  //#region glob

  describe("fsGlobSync", () => {
    it("글로브 패턴으로 파일 검색", () => {
      fs.writeFileSync(path.join(testDir, "a.txt"), "");
      fs.writeFileSync(path.join(testDir, "b.txt"), "");
      fs.writeFileSync(path.join(testDir, "c.js"), "");

      const txtFiles = fsGlobSync(path.join(testDir, "*.txt"));

      expect(txtFiles.length).toBe(2);
      expect(txtFiles.some((f) => f.endsWith("a.txt"))).toBe(true);
      expect(txtFiles.some((f) => f.endsWith("b.txt"))).toBe(true);
    });

    it("중첩 디렉토리 검색", () => {
      fs.mkdirSync(path.join(testDir, "nested"));
      fs.writeFileSync(path.join(testDir, "nested/deep.txt"), "");

      const files = fsGlobSync(path.join(testDir, "**/*.txt"));

      expect(files.some((f) => f.endsWith("deep.txt"))).toBe(true);
    });

    it("dot: true 옵션으로 숨김 파일 포함", () => {
      fs.writeFileSync(path.join(testDir, ".hidden"), "");
      fs.writeFileSync(path.join(testDir, "visible"), "");

      const withoutDot = fsGlobSync(path.join(testDir, "*"));
      const withDot = fsGlobSync(path.join(testDir, "*"), { dot: true });

      expect(withoutDot.some((f) => f.endsWith(".hidden"))).toBe(false);
      expect(withDot.some((f) => f.endsWith(".hidden"))).toBe(true);
    });
  });

  describe("fsGlob", () => {
    it("비동기 글로브 검색", async () => {
      fs.writeFileSync(path.join(testDir, "async.txt"), "");

      const files = await fsGlob(path.join(testDir, "*.txt"));

      expect(files.length).toBeGreaterThan(0);
    });
  });

  //#endregion

  //#region clearEmptyDirectoryAsync

  describe("fsClearEmptyDirectory", () => {
    it("빈 디렉토리 재귀적으로 삭제", async () => {
      const emptyDir = path.join(testDir, "empty/nested/deep");
      fs.mkdirSync(emptyDir, { recursive: true });

      await fsClearEmptyDirectory(path.join(testDir, "empty"));

      expect(fs.existsSync(path.join(testDir, "empty"))).toBe(false);
    });

    it("파일이 있는 디렉토리는 유지", async () => {
      const dirWithFile = path.join(testDir, "notempty");
      fs.mkdirSync(dirWithFile);
      fs.writeFileSync(path.join(dirWithFile, "file.txt"), "content");

      await fsClearEmptyDirectory(dirWithFile);

      expect(fs.existsSync(dirWithFile)).toBe(true);
    });
  });

  //#endregion

  //#region findAllParentChildPaths

  describe("fsFindAllParentChildPathsSync", () => {
    it("부모 디렉토리들에서 특정 파일 찾기", () => {
      const deepDir = path.join(testDir, "a/b/c");
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, "marker.txt"), "");
      fs.writeFileSync(path.join(testDir, "a/marker.txt"), "");

      const results = fsFindAllParentChildPathsSync("marker.txt", deepDir, testDir);

      expect(results.length).toBe(2);
    });

    it("매칭되는 파일이 없으면 빈 배열 반환", () => {
      const deepDir = path.join(testDir, "a/b/c");
      fs.mkdirSync(deepDir, { recursive: true });

      const results = fsFindAllParentChildPathsSync("nonexistent-file.txt", deepDir, testDir);

      expect(results).toEqual([]);
    });
  });

  describe("fsFindAllParentChildPaths", () => {
    it("비동기로 부모 디렉토리들에서 특정 파일 찾기", async () => {
      const deepDir = path.join(testDir, "x/y/z");
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, "config.json"), "");
      fs.writeFileSync(path.join(testDir, "x/config.json"), "");

      const results = await fsFindAllParentChildPaths("config.json", deepDir, testDir);

      expect(results.length).toBe(2);
    });

    it("비동기로 매칭되는 파일이 없으면 빈 배열 반환", async () => {
      const deepDir = path.join(testDir, "x/y/z");
      fs.mkdirSync(deepDir, { recursive: true });

      const results = await fsFindAllParentChildPaths("nonexistent-file.txt", deepDir, testDir);

      expect(results).toEqual([]);
    });
  });

  //#endregion

  //#region 에러 케이스

  describe("에러 케이스", () => {
    it("존재하지 않는 파일 읽기 시 SdError에 경로 정보 포함", () => {
      const filePath = path.join(testDir, "nonexistent.txt");
      expect(() => fsReadSync(filePath)).toThrow(SdError);
      try {
        fsReadSync(filePath);
      } catch (err) {
        expect((err as Error).message).toContain(filePath);
      }
    });

    it("존재하지 않는 파일 비동기 읽기 시 SdError에 경로 정보 포함", async () => {
      const filePath = path.join(testDir, "nonexistent.txt");
      await expect(fsRead(filePath)).rejects.toThrow(SdError);
      try {
        await fsRead(filePath);
      } catch (err) {
        expect((err as Error).message).toContain(filePath);
      }
    });

    it("존재하지 않는 디렉토리 내용 읽기 시 에러 발생", () => {
      expect(() => fsReaddirSync(path.join(testDir, "nonexistent"))).toThrow();
    });

    it("존재하지 않는 파일 stat 시 에러 발생", () => {
      expect(() => fsStatSync(path.join(testDir, "nonexistent.txt"))).toThrow();
    });

    it("잘못된 JSON 형식 파일 읽기 시 SdError에 경로와 내용 정보 포함", () => {
      const filePath = path.join(testDir, "invalid.json");
      const content = "{ invalid json }";
      fs.writeFileSync(filePath, content);

      expect(() => fsReadJsonSync(filePath)).toThrow(SdError);
      try {
        fsReadJsonSync(filePath);
      } catch (err) {
        expect((err as Error).message).toContain(filePath);
        expect((err as Error).message).toContain(content);
      }
    });

    it("잘못된 JSON 형식 파일 비동기 읽기 시 SdError에 경로와 내용 정보 포함", async () => {
      const filePath = path.join(testDir, "invalid-async.json");
      const content = "{ invalid json }";
      fs.writeFileSync(filePath, content);

      await expect(fsReadJson(filePath)).rejects.toThrow(SdError);
      try {
        await fsReadJson(filePath);
      } catch (err) {
        expect((err as Error).message).toContain(filePath);
        expect((err as Error).message).toContain(content);
      }
    });
  });

  //#endregion
});
