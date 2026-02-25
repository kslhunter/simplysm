import { describe, it, expect, vi, beforeEach } from "vitest";
import { SftpStorageClient } from "../src/clients/sftp-storage-client";

// Mock ssh2-sftp-client module
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
    it("Should connect with connection settings", async () => {
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

    it("Should throw error when connect is called on already connected client", async () => {
      await client.connect({ host: "test" });
      await expect(client.connect({ host: "test" })).rejects.toThrow(
        "SFTP server is already connected. Please call close() first.",
      );
    });

    it("Should clean up client on connection failure", async () => {
      mockConnect.mockRejectedValueOnce(new Error("Auth failed"));
      await expect(client.connect({ host: "test", pass: "wrong" })).rejects.toThrow("Auth failed");
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe("Method calls before connection", () => {
    it("Should throw error when mkdir is called before connection", async () => {
      await expect(client.mkdir("/test")).rejects.toThrow("Not connected to SFTP server.");
    });

    it("Should throw error when rename is called before connection", async () => {
      await expect(client.rename("/from", "/to")).rejects.toThrow(
        "Not connected to SFTP server.",
      );
    });

    it("Should throw error when readdir is called before connection", async () => {
      await expect(client.readdir("/")).rejects.toThrow("Not connected to SFTP server.");
    });
  });

  describe("mkdir", () => {
    it("Should create directory", async () => {
      await client.connect({ host: "test" });
      await client.mkdir("/test/dir");

      expect(mockMkdir).toHaveBeenCalledWith("/test/dir", true);
    });
  });

  describe("rename", () => {
    it("Should rename file/directory", async () => {
      await client.connect({ host: "test" });
      await client.rename("/from", "/to");

      expect(mockRename).toHaveBeenCalledWith("/from", "/to");
    });
  });

  describe("exists", () => {
    it("Should return true if file exists", async () => {
      await client.connect({ host: "test" });
      const result = await client.exists("/file.txt");

      expect(result).toBe(true);
    });

    it("Should return false if file does not exist", async () => {
      mockExists.mockResolvedValueOnce(false);
      await client.connect({ host: "test" });
      const result = await client.exists("/nonexistent.txt");

      expect(result).toBe(false);
    });

    it("Should return true if directory exists (type='d')", async () => {
      mockExists.mockResolvedValueOnce("d");
      await client.connect({ host: "test" });
      const result = await client.exists("/directory");

      expect(result).toBe(true);
    });

    it("Should return true if symbolic link exists (type='l')", async () => {
      mockExists.mockResolvedValueOnce("l");
      await client.connect({ host: "test" });
      const result = await client.exists("/symlink");

      expect(result).toBe(true);
    });

    it("Should return false on error", async () => {
      mockExists.mockRejectedValueOnce(new Error("Network error"));
      await client.connect({ host: "test" });
      const result = await client.exists("/test.txt");

      expect(result).toBe(false);
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

    it("Should convert string result to Uint8Array", async () => {
      mockGet.mockResolvedValueOnce("string content");
      await client.connect({ host: "test" });
      const result = await client.readFile("/file.txt");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result)).toBe("string content");
    });

    it("Should throw error on unexpected type", async () => {
      mockGet.mockResolvedValueOnce({ unexpected: "object" });
      await client.connect({ host: "test" });

      await expect(client.readFile("/file.txt")).rejects.toThrow("Unexpected response type.");
    });
  });

  describe("remove", () => {
    it("Should delete file", async () => {
      await client.connect({ host: "test" });
      await client.remove("/file.txt");

      expect(mockDelete).toHaveBeenCalledWith("/file.txt");
    });
  });

  describe("put", () => {
    it("Should upload from local path using fastPut", async () => {
      await client.connect({ host: "test" });
      await client.put("/local/file.txt", "/remote/file.txt");

      expect(mockFastPut).toHaveBeenCalledWith("/local/file.txt", "/remote/file.txt");
    });

    it("Should upload from Uint8Array using put", async () => {
      await client.connect({ host: "test" });
      const bytes = new TextEncoder().encode("content");
      await client.put(bytes, "/remote/file.txt");

      // Converted and passed via Buffer.from
      expect(mockPut).toHaveBeenCalled();
    });
  });

  describe("uploadDir", () => {
    it("Should upload directory", async () => {
      await client.connect({ host: "test" });
      await client.uploadDir("/local/dir", "/remote/dir");

      expect(mockUploadDir).toHaveBeenCalledWith("/local/dir", "/remote/dir");
    });
  });

  describe("close", () => {
    it("Should exit without error when close is called before connection", async () => {
      await expect(client.close()).resolves.toBeUndefined();
    });

    it("Should close connection", async () => {
      await client.connect({ host: "test" });
      await client.close();

      expect(mockEnd).toHaveBeenCalled();
    });

    it("Should throw error when calling method after close", async () => {
      await client.connect({ host: "test" });
      await client.close();

      await expect(client.mkdir("/test")).rejects.toThrow("Not connected to SFTP server.");
    });

    it("Should allow reconnection after close", async () => {
      await client.connect({ host: "test" });
      await client.close();
      await client.connect({ host: "test" });

      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });
});
