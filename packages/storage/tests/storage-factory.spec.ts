import { describe, it, expect, vi, beforeEach } from "vitest";
import { StorageFactory } from "../src/storage-factory";

// 모킹된 함수들
const mockFtpAccess = vi.fn().mockResolvedValue(undefined);
const mockFtpClose = vi.fn();

const mockSftpConnect = vi.fn().mockResolvedValue(undefined);
const mockSftpEnd = vi.fn().mockResolvedValue(undefined);

// basic-ftp 모듈 모킹
vi.mock("basic-ftp", () => {
  return {
    default: {
      Client: class MockClient {
        access = mockFtpAccess;
        close = mockFtpClose;
      },
    },
  };
});

// ssh2-sftp-client 모듈 모킹
vi.mock("ssh2-sftp-client", () => {
  return {
    default: class MockSftpClient {
      connect = mockSftpConnect;
      end = mockSftpEnd;
    },
  };
});

describe("StorageFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("connect", () => {
    it("Should connect with FTP type", async () => {
      const result = await StorageFactory.connect(
        "ftp",
        { host: "ftp.example.com" },
        () => "result",
      );

      expect(result).toBe("result");
      expect(mockFtpAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "ftp.example.com",
          secure: false,
        }),
      );
    });

    it("Should connect with FTPS type", async () => {
      const result = await StorageFactory.connect(
        "ftps",
        { host: "ftps.example.com" },
        () => "result",
      );

      expect(result).toBe("result");
      expect(mockFtpAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "ftps.example.com",
          secure: true,
        }),
      );
    });

    it("Should connect with SFTP type", async () => {
      const result = await StorageFactory.connect(
        "sftp",
        { host: "sftp.example.com" },
        () => "result",
      );

      expect(result).toBe("result");
      expect(mockSftpConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "sftp.example.com",
        }),
      );
    });

    it("Should return callback function result", async () => {
      const result = await StorageFactory.connect("ftp", { host: "test" }, (storage) => {
        expect(storage).toBeDefined();
        return { data: "test" };
      });

      expect(result).toEqual({ data: "test" });
    });

    it("Should close connection and propagate error on error", async () => {
      const error = new Error("Test error");

      await expect(
        StorageFactory.connect("ftp", { host: "test" }, () => {
          throw error;
        }),
      ).rejects.toThrow("Test error");

      expect(mockFtpClose).toHaveBeenCalled();
    });

    it("Should close connection after operation completes", async () => {
      await StorageFactory.connect("ftp", { host: "test" }, () => {
        return "done";
      });

      expect(mockFtpClose).toHaveBeenCalled();
    });

    it("Should close SFTP connection and propagate error on error", async () => {
      const error = new Error("Test error");

      await expect(
        StorageFactory.connect("sftp", { host: "test" }, () => {
          throw error;
        }),
      ).rejects.toThrow("Test error");

      expect(mockSftpEnd).toHaveBeenCalled();
    });

    it("Should close SFTP connection after operation completes", async () => {
      await StorageFactory.connect("sftp", { host: "test" }, () => {
        return "done";
      });

      expect(mockSftpEnd).toHaveBeenCalled();
    });

    it("Should work independently for concurrent connections", async () => {
      const executionOrder: string[] = [];

      const promise1 = StorageFactory.connect("ftp", { host: "test" }, async () => {
        executionOrder.push("task1-start");
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionOrder.push("task1-end");
        return "result1";
      });

      const promise2 = StorageFactory.connect("ftp", { host: "test" }, async () => {
        executionOrder.push("task2-start");
        await new Promise((resolve) => setTimeout(resolve, 5));
        executionOrder.push("task2-end");
        return "result2";
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe("result1");
      expect(result2).toBe("result2");
      expect(executionOrder).toContain("task1-start");
      expect(executionOrder).toContain("task2-start");
      expect(executionOrder).toContain("task1-end");
      expect(executionOrder).toContain("task2-end");
      expect(mockFtpAccess).toHaveBeenCalledTimes(2);
      expect(mockFtpClose).toHaveBeenCalledTimes(2);
    });

    it("Should propagate error on connection failure", async () => {
      mockFtpAccess.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(StorageFactory.connect("ftp", { host: "test" }, () => "result")).rejects.toThrow(
        "Connection failed",
      );
    });
  });
});
