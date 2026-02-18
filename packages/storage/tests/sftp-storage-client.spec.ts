import { describe, it, expect, vi, beforeEach } from "vitest";
import { SftpStorageClient } from "../src/clients/sftp-storage-client";

// ssh2-sftp-client 모듈 모킹
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockRename = vi.fn().mockResolvedValue(undefined);
const mockExists = vi.fn().mockResolvedValue("-");
const mockList = vi.fn().mockResolvedValue([
  { name: "file.txt", type: "-" },
  { name: "dir", type: "d" },
]);
const mockGet = vi.fn().mockResolvedValue(new TextEncoder().encode("test content"));
const mockDelete = vi.fn().mockResolvedValue(undefined);
const mockPut = vi.fn().mockResolvedValue(undefined);
const mockFastPut = vi.fn().mockResolvedValue(undefined);
const mockUploadDir = vi.fn().mockResolvedValue(undefined);
const mockEnd = vi.fn().mockResolvedValue(undefined);

vi.mock("ssh2-sftp-client", () => {
  return {
    default: class MockSftpClient {
      connect = mockConnect;
      mkdir = mockMkdir;
      rename = mockRename;
      exists = mockExists;
      list = mockList;
      get = mockGet;
      delete = mockDelete;
      put = mockPut;
      fastPut = mockFastPut;
      uploadDir = mockUploadDir;
      end = mockEnd;
    },
  };
});

