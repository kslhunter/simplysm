import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import {
  existsSync,
  exists,
  mkdirSync,
  mkdir,
  rmSync,
  rm,
  copySync,
  copy,
  readSync,
  read,
  readBufferSync,
  readBuffer,
  readJsonSync,
  readJson,
  writeSync,
  write,
  writeJsonSync,
  writeJson,
  readdirSync,
  readdir,
  statSync,
  stat,
  lstatSync,
  lstat,
  globSync,
  glob,
  clearEmptyDirectory,
  findAllParentChildPathsSync,
  findAllParentChildPaths,
} from "../../src/utils/fs";
import { SdError } from "@simplysm/core-common";

describe("fs functions", () => {
  const testDir = path.join(os.tmpdir(), "fs-utils-test-" + Date.now());

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  //#region exists

  describe("existsSync", () => {
    it("returns true for existing file", () => {
      const filePath = path.join(testDir, "test.txt");
      fs.writeFileSync(filePath, "test");

      expect(existsSync(filePath)).toBe(true);
    });

    it("returns false for nonexistent file", () => {
      const filePath = path.join(testDir, "nonexistent.txt");
      expect(existsSync(filePath)).toBe(false);
    });

  });

  describe("exists", () => {
    it("returns true for existing file", async () => {
      const filePath = path.join(testDir, "test.txt");
      fs.writeFileSync(filePath, "test");

      expect(await exists(filePath)).toBe(true);
    });

    it("returns false for nonexistent file", async () => {
      const filePath = path.join(testDir, "nonexistent.txt");
      expect(await exists(filePath)).toBe(false);
    });

  });

  //#endregion

  //#region mkdir

  describe("mkdirSync", () => {
    it("creates directory", () => {
      const dirPath = path.join(testDir, "newdir");
      mkdirSync(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    it("creates nested directories (recursive)", () => {
      const dirPath = path.join(testDir, "a/b/c");
      mkdirSync(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
    });

    it("passes without error for existing directory", () => {
      expect(() => mkdirSync(testDir)).not.toThrow();
    });
  });

  describe("mkdir", () => {
    it("creates directory asynchronously", async () => {
      const dirPath = path.join(testDir, "asyncdir");
      await mkdir(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  //#endregion

  //#region rm

  describe("rmSync", () => {
    it("deletes file", () => {
      const filePath = path.join(testDir, "todelete.txt");
      fs.writeFileSync(filePath, "test");

      rmSync(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("deletes directory (recursive)", () => {
      const dirPath = path.join(testDir, "todelete");
      fs.mkdirSync(dirPath);
      fs.writeFileSync(path.join(dirPath, "file.txt"), "test");

      rmSync(dirPath);

      expect(fs.existsSync(dirPath)).toBe(false);
    });

    it("passes without error for nonexistent path", () => {
      expect(() => rmSync(path.join(testDir, "nonexistent"))).not.toThrow();
    });
  });

  describe("rm", () => {
    it("deletes file asynchronously", async () => {
      const filePath = path.join(testDir, "asyncdelete.txt");
      fs.writeFileSync(filePath, "test");

      await rm(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  //#endregion

  //#region read/write

  describe("readSync", () => {
    it("reads file content as UTF-8 string", () => {
      const filePath = path.join(testDir, "read.txt");
      fs.writeFileSync(filePath, "Hello, World!");

      const content = readSync(filePath);

      expect(content).toBe("Hello, World!");
    });

  });

  describe("read", () => {
    it("reads file asynchronously", async () => {
      const filePath = path.join(testDir, "asyncread.txt");
      fs.writeFileSync(filePath, "async content");

      const content = await read(filePath);

      expect(content).toBe("async content");
    });
  });

  describe("readBufferSync", () => {
    it("reads file as Buffer", () => {
      const filePath = path.join(testDir, "buffer.txt");
      fs.writeFileSync(filePath, "buffer content");

      const buffer = readBufferSync(filePath);

      expect(buffer instanceof Uint8Array).toBe(true);
      expect(buffer.toString()).toBe("buffer content");
    });
  });

  describe("readBuffer", () => {
    it("reads file as Buffer asynchronously", async () => {
      const filePath = path.join(testDir, "asyncbuffer.txt");
      fs.writeFileSync(filePath, "async buffer content");

      const buffer = await readBuffer(filePath);

      expect(buffer instanceof Uint8Array).toBe(true);
      expect(buffer.toString()).toBe("async buffer content");
    });
  });

  describe("writeSync", () => {
    it("writes string to file", () => {
      const filePath = path.join(testDir, "write.txt");

      writeSync(filePath, "written content");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("written content");
    });

    it("writes Buffer to file", () => {
      const filePath = path.join(testDir, "buffer-write.bin");
      const buffer = new Uint8Array([0x00, 0x01, 0x02, 0xff]);

      writeSync(filePath, buffer);

      expect(new Uint8Array(fs.readFileSync(filePath))).toEqual(buffer);
    });

    it("auto-creates parent directory if missing", () => {
      const filePath = path.join(testDir, "sub/dir/write.txt");

      writeSync(filePath, "nested content");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("nested content");
    });
  });

  describe("write", () => {
    it("writes file asynchronously", async () => {
      const filePath = path.join(testDir, "asyncwrite.txt");

      await write(filePath, "async written");

      expect(fs.readFileSync(filePath, "utf-8")).toBe("async written");
    });
  });

  //#endregion

  //#region JSON

  describe("readJsonSync", () => {
    it("reads JSON file", () => {
      const filePath = path.join(testDir, "data.json");
      fs.writeFileSync(filePath, '{"name": "test", "value": 42}');

      const data = readJsonSync<{ name: string; value: number }>(filePath);

      expect(data).toEqual({ name: "test", value: 42 });
    });

    it("includes truncated content when reading invalid JSON with over 500 characters", () => {
      const filePath = path.join(testDir, "long-invalid.json");
      const longContent = "{ invalid " + "x".repeat(600) + " }";
      fs.writeFileSync(filePath, longContent);

      try {
        readJsonSync(filePath);
        expect.fail("Should throw error");
      } catch (err) {
        expect((err as Error).message).toContain("...(truncated)");
      }
    });
  });

  describe("writeJsonSync", () => {
    it("writes JSON file", () => {
      const filePath = path.join(testDir, "output.json");
      const data = { name: "test", value: 42 };

      writeJsonSync(filePath, data);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
      expect(content).toEqual(data);
    });

    it("writes JSON file with formatting", () => {
      const filePath = path.join(testDir, "formatted.json");
      const data = { name: "test" };

      writeJsonSync(filePath, data, { space: 2 });

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("\n");
    });

    it("writes JSON file with replacer option", () => {
      const filePath = path.join(testDir, "replaced.json");
      const data = { name: "test", secret: "hidden" };

      writeJsonSync(filePath, data, {
        replacer: (_key, value) =>
          typeof value === "string" && value === "hidden" ? undefined : value,
      });

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
      expect(content).toEqual({ name: "test" });
      expect(content["secret"]).toBeUndefined();
    });
  });

  describe("readJson", () => {
    it("reads JSON file asynchronously", async () => {
      const filePath = path.join(testDir, "asyncdata.json");
      fs.writeFileSync(filePath, '{"name": "async", "value": 100}');

      const data = await readJson<{ name: string; value: number }>(filePath);

      expect(data).toEqual({ name: "async", value: 100 });
    });
  });

  describe("writeJson", () => {
    it("writes JSON file asynchronously", async () => {
      const filePath = path.join(testDir, "asyncoutput.json");
      const data = { name: "async", value: 100 };

      await writeJson(filePath, data);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
      expect(content).toEqual(data);
    });
  });

  //#endregion

  //#region copy

  describe("copySync", () => {
    it("copies file", () => {
      const source = path.join(testDir, "source.txt");
      const target = path.join(testDir, "target.txt");
      fs.writeFileSync(source, "source content");

      copySync(source, target);

      expect(fs.readFileSync(target, "utf-8")).toBe("source content");
    });

    it("copies directory (recursive)", () => {
      const sourceDir = path.join(testDir, "sourceDir");
      const targetDir = path.join(testDir, "targetDir");
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, "file.txt"), "content");
      fs.mkdirSync(path.join(sourceDir, "sub"));
      fs.writeFileSync(path.join(sourceDir, "sub/nested.txt"), "nested");

      copySync(sourceDir, targetDir);

      expect(fs.existsSync(path.join(targetDir, "file.txt"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "sub/nested.txt"))).toBe(true);
    });

    it("ignores nonexistent source", () => {
      const source = path.join(testDir, "nonexistent");
      const target = path.join(testDir, "target");

      expect(() => copySync(source, target)).not.toThrow();
    });

    it("selectively copies with filter option", () => {
      const sourceDir = path.join(testDir, "filterSource");
      const targetDir = path.join(testDir, "filterTarget");
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, "include.txt"), "include");
      fs.writeFileSync(path.join(sourceDir, "exclude.log"), "exclude");

      copySync(sourceDir, targetDir, (p) => !p.endsWith(".log"));

      expect(fs.existsSync(path.join(targetDir, "include.txt"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "exclude.log"))).toBe(false);
    });

    it("skips subdirectories and items when filter excludes directory", () => {
      const sourceDir = path.join(testDir, "filterDirSource");
      const targetDir = path.join(testDir, "filterDirTarget");
      fs.mkdirSync(sourceDir);
      fs.mkdirSync(path.join(sourceDir, "excluded"));
      fs.mkdirSync(path.join(sourceDir, "included"));
      fs.writeFileSync(path.join(sourceDir, "excluded", "nested.txt"), "nested");
      fs.writeFileSync(path.join(sourceDir, "included", "nested.txt"), "nested");

      copySync(sourceDir, targetDir, (p) => !p.includes("excluded"));

      expect(fs.existsSync(path.join(targetDir, "excluded"))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, "excluded", "nested.txt"))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, "included"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "included", "nested.txt"))).toBe(true);
    });
  });

  describe("copy", () => {
    it("copies file asynchronously", async () => {
      const source = path.join(testDir, "asyncSource.txt");
      const target = path.join(testDir, "asyncTarget.txt");
      fs.writeFileSync(source, "async source content");

      await copy(source, target);

      expect(fs.readFileSync(target, "utf-8")).toBe("async source content");
    });

    it("selectively copies with filter option asynchronously", async () => {
      const sourceDir = path.join(testDir, "asyncFilterSource");
      const targetDir = path.join(testDir, "asyncFilterTarget");
      fs.mkdirSync(sourceDir);
      fs.writeFileSync(path.join(sourceDir, "keep.ts"), "keep");
      fs.writeFileSync(path.join(sourceDir, "skip.js"), "skip");

      await copy(sourceDir, targetDir, (p) => p.endsWith(".ts"));

      expect(fs.existsSync(path.join(targetDir, "keep.ts"))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, "skip.js"))).toBe(false);
    });
  });

  //#endregion

  //#region readdir

  describe("readdirSync", () => {
    it("reads directory contents", () => {
      fs.writeFileSync(path.join(testDir, "file1.txt"), "");
      fs.writeFileSync(path.join(testDir, "file2.txt"), "");
      fs.mkdirSync(path.join(testDir, "subdir"));

      const entries = readdirSync(testDir);

      expect(entries).toContain("file1.txt");
      expect(entries).toContain("file2.txt");
      expect(entries).toContain("subdir");
    });
  });

  describe("readdir", () => {
    it("reads directory contents asynchronously", async () => {
      fs.writeFileSync(path.join(testDir, "async1.txt"), "");
      fs.writeFileSync(path.join(testDir, "async2.txt"), "");

      const entries = await readdir(testDir);

      expect(entries).toContain("async1.txt");
      expect(entries).toContain("async2.txt");
    });
  });

  //#endregion

  //#region stat

  describe("statSync", () => {
    it("gets file information", () => {
      const filePath = path.join(testDir, "statfile.txt");
      fs.writeFileSync(filePath, "content");

      const result = statSync(filePath);

      expect(result.isFile()).toBe(true);
      expect(result.size).toBeGreaterThan(0);
    });

  });

  describe("stat", () => {
    it("gets file information asynchronously", async () => {
      const filePath = path.join(testDir, "asyncstatfile.txt");
      fs.writeFileSync(filePath, "async content");

      const result = await stat(filePath);

      expect(result.isFile()).toBe(true);
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe("lstatSync", () => {
    it("returns symbolic link information for symbolic links", () => {
      const targetPath = path.join(testDir, "target.txt");
      const linkPath = path.join(testDir, "link.txt");
      fs.writeFileSync(targetPath, "target content");
      fs.symlinkSync(targetPath, linkPath);

      const lstatResult = lstatSync(linkPath);
      const statResult = statSync(linkPath);

      // lstat returns information about the symbolic link itself
      expect(lstatResult.isSymbolicLink()).toBe(true);
      expect(lstatResult.isFile()).toBe(false);

      // stat returns information about the target of the link
      expect(statResult.isSymbolicLink()).toBe(false);
      expect(statResult.isFile()).toBe(true);
    });
  });

  describe("lstat", () => {
    it("returns symbolic link information asynchronously", async () => {
      const targetPath = path.join(testDir, "async-target.txt");
      const linkPath = path.join(testDir, "async-link.txt");
      fs.writeFileSync(targetPath, "target content");
      fs.symlinkSync(targetPath, linkPath);

      const lstatResult = await lstat(linkPath);
      const statResult = await stat(linkPath);

      // lstat returns information about the symbolic link itself
      expect(lstatResult.isSymbolicLink()).toBe(true);
      expect(lstatResult.isFile()).toBe(false);

      // stat returns information about the target of the link
      expect(statResult.isSymbolicLink()).toBe(false);
      expect(statResult.isFile()).toBe(true);
    });
  });

  //#endregion

  //#region glob

  describe("globSync", () => {
    it("searches files by glob pattern", () => {
      fs.writeFileSync(path.join(testDir, "a.txt"), "");
      fs.writeFileSync(path.join(testDir, "b.txt"), "");
      fs.writeFileSync(path.join(testDir, "c.js"), "");

      const txtFiles = globSync(path.join(testDir, "*.txt"));

      expect(txtFiles.length).toBe(2);
      expect(txtFiles.some((f) => f.endsWith("a.txt"))).toBe(true);
      expect(txtFiles.some((f) => f.endsWith("b.txt"))).toBe(true);
    });

    it("searches nested directories", () => {
      fs.mkdirSync(path.join(testDir, "nested"));
      fs.writeFileSync(path.join(testDir, "nested/deep.txt"), "");

      const files = globSync(path.join(testDir, "**/*.txt"));

      expect(files.some((f) => f.endsWith("deep.txt"))).toBe(true);
    });

    it("includes hidden files with dot: true option", () => {
      fs.writeFileSync(path.join(testDir, ".hidden"), "");
      fs.writeFileSync(path.join(testDir, "visible"), "");

      const withoutDot = globSync(path.join(testDir, "*"));
      const withDot = globSync(path.join(testDir, "*"), { dot: true });

      expect(withoutDot.some((f) => f.endsWith(".hidden"))).toBe(false);
      expect(withDot.some((f) => f.endsWith(".hidden"))).toBe(true);
    });
  });

  describe("glob", () => {
    it("searches files asynchronously by glob pattern", async () => {
      fs.writeFileSync(path.join(testDir, "async.txt"), "");

      const files = await glob(path.join(testDir, "*.txt"));

      expect(files.length).toBeGreaterThan(0);
    });
  });

  //#endregion

  //#region clearEmptyDirectoryAsync

  describe("clearEmptyDirectory", () => {
    it("recursively deletes empty directories", async () => {
      const emptyDir = path.join(testDir, "empty/nested/deep");
      fs.mkdirSync(emptyDir, { recursive: true });

      await clearEmptyDirectory(path.join(testDir, "empty"));

      expect(fs.existsSync(path.join(testDir, "empty"))).toBe(false);
    });

    it("keeps directories with files", async () => {
      const dirWithFile = path.join(testDir, "notempty");
      fs.mkdirSync(dirWithFile);
      fs.writeFileSync(path.join(dirWithFile, "file.txt"), "content");

      await clearEmptyDirectory(dirWithFile);

      expect(fs.existsSync(dirWithFile)).toBe(true);
    });
  });

  //#endregion

  //#region findAllParentChildPaths

  describe("findAllParentChildPathsSync", () => {
    it("finds specific file in parent directories", () => {
      const deepDir = path.join(testDir, "a/b/c");
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, "marker.txt"), "");
      fs.writeFileSync(path.join(testDir, "a/marker.txt"), "");

      const results = findAllParentChildPathsSync("marker.txt", deepDir, testDir);

      expect(results.length).toBe(2);
    });

    it("returns empty array when no matching file is found", () => {
      const deepDir = path.join(testDir, "a/b/c");
      fs.mkdirSync(deepDir, { recursive: true });

      const results = findAllParentChildPathsSync("nonexistent-file.txt", deepDir, testDir);

      expect(results).toEqual([]);
    });
  });

  describe("findAllParentChildPaths", () => {
    it("finds specific file in parent directories asynchronously", async () => {
      const deepDir = path.join(testDir, "x/y/z");
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, "config.json"), "");
      fs.writeFileSync(path.join(testDir, "x/config.json"), "");

      const results = await findAllParentChildPaths("config.json", deepDir, testDir);

      expect(results.length).toBe(2);
    });

    it("returns empty array asynchronously when no matching file is found", async () => {
      const deepDir = path.join(testDir, "x/y/z");
      fs.mkdirSync(deepDir, { recursive: true });

      const results = await findAllParentChildPaths("nonexistent-file.txt", deepDir, testDir);

      expect(results).toEqual([]);
    });
  });

  //#endregion

  //#region Error Cases

  describe("error cases", () => {
    it("includes path information in SdError when reading nonexistent file", () => {
      const filePath = path.join(testDir, "nonexistent.txt");
      expect(() => readSync(filePath)).toThrow(SdError);
      try {
        readSync(filePath);
      } catch (err) {
        expect((err as Error).message).toContain(filePath);
      }
    });

    it("includes path information in SdError when reading nonexistent file asynchronously", async () => {
      const filePath = path.join(testDir, "nonexistent.txt");
      await expect(read(filePath)).rejects.toThrow(SdError);
      try {
        await read(filePath);
      } catch (err) {
        expect((err as Error).message).toContain(filePath);
      }
    });

    it("throws error when reading nonexistent directory", () => {
      expect(() => readdirSync(path.join(testDir, "nonexistent"))).toThrow();
    });

    it("throws error when stat nonexistent file", () => {
      expect(() => statSync(path.join(testDir, "nonexistent.txt"))).toThrow();
    });

    it("includes path and content information in SdError when reading invalid JSON", () => {
      const filePath = path.join(testDir, "invalid.json");
      const content = "{ invalid json }";
      fs.writeFileSync(filePath, content);

      expect(() => readJsonSync(filePath)).toThrow(SdError);
      try {
        readJsonSync(filePath);
      } catch (err) {
        expect((err as Error).message).toContain(filePath);
        expect((err as Error).message).toContain(content);
      }
    });

    it("includes path and content information in SdError when reading invalid JSON asynchronously", async () => {
      const filePath = path.join(testDir, "invalid-async.json");
      const content = "{ invalid json }";
      fs.writeFileSync(filePath, content);

      await expect(readJson(filePath)).rejects.toThrow(SdError);
      try {
        await readJson(filePath);
      } catch (err) {
        expect((err as Error).message).toContain(filePath);
        expect((err as Error).message).toContain(content);
      }
    });
  });

  //#endregion
});
