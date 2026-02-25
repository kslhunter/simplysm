import { describe, it, expect, vi, beforeEach } from "vitest";
import { FtpStorageClient } from "../src/clients/ftp-storage-client";

// Mock basic-ftp module
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
    it("Should connect with connection settings", async () => {
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

    it("Should connect in secure mode", async () => {
      const secureClient = new FtpStorageClient(true);
      await secureClient.connect({ host: "ftp.example.com" });

      expect(mockAccess).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
    });

    it("Should throw error when connect is called on already connected client", async () => {
      await client.connect({ host: "test" });
      await expect(client.connect({ host: "test" })).rejects.toThrow(
        "FTP server is already connected. Please call close() first.",
      );
    });

    it("Should clean up client on connection failure", async () => {
      mockAccess.mockRejectedValueOnce(new Error("Auth failed"));
      await expect(client.connect({ host: "test" })).rejects.toThrow("Auth failed");
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("Method calls before connection", () => {
    it("Should throw error when mkdir is called before connection", async () => {
      await expect(client.mkdir("/test")).rejects.toThrow("Not connected to FTP server.");
    });

    it("Should throw error when rename is called before connection", async () => {
      await expect(client.rename("/from", "/to")).rejects.toThrow(
        "Not connected to FTP server.",
      );
    });

    it("Should throw error when readdir is called before connection", async () => {
      await expect(client.readdir("/")).rejects.toThrow("Not connected to FTP server.");
    });
  });

  describe("mkdir", () => {
    it("Should create directory", async () => {
      await client.connect({ host: "test" });
      await client.mkdir("/test/dir");

      expect(mockEnsureDir).toHaveBeenCalledWith("/test/dir");
    });
  });

  describe("rename", () => {
    it("Should rename file/directory", async () => {
      await client.connect({ host: "test" });
      await client.rename("/from", "/to");

      expect(mockRename).toHaveBeenCalledWith("/from", "/to");
    });
  });

  describe("readdir", () => {
    it("Should return directory list as FileInfo array", async () => {
      await client.connect({ host: "test" });
      const result = await client.readdir("/");

      expect(result).toEqual([
        { name: "file.txt", isFile: true },
        { name: "dir", isFile: false },
      ]);
    });
  });

  describe("readFile", () => {
    it("Should return file content as Uint8Array", async () => {
      await client.connect({ host: "test" });
      const result = await client.readFile("/file.txt");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result)).toBe("test content");
    });
  });

  describe("exists", () => {
    it("Should return true if file exists (checked via size)", async () => {
      await client.connect({ host: "test" });
      const result = await client.exists("/path/file.txt");

      expect(mockSize).toHaveBeenCalledWith("/path/file.txt");
      expect(result).toBe(true);
    });

    it("Should return true if directory exists (checked via list)", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      await client.connect({ host: "test" });
      const result = await client.exists("/path/dir");

      expect(mockList).toHaveBeenCalledWith("/path");
      expect(result).toBe(true);
    });

    it("Should return false if file does not exist", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      mockList.mockResolvedValueOnce([]);
      await client.connect({ host: "test" });
      const result = await client.exists("/path/nonexistent.txt");

      expect(result).toBe(false);
    });

    it("Should return false on error", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      mockList.mockRejectedValueOnce(new Error("Not found"));
      await client.connect({ host: "test" });
      const result = await client.exists("/path/error.txt");

      expect(result).toBe(false);
    });

    it("Should check file existence in root directory", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      await client.connect({ host: "test" });
      const result = await client.exists("/file.txt");

      expect(mockList).toHaveBeenCalledWith("/");
      expect(result).toBe(true);
    });

    it("Should check file existence for paths without slashes", async () => {
      mockSize.mockRejectedValueOnce(new Error("Not a file"));
      await client.connect({ host: "test" });
      const result = await client.exists("file.txt");

      expect(mockList).toHaveBeenCalledWith("/");
      expect(result).toBe(true);
    });
  });

  describe("remove", () => {
    it("Should delete file", async () => {
      await client.connect({ host: "test" });
      await client.remove("/file.txt");

      expect(mockRemove).toHaveBeenCalledWith("/file.txt");
    });
  });

  describe("put", () => {
    it("Should upload from local path", async () => {
      await client.connect({ host: "test" });
      await client.put("/local/file.txt", "/remote/file.txt");

      expect(mockUploadFrom).toHaveBeenCalledWith("/local/file.txt", "/remote/file.txt");
    });

    it("Should upload from Uint8Array", async () => {
      await client.connect({ host: "test" });
      const bytes = new TextEncoder().encode("content");
      await client.put(bytes, "/remote/file.txt");

      expect(mockUploadFrom).toHaveBeenCalled();
    });
  });

  describe("uploadDir", () => {
    it("Should upload directory", async () => {
      await client.connect({ host: "test" });
      await client.uploadDir("/local/dir", "/remote/dir");

      expect(mockUploadFromDir).toHaveBeenCalledWith("/local/dir", "/remote/dir");
    });
  });

  describe("close", () => {
    it("Should exit without error when close is called before connection", async () => {
      await expect(client.close()).resolves.toBeUndefined();
    });

    it("Should close connection", async () => {
      await client.connect({ host: "test" });
      await client.close();

      expect(mockClose).toHaveBeenCalled();
    });

    it("Should throw error when calling method after close", async () => {
      await client.connect({ host: "test" });
      await client.close();

      await expect(client.mkdir("/test")).rejects.toThrow("Not connected to FTP server.");
    });

    it("Should allow reconnection after close", async () => {
      await client.connect({ host: "test" });
      await client.close();
      await client.connect({ host: "test" });

      expect(mockAccess).toHaveBeenCalledTimes(2);
    });
  });
});
