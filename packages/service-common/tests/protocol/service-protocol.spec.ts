import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ServiceProtocol } from "../../src/protocol/service-protocol";
import type { ServiceMessage } from "../../src/protocol/protocol.types";
import { Uuid } from "@simplysm/core-common";

describe("ServiceProtocol", () => {
  let protocol: ServiceProtocol;

  beforeEach(() => {
    protocol = new ServiceProtocol();
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
      const smallBuffer = Buffer.alloc(20);

      expect(() => protocol.decode(smallBuffer)).toThrow("버퍼 크기가 헤더 크기보다 작습니다.");
    });

    it("100MB 초과 메시지 디코딩 시 에러", () => {
      // 헤더를 수동 생성하여 totalSize가 100MB 초과로 설정
      const headerBuffer = Buffer.alloc(28);
      const uuidBuffer = new Uuid(Uuid.new().toString()).toBuffer();
      headerBuffer.set(uuidBuffer, 0);

      const headerView = new DataView(
        headerBuffer.buffer,
        headerBuffer.byteOffset,
        headerBuffer.byteLength,
      );
      headerView.setBigUint64(16, BigInt(101 * 1024 * 1024), false); // 101MB
      headerView.setUint32(24, 0, false);

      expect(() => protocol.decode(headerBuffer)).toThrow("메시지 크기가 제한을 초과했습니다.");
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
      let result;
      for (let i = 0; i < encoded.chunks.length; i++) {
        result = protocol.decode(encoded.chunks[i]);
        if (i < encoded.chunks.length - 1) {
          expect(result.type).toBe("progress");
        }
      }

      expect(result!.type).toBe("complete");
      if (result!.type === "complete") {
        expect(result!.message.body).toEqual([largeData]);
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
      let result;
      for (let i = 0; i < reversedChunks.length; i++) {
        result = protocol.decode(reversedChunks[i]);
      }

      // 마지막에 완료되어야 함
      expect(result!.type).toBe("complete");
      if (result!.type === "complete") {
        expect(result!.message.body).toEqual([largeData]);
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
      let result;
      for (let i = 1; i < encoded.chunks.length; i++) {
        result = protocol.decode(encoded.chunks[i]);
      }

      expect(result!.type).toBe("complete");
      if (result!.type === "complete") {
        expect(result!.message.body).toEqual([largeData]);
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
