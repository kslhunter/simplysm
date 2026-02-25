import { describe, it, expect } from "vitest";
import { ZipArchive } from "@simplysm/core-common";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("ZipArchive", () => {
  //#region write + compress

  describe("write + compress", () => {
    it("Adds files with write and creates ZIP with compress", async () => {
      const zip = new ZipArchive();
      zip.write("file1.txt", encoder.encode("content 1"));
      zip.write("file2.txt", encoder.encode("content 2"));

      const zipBuffer = await zip.compress();

      expect(zipBuffer instanceof Uint8Array).toBe(true);
      expect(zipBuffer.length).toBeGreaterThan(0);
    });

    it("Handles filenames with special characters", async () => {
      const zip = new ZipArchive();
      zip.write("파일 이름.txt", encoder.encode("한글 내용"));
      zip.write("file (1).txt", encoder.encode("괄호 포함"));
      zip.write("file@#$.txt", encoder.encode("특수문자"));

      const zipBuffer = await zip.compress();
      const result = new ZipArchive(zipBuffer);

      const content1 = await result.get("파일 이름.txt");
      const content2 = await result.get("file (1).txt");
      const content3 = await result.get("file@#$.txt");

      expect(content1 != null ? decoder.decode(content1) : undefined).toBe("한글 내용");
      expect(content2 != null ? decoder.decode(content2) : undefined).toBe("괄호 포함");
      expect(content3 != null ? decoder.decode(content3) : undefined).toBe("특수문자");
    });

    it("Can compress empty ZIP", async () => {
      const zip = new ZipArchive();
      const zipBuffer = await zip.compress();

      expect(zipBuffer instanceof Uint8Array).toBe(true);
    });

    it("Overwrites when writing same filename multiple times", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("first"));
      zip.write("file.txt", encoder.encode("second"));

      const zipBuffer = await zip.compress();
      const result = new ZipArchive(zipBuffer);
      const content = await result.get("file.txt");

      expect(content != null ? decoder.decode(content) : undefined).toBe("second");
    });
  });

  //#endregion

  //#region extractAll

  describe("extractAll", () => {
    it("Extracts all compressed files", async () => {
      const zip = new ZipArchive();
      zip.write("file1.txt", encoder.encode("content 1"));
      zip.write("file2.txt", encoder.encode("content 2"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const files = await result.extractAll();

      expect(files.size).toBe(2);
      expect(
        files.get("file1.txt") != null ? decoder.decode(files.get("file1.txt")) : undefined,
      ).toBe("content 1");
      expect(
        files.get("file2.txt") != null ? decoder.decode(files.get("file2.txt")) : undefined,
      ).toBe("content 2");
    });

    it("Calls progress callback", async () => {
      const zip = new ZipArchive();
      zip.write("file1.txt", encoder.encode("a".repeat(1000)));
      zip.write("file2.txt", encoder.encode("b".repeat(1000)));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const progressCalls: Array<{ fileName: string; extractedSize: number }> = [];

      await result.extractAll((progress) => {
        progressCalls.push({
          fileName: progress.fileName,
          extractedSize: progress.extractedSize,
        });
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls.some((p) => p.fileName === "file1.txt")).toBe(true);
      expect(progressCalls.some((p) => p.fileName === "file2.txt")).toBe(true);
    });

    it("Returns empty cache when reader is not available", async () => {
      const zip = new ZipArchive();
      const files = await zip.extractAll();

      expect(files.size).toBe(0);
    });
  });

  //#endregion

  //#region get

  describe("get", () => {
    it("Extracts specific file only", async () => {
      const zip = new ZipArchive();
      zip.write("file1.txt", encoder.encode("content 1"));
      zip.write("file2.txt", encoder.encode("content 2"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const content = await result.get("file1.txt");

      expect(content != null ? decoder.decode(content) : undefined).toBe("content 1");
    });

    it("Returns undefined for non-existent file", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const content = await result.get("nonexistent.txt");

      expect(content).toBe(undefined);
    });

    it("Does not re-extract cached file", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const content1 = await result.get("file.txt");
      const content2 = await result.get("file.txt");

      expect(content1).toBe(content2); // Same reference
    });

    it("Returns undefined when reader is not available", async () => {
      const zip = new ZipArchive();
      const content = await zip.get("file.txt");

      expect(content).toBe(undefined);
    });
  });

  //#endregion

  //#region exists

  describe("exists", () => {
    it("Checks file existence", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const exists = await result.exists("file.txt");
      const notExists = await result.exists("nonexistent.txt");

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it("Returns true for cached file", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      await result.get("file.txt"); // Load into cache
      const exists = await result.exists("file.txt");

      expect(exists).toBe(true);
    });

    it("Returns false when reader is not available", async () => {
      const zip = new ZipArchive();
      const exists = await zip.exists("file.txt");

      expect(exists).toBe(false);
    });
  });

  //#endregion

  //#region close

  describe("close", () => {
    it("Closes reader", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      // Call extractAll to load into cache
      await result.extractAll();
      await result.close();

      // Cached data is still available after close
      const content = await result.get("file.txt");
      expect(content != null ? decoder.decode(content) : undefined).toBe("content");
    });

    it("Works without error when reader is not available", async () => {
      const zip = new ZipArchive();
      await expect(zip.close()).resolves.not.toThrow();
    });

    it("Automatically closes with await using statement", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      {
        await using result = new ZipArchive(zipBuffer);
        await result.extractAll();
        const content = await result.get("file.txt");
        expect(decoder.decode(content)).toBe("content");
      } // close called automatically when await using block ends
    });
  });

  //#endregion
});
