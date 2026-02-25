import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceProtocol, type ServiceProtocol } from "../../src/protocol/service-protocol";
import type { ServiceMessage } from "../../src/protocol/protocol.types";
import { Uuid } from "@simplysm/core-common";

describe("ServiceProtocol", () => {
  let protocol: ServiceProtocol;

  beforeEach(() => {
    protocol = createServiceProtocol();
  });

  afterEach(() => {
    protocol.dispose();
  });

  describe("encode", () => {
    it("encodes a single message", () => {
      const uuid = Uuid.new().toString();
      const message: ServiceMessage = { name: "test.method", body: [{ test: "data" }] };

      const result = protocol.encode(uuid, message);

      expect(result.chunks.length).toBe(1);
      expect(result.totalSize).toBeGreaterThan(0);
    });

    it("encodes a message without body", () => {
      const uuid = Uuid.new().toString();
      const message: ServiceMessage = {
        name: "reload",
        body: { clientName: undefined, changedFileSet: new Set() },
      };

      const result = protocol.encode(uuid, message);

      expect(result.chunks.length).toBe(1);
    });

    it("throws error when message exceeds 100MB", () => {
      const uuid = Uuid.new().toString();
      // Generate data larger than 100MB
      const largeData = "x".repeat(101 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      expect(() => protocol.encode(uuid, message)).toThrow("Message size exceeds the limit.");
    });
  });

  describe("decode", () => {
    it("decodes a single message", () => {
      const uuid = Uuid.new().toString();
      const message: ServiceMessage = { name: "test.method", body: [{ value: 123 }] };

      const encoded = protocol.encode(uuid, message);
      const result = protocol.decode(encoded.chunks[0]);

      expect(result.type).toBe("complete");
      if (result.type === "complete") {
        expect(result.message.name).toBe("test.method");
        expect(result.message.body).toEqual([{ value: 123 }]);
      }
    });

    it("throws error when buffer size is smaller than header size", () => {
      const smallBytes = new Uint8Array(20);

      expect(() => protocol.decode(smallBytes)).toThrow("Buffer size is smaller than header size.");
    });

    it("throws error when decoding message exceeds 100MB", () => {
      // Manually create header with totalSize exceeding 100MB
      const headerBytes = new Uint8Array(28);
      const uuidBytes = new Uuid(Uuid.new().toString()).toBytes();
      headerBytes.set(uuidBytes, 0);

      const headerView = new DataView(
        headerBytes.buffer,
        headerBytes.byteOffset,
        headerBytes.byteLength,
      );
      headerView.setBigUint64(16, BigInt(101 * 1024 * 1024), false); // 101MB
      headerView.setUint32(24, 0, false);

      expect(() => protocol.decode(headerBytes)).toThrow("Message size exceeds the limit.");
    });
  });

  describe("chunking", () => {
    it("chunks messages larger than 3MB", () => {
      const uuid = Uuid.new().toString();
      // Create 4MB data
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const result = protocol.encode(uuid, message);

      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it("assembles chunked messages in order", () => {
      const uuid = Uuid.new().toString();
      // 4MB data
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const encoded = protocol.encode(uuid, message);
      expect(encoded.chunks.length).toBeGreaterThan(1);

      // Decode chunks in order
      let result!: ReturnType<typeof protocol.decode>;
      for (let i = 0; i < encoded.chunks.length; i++) {
        result = protocol.decode(encoded.chunks[i]);
        if (i < encoded.chunks.length - 1) {
          expect(result.type).toBe("progress");
        }
      }

      expect(result.type).toBe("complete");
      if (result.type === "complete") {
        expect(result.message.body).toEqual([largeData]);
      }
    });

    it("assembles chunked messages in reverse order", () => {
      const uuid = Uuid.new().toString();
      // 4MB data
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const encoded = protocol.encode(uuid, message);
      const reversedChunks = [...encoded.chunks].reverse();

      // Decode in reverse order
      let result!: ReturnType<typeof protocol.decode>;
      for (let i = 0; i < reversedChunks.length; i++) {
        result = protocol.decode(reversedChunks[i]);
      }

      // Should complete at the end
      expect(result.type).toBe("complete");
      if (result.type === "complete") {
        expect(result.message.body).toEqual([largeData]);
      }
    });

    it("prevents duplicate packets", () => {
      const uuid = Uuid.new().toString();
      // 4MB data
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const encoded = protocol.encode(uuid, message);

      // Send first chunk twice
      protocol.decode(encoded.chunks[0]);
      const result1 = protocol.decode(encoded.chunks[0]); // Duplicate

      // Should be in progress state, and completedSize should not increase from duplicate
      expect(result1.type).toBe("progress");

      // Send remaining chunks
      let result!: ReturnType<typeof protocol.decode>;
      for (let i = 1; i < encoded.chunks.length; i++) {
        result = protocol.decode(encoded.chunks[i]);
      }

      expect(result.type).toBe("complete");
      if (result.type === "complete") {
        expect(result.message.body).toEqual([largeData]);
      }
    });
  });

  describe("UUID interleaving", () => {
    it("receives chunks from multiple UUIDs in interleaved order", () => {
      const uuid1 = Uuid.new().toString();
      const uuid2 = Uuid.new().toString();

      // Each with 4MB data to trigger chunking
      const largeData1 = "A".repeat(4 * 1024 * 1024);
      const largeData2 = "B".repeat(4 * 1024 * 1024);
      const message1: ServiceMessage = { name: "test.method1", body: [largeData1] };
      const message2: ServiceMessage = { name: "test.method2", body: [largeData2] };

      const encoded1 = protocol.encode(uuid1, message1);
      const encoded2 = protocol.encode(uuid2, message2);

      expect(encoded1.chunks.length).toBeGreaterThan(1);
      expect(encoded2.chunks.length).toBeGreaterThan(1);

      // Decode chunks in interleaved order (uuid1[0], uuid2[0], uuid1[1], uuid2[1], ...)
      const maxChunks = Math.max(encoded1.chunks.length, encoded2.chunks.length);
      let result1!: ReturnType<typeof protocol.decode>;
      let result2!: ReturnType<typeof protocol.decode>;

      for (let i = 0; i < maxChunks; i++) {
        if (i < encoded1.chunks.length) {
          result1 = protocol.decode(encoded1.chunks[i]);
        }
        if (i < encoded2.chunks.length) {
          result2 = protocol.decode(encoded2.chunks[i]);
        }
      }

      // Both messages should complete
      expect(result1.type).toBe("complete");
      expect(result2.type).toBe("complete");

      if (result1.type === "complete" && result2.type === "complete") {
        expect(result1.message.name).toBe("test.method1");
        expect(result1.message.body).toEqual([largeData1]);
        expect(result2.message.name).toBe("test.method2");
        expect(result2.message.body).toEqual([largeData2]);
      }
    });

    it("receives 3 UUIDs in random order", () => {
      const uuids = [Uuid.new().toString(), Uuid.new().toString(), Uuid.new().toString()];
      const data = [
        "X".repeat(4 * 1024 * 1024),
        "Y".repeat(4 * 1024 * 1024),
        "Z".repeat(4 * 1024 * 1024),
      ];
      const messages: ServiceMessage[] = data.map((d, i) => ({
        name: `test.method${i}`,
        body: [d],
      }));

      const encodedList = uuids.map((uuid, i) => protocol.encode(uuid, messages[i]));

      // Combine all chunks into one array
      const allChunks: { uuid: string; chunk: Uint8Array; originalIndex: number }[] = [];
      encodedList.forEach((encoded, msgIdx) => {
        encoded.chunks.forEach((chunk, chunkIdx) => {
          allChunks.push({ uuid: uuids[msgIdx], chunk, originalIndex: chunkIdx });
        });
      });

      // Randomize order (use reverse instead of seed-based shuffle)
      allChunks.reverse();

      // Decode all chunks
      const results: Map<string, ReturnType<typeof protocol.decode>> = new Map();
      for (const { uuid, chunk } of allChunks) {
        results.set(uuid, protocol.decode(chunk));
      }

      // Verify all messages completed
      for (let i = 0; i < 3; i++) {
        const result = results.get(uuids[i]);
        expect(result?.type).toBe("complete");
        if (result?.type === "complete") {
          expect(result.message.name).toBe(`test.method${i}`);
          expect(result.message.body).toEqual([data[i]]);
        }
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty body", () => {
      const uuid = Uuid.new().toString();
      const message: ServiceMessage = { name: "test.method", body: [""] };

      const encoded = protocol.encode(uuid, message);
      const decoded = protocol.decode(encoded.chunks[0]);

      expect(decoded.type).toBe("complete");
      if (decoded.type === "complete") {
        expect(decoded.message.body).toEqual([""]);
      }
    });

    it("handles null body", () => {
      const uuid = Uuid.new().toString();
      const message: ServiceMessage = { name: "test.method", body: [null] };

      const encoded = protocol.encode(uuid, message);
      const decoded = protocol.decode(encoded.chunks[0]);

      expect(decoded.type).toBe("complete");
      if (decoded.type === "complete") {
        // JsonConvert.stringify/parse converts null to undefined
        expect(decoded.message.body).toEqual([undefined]);
      }
    });

    it("serializes complex objects", () => {
      const uuid = Uuid.new().toString();
      const complexData = {
        array: [1, 2, 3],
        nested: { deep: { value: "test" } },
        date: new Date().toISOString(),
        unicode: "Korean test 🚀",
      };
      const message: ServiceMessage = { name: "test.method", body: [complexData] };

      const encoded = protocol.encode(uuid, message);
      const decoded = protocol.decode(encoded.chunks[0]);

      expect(decoded.type).toBe("complete");
      if (decoded.type === "complete") {
        expect(decoded.message.body).toEqual([complexData]);
      }
    });

    it("handles message at exactly 3MB boundary", () => {
      const uuid = Uuid.new().toString();
      // Exactly 3MB
      const data = "x".repeat(3 * 1024 * 1024 - 50); // Account for some JSON overhead
      const message: ServiceMessage = { name: "test.method", body: [data] };

      const encoded = protocol.encode(uuid, message);
      // Messages up to 3MB should not be chunked
      expect(encoded.chunks.length).toBe(1);
    });

    it("includes correct information in progress response", () => {
      const uuid = Uuid.new().toString();
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const encoded = protocol.encode(uuid, message);
      const result = protocol.decode(encoded.chunks[0]);

      expect(result.type).toBe("progress");
      if (result.type === "progress") {
        expect(result.uuid).toBe(uuid);
        expect(result.totalSize).toBe(encoded.totalSize);
        expect(result.completedSize).toBeGreaterThan(0);
        expect(result.completedSize).toBeLessThan(result.totalSize);
      }
    });
  });
});
