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
    it("단일 메시지 인코딩", () => {
      const uuid = Uuid.new().toString();
      const message: ServiceMessage = { name: "test.method", body: [{ test: "data" }] };

      const result = protocol.encode(uuid, message);

      expect(result.chunks.length).toBe(1);
      expect(result.totalSize).toBeGreaterThan(0);
    });

    it("body 없는 메시지 인코딩", () => {
      const uuid = Uuid.new().toString();
      const message: ServiceMessage = { name: "reload", body: { clientName: undefined, changedFileSet: new Set() } };

      const result = protocol.encode(uuid, message);

      expect(result.chunks.length).toBe(1);
    });

    it("100MB 초과 시 에러", () => {
      const uuid = Uuid.new().toString();
      // 100MB 이상의 데이터 생성
      const largeData = "x".repeat(101 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      expect(() => protocol.encode(uuid, message)).toThrow("메시지 크기가 제한을 초과했습니다.");
    });
  });

  describe("decode", () => {
    it("단일 메시지 디코딩", () => {
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

    it("헤더 크기 미달 시 에러", () => {
      const smallBytes = new Uint8Array(20);

      expect(() => protocol.decode(smallBytes)).toThrow("버퍼 크기가 헤더 크기보다 작습니다.");
    });

    it("100MB 초과 메시지 디코딩 시 에러", () => {
      // 헤더를 수동 생성하여 totalSize가 100MB 초과로 설정
      const headerBytes = new Uint8Array(28);
      const uuidBytes = new Uuid(Uuid.new().toString()).toBytes();
      headerBytes.set(uuidBytes, 0);

      const headerView = new DataView(headerBytes.buffer, headerBytes.byteOffset, headerBytes.byteLength);
      headerView.setBigUint64(16, BigInt(101 * 1024 * 1024), false); // 101MB
      headerView.setUint32(24, 0, false);

      expect(() => protocol.decode(headerBytes)).toThrow("메시지 크기가 제한을 초과했습니다.");
    });
  });

  describe("chunking", () => {
    it("3MB 초과 메시지는 청킹됨", () => {
      const uuid = Uuid.new().toString();
      // 4MB 데이터 생성
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const result = protocol.encode(uuid, message);

      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it("청킹된 메시지 조립", () => {
      const uuid = Uuid.new().toString();
      // 4MB 데이터
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const encoded = protocol.encode(uuid, message);
      expect(encoded.chunks.length).toBeGreaterThan(1);

      // 청크 순서대로 디코딩
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

    it("청킹된 메시지 역순 조립", () => {
      const uuid = Uuid.new().toString();
      // 4MB 데이터
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const encoded = protocol.encode(uuid, message);
      const reversedChunks = [...encoded.chunks].reverse();

      // 역순으로 디코딩
      let result!: ReturnType<typeof protocol.decode>;
      for (let i = 0; i < reversedChunks.length; i++) {
        result = protocol.decode(reversedChunks[i]);
      }

      // 마지막에 완료되어야 함
      expect(result.type).toBe("complete");
      if (result.type === "complete") {
        expect(result.message.body).toEqual([largeData]);
      }
    });

    it("패킷 중복 방어", () => {
      const uuid = Uuid.new().toString();
      // 4MB 데이터
      const largeData = "x".repeat(4 * 1024 * 1024);
      const message: ServiceMessage = { name: "test.method", body: [largeData] };

      const encoded = protocol.encode(uuid, message);

      // 첫 번째 청크를 2번 전송
      protocol.decode(encoded.chunks[0]);
      const result1 = protocol.decode(encoded.chunks[0]); // 중복

      // progress 상태여야 하며, completedSize가 중복 증가하지 않아야 함
      expect(result1.type).toBe("progress");

      // 나머지 청크 전송
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
    it("복수 UUID 청크 교차 수신", () => {
      const uuid1 = Uuid.new().toString();
      const uuid2 = Uuid.new().toString();

      // 각각 4MB 데이터로 청킹 유발
      const largeData1 = "A".repeat(4 * 1024 * 1024);
      const largeData2 = "B".repeat(4 * 1024 * 1024);
      const message1: ServiceMessage = { name: "test.method1", body: [largeData1] };
      const message2: ServiceMessage = { name: "test.method2", body: [largeData2] };

      const encoded1 = protocol.encode(uuid1, message1);
      const encoded2 = protocol.encode(uuid2, message2);

      expect(encoded1.chunks.length).toBeGreaterThan(1);
      expect(encoded2.chunks.length).toBeGreaterThan(1);

      // 교차로 청크 디코딩 (uuid1[0], uuid2[0], uuid1[1], uuid2[1], ...)
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

      // 두 메시지 모두 완료되어야 함
      expect(result1.type).toBe("complete");
      expect(result2.type).toBe("complete");

      if (result1.type === "complete" && result2.type === "complete") {
        expect(result1.message.name).toBe("test.method1");
        expect(result1.message.body).toEqual([largeData1]);
        expect(result2.message.name).toBe("test.method2");
        expect(result2.message.body).toEqual([largeData2]);
      }
    });

    it("3개 UUID 무작위 순서 수신", () => {
      const uuids = [Uuid.new().toString(), Uuid.new().toString(), Uuid.new().toString()];
      const data = ["X".repeat(4 * 1024 * 1024), "Y".repeat(4 * 1024 * 1024), "Z".repeat(4 * 1024 * 1024)];
      const messages: ServiceMessage[] = data.map((d, i) => ({ name: `test.method${i}`, body: [d] }));

      const encodedList = uuids.map((uuid, i) => protocol.encode(uuid, messages[i]));

      // 모든 청크를 하나의 배열로 합침
      const allChunks: { uuid: string; chunk: Uint8Array; originalIndex: number }[] = [];
      encodedList.forEach((encoded, msgIdx) => {
        encoded.chunks.forEach((chunk, chunkIdx) => {
          allChunks.push({ uuid: uuids[msgIdx], chunk, originalIndex: chunkIdx });
        });
      });

      // 무작위 순서로 섞기 (시드 기반 섞기 대신 역순 사용)
      allChunks.reverse();

      // 모든 청크 디코딩
      const results: Map<string, ReturnType<typeof protocol.decode>> = new Map();
      for (const { uuid, chunk } of allChunks) {
        results.set(uuid, protocol.decode(chunk));
      }

      // 모든 메시지 완료 확인
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
    it("빈 body 처리", () => {
      const uuid = Uuid.new().toString();
      const message: ServiceMessage = { name: "test.method", body: [""] };

      const encoded = protocol.encode(uuid, message);
      const decoded = protocol.decode(encoded.chunks[0]);

      expect(decoded.type).toBe("complete");
      if (decoded.type === "complete") {
        expect(decoded.message.body).toEqual([""]);
      }
    });

    it("null body 처리", () => {
      const uuid = Uuid.new().toString();
      const message: ServiceMessage = { name: "test.method", body: [null] };

      const encoded = protocol.encode(uuid, message);
      const decoded = protocol.decode(encoded.chunks[0]);

      expect(decoded.type).toBe("complete");
      if (decoded.type === "complete") {
        // JsonConvert.stringify/parse는 null을 undefined로 변환
        expect(decoded.message.body).toEqual([undefined]);
      }
    });

    it("복잡한 객체 직렬화", () => {
      const uuid = Uuid.new().toString();
      const complexData = {
        array: [1, 2, 3],
        nested: { deep: { value: "test" } },
        date: new Date().toISOString(),
        unicode: "한글 테스트 🚀",
      };
      const message: ServiceMessage = { name: "test.method", body: [complexData] };

      const encoded = protocol.encode(uuid, message);
      const decoded = protocol.decode(encoded.chunks[0]);

      expect(decoded.type).toBe("complete");
      if (decoded.type === "complete") {
        expect(decoded.message.body).toEqual([complexData]);
      }
    });

    it("정확히 3MB 경계 메시지", () => {
      const uuid = Uuid.new().toString();
      // 정확히 3MB
      const data = "x".repeat(3 * 1024 * 1024 - 50); // 약간의 JSON 오버헤드 고려
      const message: ServiceMessage = { name: "test.method", body: [data] };

      const encoded = protocol.encode(uuid, message);
      // 3MB 이하면 청킹 안됨
      expect(encoded.chunks.length).toBe(1);
    });

    it("progress 응답에 올바른 정보 포함", () => {
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
