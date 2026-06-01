import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceProtocol, type ServiceProtocol } from "../../src/protocol/create-service-protocol";
import type { ServiceMessage } from "../../src/protocol/protocol.types";
import { PROTOCOL_CONFIG } from "../../src/protocol/protocol.types";
import { ArgumentError, Uuid } from "@simplysm/core-common";

describe("ServiceProtocol", () => {
  let protocol: ServiceProtocol;

  beforeEach(() => {
    protocol = createServiceProtocol();
  });

  afterEach(() => {
    protocol.dispose();
  });

  describe("인코딩", () => {
    it("encode single message", () => {
      const uuid = Uuid.generate().toString();
      const message: ServiceMessage = { name: "test.method", body: [{ test: "data" }] };

      const result = protocol.encode(uuid, message);

      expect(result.chunks.length).toBe(1);
      expect(result.totalSize).toBeGreaterThan(0);
    });

    it("throw error when message exceeds 100MB", () => {
      const uuid = Uuid.generate().toString();
      // Generate data larger than 100MB
      const largeData = "x".repeat(101 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      expect(() => protocol.encode(uuid, message)).toThrow("메시지 크기가 제한을 초과했습니다.");
    });
  });

  describe("디코딩", () => {
    it("decode single message", () => {
      const uuid = Uuid.generate().toString();
      const message: ServiceMessage = { name: "test.method", body: [{ value: 123 }] };

      const encoded = protocol.encode(uuid, message);
      const result = protocol.decode(encoded.chunks[0]);

      expect(result.type).toBe("complete");
      if (result.type === "complete") {
        expect(result.message.name).toBe("test.method");
        expect(result.message.body).toEqual([{ value: 123 }]);
      }
    });

    it("throw error when buffer size is smaller than header size", () => {
      const smallBytes = new Uint8Array(20);

      expect(() => protocol.decode(smallBytes)).toThrow("버퍼 크기가 헤더 크기보다 작습니다.");
    });

    it("throw error when decoded message exceeds 100MB", () => {
      // Manually create header with totalSize exceeding 100MB
      const headerBytes = new Uint8Array(28);
      const uuidBytes = new Uuid(Uuid.generate().toString()).toBytes();
      headerBytes.set(uuidBytes, 0);

      const headerView = new DataView(
        headerBytes.buffer,
        headerBytes.byteOffset,
        headerBytes.byteLength,
      );
      headerView.setUint32(16, 0, false);
      headerView.setUint32(20, 101 * 1024 * 1024, false); // 101MB
      headerView.setUint32(24, 0, false);

      expect(() => protocol.decode(headerBytes)).toThrow("메시지 크기가 제한을 초과했습니다.");
    });
  });

  describe("청킹", () => {
    it("chunk message larger than 3MB", () => {
      const uuid = Uuid.generate().toString();
      // Create 4MB data
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const result = protocol.encode(uuid, message);

      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it("assemble chunked message in order", () => {
      const uuid = Uuid.generate().toString();
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

    it("assemble chunked message in reverse order", () => {
      const uuid = Uuid.generate().toString();
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

    it("prevent duplicate packets", () => {
      const uuid = Uuid.generate().toString();
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

  describe("UUID 인터리빙", () => {
    it("receive chunks from multiple UUIDs in interleaved order", () => {
      const uuid1 = Uuid.generate().toString();
      const uuid2 = Uuid.generate().toString();

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

  });

  describe("32비트 totalSize (BigInt 제거)", () => {
    it("totalSize를 32비트로 인코딩하여 역호환 바이너리를 생성한다", () => {
      const uuid = Uuid.generate().toString();
      const message: ServiceMessage = { name: "test.method", body: [{ test: "data" }] };

      const result = protocol.encode(uuid, message);
      const chunk = result.chunks[0];

      // 헤더의 TotalSize 필드(offset 16-23, 8바이트 BigEndian)를 직접 검증
      const headerView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      // 상위 4바이트(offset 16)는 0이어야 한다
      expect(headerView.getUint32(16, false)).toBe(0);
      // 하위 4바이트(offset 20)는 totalSize와 같아야 한다
      expect(headerView.getUint32(20, false)).toBe(result.totalSize);
    });

    it("totalSize를 32비트로 디코딩한다", () => {
      const uuid = Uuid.generate().toString();
      const message: ServiceMessage = { name: "test.method", body: [{ value: 42 }] };

      const encoded = protocol.encode(uuid, message);
      const decoded = protocol.decode(encoded.chunks[0]);

      expect(decoded.type).toBe("complete");
      if (decoded.type === "complete") {
        expect(decoded.message.name).toBe("test.method");
        expect(decoded.message.body).toEqual([{ value: 42 }]);
      }
    });

    it("MAX_TOTAL_SIZE(100MB)가 32비트 unsigned integer 범위 내이다", () => {
      const UINT32_MAX = 4_294_967_295;
      expect(PROTOCOL_CONFIG.MAX_TOTAL_SIZE).toBeLessThanOrEqual(UINT32_MAX);
    });

    it("인코딩된 바이너리가 BigUint64 형식과 동일한 바이트를 생성한다", () => {
      const uuid = Uuid.generate().toString();
      const message: ServiceMessage = { name: "test.method", body: ["hello"] };

      const result = protocol.encode(uuid, message);
      const chunk = result.chunks[0];
      const headerView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);

      // BigUint64로 인코딩한 경우의 기대 바이트와 동일해야 한다
      const expectedView = new DataView(new ArrayBuffer(8));
      expectedView.setUint32(0, 0, false); // 상위 4바이트 = 0
      expectedView.setUint32(4, result.totalSize, false); // 하위 4바이트 = totalSize

      // 헤더 offset 16-23의 8바이트 비교
      for (let i = 0; i < 8; i++) {
        expect(headerView.getUint8(16 + i)).toBe(expectedView.getUint8(i));
      }
    });
  });

  describe("엣지 케이스", () => {
    it("handle null body", () => {
      const uuid = Uuid.generate().toString();
      const message: ServiceMessage = { name: "test.method", body: [null] };

      const encoded = protocol.encode(uuid, message);
      const decoded = protocol.decode(encoded.chunks[0]);

      expect(decoded.type).toBe("complete");
      if (decoded.type === "complete") {
        // JsonConvert.stringify/parse converts null to undefined
        expect(decoded.message.body).toEqual([undefined]);
      }
    });

    it("handle message at exactly 3MB boundary", () => {
      const uuid = Uuid.generate().toString();
      // Exactly 3MB
      const data = "x".repeat(3 * 1024 * 1024 - 50); // Account for some JSON overhead
      const message: ServiceMessage = { name: "test.method", body: [data] };

      const encoded = protocol.encode(uuid, message);
      // Messages up to 3MB should not be chunked
      expect(encoded.chunks.length).toBe(1);
    });

    it("throw error when completedSize exceeds totalSize", () => {
      const uuid = Uuid.generate().toString();
      const uuidBytes = new Uuid(uuid).toBytes();

      // Create a forged chunk: header claims totalSize=1, but body is 10 bytes
      const forgedHeader = new Uint8Array(28);
      forgedHeader.set(uuidBytes, 0);
      const headerView = new DataView(
        forgedHeader.buffer,
        forgedHeader.byteOffset,
        forgedHeader.byteLength,
      );
      headerView.setUint32(16, 0, false);
      headerView.setUint32(20, 1, false); // totalSize = 1
      headerView.setUint32(24, 0, false); // index = 0

      const body = new Uint8Array(10); // 10 bytes, larger than totalSize of 1
      const forgedChunk = new Uint8Array(28 + body.length);
      forgedChunk.set(forgedHeader, 0);
      forgedChunk.set(body, 28);

      expect(() => protocol.decode(forgedChunk)).toThrow(ArgumentError);
    });

    it("include correct information in progress response", () => {
      const uuid = Uuid.generate().toString();
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

  describe("누적/파싱 분리 (accumulate/parseMessage)", () => {
    it("단일 메시지를 누적하면 complete + resultBytes 를 반환하고, parseMessage 로 메시지를 복원한다", () => {
      const uuid = Uuid.generate().toString();
      const message: ServiceMessage = { name: "test.method", body: [{ value: 123 }] };

      const encoded = protocol.encode(uuid, message);
      const acc = protocol.accumulate(encoded.chunks[0]);

      expect(acc.type).toBe("complete");
      if (acc.type === "complete") {
        expect(acc.uuid).toBe(uuid);
        const parsed = protocol.parseMessage(acc.resultBytes);
        expect(parsed.name).toBe("test.method");
        expect(parsed.body).toEqual([{ value: 123 }]);
      }
    });

    it("청크 메시지를 순서대로 누적하면 마지막에만 complete 되고 resultBytes 가 전체 메시지를 담는다", () => {
      const uuid = Uuid.generate().toString();
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const encoded = protocol.encode(uuid, message);
      expect(encoded.chunks.length).toBeGreaterThan(1);

      let acc!: ReturnType<typeof protocol.accumulate>;
      for (let i = 0; i < encoded.chunks.length; i++) {
        acc = protocol.accumulate(encoded.chunks[i]);
        if (i < encoded.chunks.length - 1) {
          expect(acc.type).toBe("progress");
        }
      }

      expect(acc.type).toBe("complete");
      if (acc.type === "complete") {
        const parsed = protocol.parseMessage(acc.resultBytes);
        expect(parsed.body).toEqual([largeData]);
      }
    });

    it("청크를 역순으로 누적해도 complete 후 parseMessage 로 복원된다", () => {
      const uuid = Uuid.generate().toString();
      const largeData = "y".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const encoded = protocol.encode(uuid, message);
      const reversed = [...encoded.chunks].reverse();

      let acc!: ReturnType<typeof protocol.accumulate>;
      for (const chunk of reversed) {
        acc = protocol.accumulate(chunk);
      }

      expect(acc.type).toBe("complete");
      if (acc.type === "complete") {
        const parsed = protocol.parseMessage(acc.resultBytes);
        expect(parsed.body).toEqual([largeData]);
      }
    });

    it("accumulate+parseMessage 조합 결과가 decode 와 동일하다", () => {
      const uuid = Uuid.generate().toString();
      const message: ServiceMessage = { name: "test.method", body: [{ a: 1, b: "x" }] };

      const encoded = protocol.encode(uuid, message);
      const decoded = protocol.decode(encoded.chunks[0]);

      const protocol2 = createServiceProtocol();
      try {
        const acc = protocol2.accumulate(encoded.chunks[0]);
        expect(acc.type).toBe("complete");
        if (acc.type === "complete" && decoded.type === "complete") {
          const parsed = protocol2.parseMessage(acc.resultBytes);
          expect(parsed).toEqual(decoded.message);
        }
      } finally {
        protocol2.dispose();
      }
    });
  });
});
