import { describe, it, expect } from "vitest";
import { ZipArchive } from "@simplysm/core-common";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("ZipArchive", () => {
  //#region write + compress

  describe("write + compress", () => {
    it("write로 파일을 추가하고 compress로 ZIP을 생성한다", async () => {
      const zip = new ZipArchive();
      zip.write("file1.txt", encoder.encode("content 1"));
      zip.write("file2.txt", encoder.encode("content 2"));

      const zipBuffer = await zip.compress();

      expect(zipBuffer instanceof Uint8Array).toBe(true);
      expect(zipBuffer.length).toBeGreaterThan(0);
    });

    it("특수 문자가 포함된 파일명을 처리한다", async () => {
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

    it("빈 ZIP도 압축할 수 있다", async () => {
      const zip = new ZipArchive();
      const zipBuffer = await zip.compress();

      expect(zipBuffer instanceof Uint8Array).toBe(true);
    });

    it("같은 파일명으로 여러 번 write하면 덮어쓴다", async () => {
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
    it("압축된 모든 파일을 추출한다", async () => {
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

    it("진행률 콜백을 호출한다", async () => {
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

    it("reader가 없으면 빈 캐시를 반환한다", async () => {
      const zip = new ZipArchive();
      const files = await zip.extractAll();

      expect(files.size).toBe(0);
    });
  });

  //#endregion

  //#region get

  describe("get", () => {
    it("특정 파일만 추출한다", async () => {
      const zip = new ZipArchive();
      zip.write("file1.txt", encoder.encode("content 1"));
      zip.write("file2.txt", encoder.encode("content 2"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const content = await result.get("file1.txt");

      expect(content != null ? decoder.decode(content) : undefined).toBe("content 1");
    });

    it("없는 파일은 undefined를 반환한다", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const content = await result.get("nonexistent.txt");

      expect(content).toBe(undefined);
    });

    it("캐시된 파일은 재추출하지 않는다", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const content1 = await result.get("file.txt");
      const content2 = await result.get("file.txt");

      expect(content1).toBe(content2); // 같은 참조
    });

    it("reader가 없으면 undefined를 반환한다", async () => {
      const zip = new ZipArchive();
      const content = await zip.get("file.txt");

      expect(content).toBe(undefined);
    });
  });

  //#endregion

  //#region exists

  describe("exists", () => {
    it("파일 존재 여부를 확인한다", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      const exists = await result.exists("file.txt");
      const notExists = await result.exists("nonexistent.txt");

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it("캐시된 파일은 true를 반환한다", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      await result.get("file.txt"); // 캐시에 로드
      const exists = await result.exists("file.txt");

      expect(exists).toBe(true);
    });

    it("reader가 없으면 false를 반환한다", async () => {
      const zip = new ZipArchive();
      const exists = await zip.exists("file.txt");

      expect(exists).toBe(false);
    });
  });

  //#endregion

  //#region close

  describe("close", () => {
    it("reader를 닫는다", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      const result = new ZipArchive(zipBuffer);
      // extractAll 호출하여 캐시에 로드
      await result.extractAll();
      await result.close();

      // close 이후에도 캐시된 데이터는 사용 가능
      const content = await result.get("file.txt");
      expect(content != null ? decoder.decode(content) : undefined).toBe("content");
    });

    it("reader가 없어도 에러 없이 동작한다", async () => {
      const zip = new ZipArchive();
      await expect(zip.close()).resolves.not.toThrow();
    });

    it("await using으로 자동 close된다", async () => {
      const zip = new ZipArchive();
      zip.write("file.txt", encoder.encode("content"));
      const zipBuffer = await zip.compress();

      {
        await using result = new ZipArchive(zipBuffer);
        await result.extractAll();
        const content = await result.get("file.txt");
        expect(decoder.decode(content)).toBe("content");
      } // await using 블록 종료 시 close 자동 호출
    });
  });

  //#endregion
});