describe("SftpStorageClient", () => {
  let client: SftpStorageClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new SftpStorageClient();
  });

  describe("connect", () => {
    it("연결 설정으로 접속해야 함", async () => {
      await client.connect({
        host: "sftp.example.com",
        port: 22,
        user: "user",
        pass: "pass",
      });

      expect(mockConnect).toHaveBeenCalledWith({
        host: "sftp.example.com",
        port: 22,
        username: "user",
        password: "pass",
      });
    });

    it("이미 연결된 상태에서 connect 호출 시 에러", async () => {
      await client.connect({ host: "test" });
      await expect(client.connect({ host: "test" })).rejects.toThrow(
        "이미 SFTP 서버에 연결되어 있습니다. 먼저 close()를 호출하세요.",
      );
    });

    it("연결 실패 시 클라이언트를 정리해야 함", async () => {
      mockConnect.mockRejectedValueOnce(new Error("Auth failed"));
      await expect(client.connect({ host: "test", pass: "wrong" })).rejects.toThrow("Auth failed");
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe("연결 전 메서드 호출", () => {
    it("연결 전 mkdir 호출 시 에러", async () => {
      await expect(client.mkdir("/test")).rejects.toThrow("SFTP 서버에 연결되어있지 않습니다.");
    });

    it("연결 전 rename 호출 시 에러", async () => {
      await expect(client.rename("/from", "/to")).rejects.toThrow(
        "SFTP 서버에 연결되어있지 않습니다.",
      );
    });

    it("연결 전 readdir 호출 시 에러", async () => {
      await expect(client.readdir("/")).rejects.toThrow("SFTP 서버에 연결되어있지 않습니다.");
    });
  });

  describe("mkdir", () => {
    it("디렉토리를 생성해야 함", async () => {
      await client.connect({ host: "test" });
      await client.mkdir("/test/dir");

      expect(mockMkdir).toHaveBeenCalledWith("/test/dir", true);
    });
  });

  describe("rename", () => {
    it("파일/디렉토리 이름을 변경해야 함", async () => {
      await client.connect({ host: "test" });
      await client.rename("/from", "/to");

      expect(mockRename).toHaveBeenCalledWith("/from", "/to");
    });
  });

  describe("exists", () => {
    it("파일이 존재하면 true 반환", async () => {
      await client.connect({ host: "test" });
      const result = await client.exists("/file.txt");

      expect(result).toBe(true);
    });

    it("파일이 존재하지 않으면 false 반환", async () => {
      mockExists.mockResolvedValueOnce(false);
      await client.connect({ host: "test" });
      const result = await client.exists("/nonexistent.txt");

      expect(result).toBe(false);
    });

    it("디렉토리가 존재하면 true 반환 (type='d')", async () => {
      mockExists.mockResolvedValueOnce("d");
      await client.connect({ host: "test" });
      const result = await client.exists("/directory");

      expect(result).toBe(true);
    });

    it("심볼릭 링크가 존재하면 true 반환 (type='l')", async () => {
      mockExists.mockResolvedValueOnce("l");
      await client.connect({ host: "test" });
      const result = await client.exists("/symlink");

      expect(result).toBe(true);
    });

    it("에러 발생 시 false 반환", async () => {
      mockExists.mockRejectedValueOnce(new Error("Network error"));
      await client.connect({ host: "test" });
      const result = await client.exists("/test.txt");

      expect(result).toBe(false);
    });
  });

  describe("readdir", () => {
    it("디렉토리 목록을 FileInfo 배열로 반환해야 함", async () => {
      await client.connect({ host: "test" });
      const result = await client.readdir("/");

      expect(result).toEqual([
        { name: "file.txt", isFile: true },
        { name: "dir", isFile: false },
      ]);
    });
  });

  describe("readFile", () => {
    it("파일 내용을 Uint8Array로 반환해야 함", async () => {
      await client.connect({ host: "test" });
      const result = await client.readFile("/file.txt");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result)).toBe("test content");
    });

    it("문자열 결과를 Uint8Array로 변환해야 함", async () => {
      mockGet.mockResolvedValueOnce("string content");
      await client.connect({ host: "test" });
      const result = await client.readFile("/file.txt");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result)).toBe("string content");
    });

    it("예상치 못한 타입이면 에러 발생", async () => {
      mockGet.mockResolvedValueOnce({ unexpected: "object" });
      await client.connect({ host: "test" });

      await expect(client.readFile("/file.txt")).rejects.toThrow("예상치 못한 응답 타입입니다.");
    });
  });

  describe("remove", () => {
    it("파일을 삭제해야 함", async () => {
      await client.connect({ host: "test" });
      await client.remove("/file.txt");

      expect(mockDelete).toHaveBeenCalledWith("/file.txt");
    });
  });

  describe("put", () => {
    it("로컬 경로에서 fastPut으로 업로드해야 함", async () => {
      await client.connect({ host: "test" });
      await client.put("/local/file.txt", "/remote/file.txt");

      expect(mockFastPut).toHaveBeenCalledWith("/local/file.txt", "/remote/file.txt");
    });

    it("Uint8Array에서 put으로 업로드해야 함", async () => {
      await client.connect({ host: "test" });
      const bytes = new TextEncoder().encode("content");
      await client.put(bytes, "/remote/file.txt");

      // Buffer.from으로 변환되어 전달됨
      expect(mockPut).toHaveBeenCalled();
    });
  });

  describe("uploadDir", () => {
    it("디렉토리를 업로드해야 함", async () => {
      await client.connect({ host: "test" });
      await client.uploadDir("/local/dir", "/remote/dir");

      expect(mockUploadDir).toHaveBeenCalledWith("/local/dir", "/remote/dir");
    });
  });

  describe("close", () => {
    it("연결 전 close 호출 시 에러 없이 종료", async () => {
      await expect(client.close()).resolves.toBeUndefined();
    });

    it("연결을 닫아야 함", async () => {
      await client.connect({ host: "test" });
      await client.close();

      expect(mockEnd).toHaveBeenCalled();
    });

    it("close 후 메서드 호출 시 에러", async () => {
      await client.connect({ host: "test" });
      await client.close();

      await expect(client.mkdir("/test")).rejects.toThrow("SFTP 서버에 연결되어있지 않습니다.");
    });

    it("close 후 재연결이 가능해야 함", async () => {
      await client.connect({ host: "test" });
      await client.close();
      await client.connect({ host: "test" });

      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });
});
