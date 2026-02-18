import { describe, it, expect, vi, beforeEach } from "vitest";
import { FtpStorageClient } from "../src/clients/ftp-storage-client";

// basic-ftp 모듈 모킹
const mockAccess = vi.fn().mockResolvedValue(undefined);
const mockEnsureDir = vi.fn().mockResolvedValue(undefined);
const mockRename = vi.fn().mockResolvedValue(undefined);
const mockSize = vi.fn().mockResolvedValue(100);
const mockList = vi.fn().mockResolvedValue([
  { name: "file.txt", isFile: true },
  { name: "dir", isFile: false },
]);
const mockDownloadTo = vi.fn().mockImplementation((writable) => {
  writable.emit("data", new TextEncoder().encode("test content"));
  return Promise.resolve();
});
const mockRemove = vi.fn().mockResolvedValue(undefined);
const mockUploadFrom = vi.fn().mockResolvedValue(undefined);
const mockUploadFromDir = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn();

vi.mock("basic-ftp", () => {
  return {
    default: {
      Client: class MockClient {
        access = mockAccess;
        ensureDir = mockEnsureDir;
        rename = mockRename;
        size = mockSize;
        list = mockList;
        downloadTo = mockDownloadTo;
        remove = mockRemove;
        uploadFrom = mockUploadFrom;
        uploadFromDir = mockUploadFromDir;
        close = mockClose;
      },
    },
  };
});

describe("FtpStorageClient", () => {
  let client: FtpStorageClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new FtpStorageClient();
  });

  describe("connect", () => {
    it("연결 설정으로 접속해야 함", async () => {
      await client.connect({
        host: "ftp.example.com",
        port: 21,
        user: "user",
        pass: "pass",
      });

      expect(mockAccess).toHaveBeenCalledWith({
        host: "ftp.example.com",
        port: 21,
        user: "user",
        password: "pass",
        secure: false,
      });
    });

    it("secure 모드로 접속해야 함", async () => {
      const secureClient = new FtpStorageClient(true);
      await secureClient.connect({ host: "ftp.example.com" });

      expect(mockAccess).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
    });

    it("이미 연결된 상태에서 connect 호출 시 에러", async () => {
      await client.connect({ host: "test" });
      await expect(client.connect({ host: "test" })).rejects.toThrow(
        "이미 FTP 서버에 연결되어 있습니다. 먼저 close()를 호출하세요.",
      );
    });

    it("연결 실패 시 클라이언트를 정리해야 함", async () => {
      mockAccess.mockRejectedValueOnce(new Error("Auth failed"));
      await expect(client.connect({ host: "test" })).rejects.toThrow("Auth failed");
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("연결 전 메서드 호출", () => {
    it("연결 전 mkdir 호출 시 에러", async () => {
      await expect(client.mkdir("/test")).rejects.toThrow("FTP 서버에 연결되어있지 않습니다.");
    });

    it("연결 전 rename 호출 시 에러", async () => {
      await expect(client.rename("/from", "/to")).rejects.toThrow(
        "FTP 서버에 연결되어있지 않습니다.",
      );
    });

    it("연결 전 readdir 호출 시 에러", async () => {
      await expect(client.readdir("/")).rejects.toThrow("FTP 서버에 연결되어있지 않습니다.");
    });
  });

  describe("mkdir", () => {
    it("디렉토리를 생성해야 함", async () => {
      await client.connect({ host: "test" });
      await client.mkdir("/test/dir");

      expect(mockEnsureDir).toHaveBeenCalledWith("/test/dir");
    });
  });

  describe("rename", () => {
    it("파일/디렉토리 이름을 변경해야 함", async () => {
      await client.connect({ host: "test" });
      await client.rename("/from", "/to");

      expect(mockRename).toHaveBeenCalledWith("/from", "/to");
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
  });

  describe("exists", () => {
    it("파일이 존재하면 true 반환 (size로 확인)", async () => {
      await client.connect({ host: "test" });
      const result = await client.exists("/path/file.txt");

      expect(mockSize).toHaveBeenCalledWith("/path/file.txt");
      expect(result).toBe(true);
    });

    it("디렉토리가 존재하면 true 반환 (list로 확인)", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      await client.connect({ host: "test" });
      const result = await client.exists("/path/dir");

      expect(mockList).toHaveBeenCalledWith("/path");
      expect(result).toBe(true);
    });

    it("파일이 존재하지 않으면 false 반환", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      mockList.mockResolvedValueOnce([]);
      await client.connect({ host: "test" });
      const result = await client.exists("/path/nonexistent.txt");

      expect(result).toBe(false);
    });

    it("에러 발생 시 false 반환", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      mockList.mockRejectedValueOnce(new Error("Not found"));
      await client.connect({ host: "test" });
      const result = await client.exists("/path/error.txt");

      expect(result).toBe(false);
    });

    it("루트 디렉토리 파일 존재 확인", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      await client.connect({ host: "test" });
      const result = await client.exists("/file.txt");

      expect(mockList).toHaveBeenCalledWith("/");
      expect(result).toBe(true);
    });

    it("슬래시 없는 경로 존재 확인", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      await client.connect({ host: "test" });
      const result = await client.exists("file.txt");

      expect(mockList).toHaveBeenCalledWith("/");
      expect(result).toBe(true);
    });
  });

  describe("remove", () => {
    it("파일을 삭제해야 함", async () => {
      await client.connect({ host: "test" });
      await client.remove("/file.txt");

      expect(mockRemove).toHaveBeenCalledWith("/file.txt");
    });
  });

  describe("put", () => {
    it("로컬 경로에서 업로드해야 함", async () => {
      await client.connect({ host: "test" });
      await client.put("/local/file.txt", "/remote/file.txt");

      expect(mockUploadFrom).toHaveBeenCalledWith("/local/file.txt", "/remote/file.txt");
    });

    it("Uint8Array에서 업로드해야 함", async () => {
      await client.connect({ host: "test" });
      const bytes = new TextEncoder().encode("content");
      await client.put(bytes, "/remote/file.txt");

      expect(mockUploadFrom).toHaveBeenCalled();
    });
  });

  describe("uploadDir", () => {
    it("디렉토리를 업로드해야 함", async () => {
      await client.connect({ host: "test" });
      await client.uploadDir("/local/dir", "/remote/dir");

      expect(mockUploadFromDir).toHaveBeenCalledWith("/local/dir", "/remote/dir");
    });
  });

  describe("close", () => {
    it("연결 전 close 호출 시 에러 없이 종료", async () => {
      await expect(client.close()).resolves.toBeUndefined();
    });

    it("연결을 닫아야 함", async () => {
      await client.connect({ host: "test" });
      await client.close();

      expect(mockClose).toHaveBeenCalled();
    });

    it("close 후 메서드 호출 시 에러", async () => {
      await client.connect({ host: "test" });
      await client.close();

      await expect(client.mkdir("/test")).rejects.toThrow("FTP 서버에 연결되어있지 않습니다.");
    });

    it("close 후 재연결이 가능해야 함", async () => {
      await client.connect({ host: "test" });
      await client.close();
      await client.connect({ host: "test" });

      expect(mockAccess).toHaveBeenCalledTimes(2);
    });
  });
});
