import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ServiceClient } from "@simplysm/service-client";
import type { TestService } from "./test-service";

const TEST_PORT = 23100;

describe("ServiceClient 브라우저 테스트", () => {
  let client: ServiceClient;

  beforeAll(async () => {
    // 브라우저 환경 확인
    expect(typeof Worker).toBe("function");
    expect(typeof window).toBe("object");

    client = new ServiceClient("test-client", {
      host: "localhost",
      port: TEST_PORT,
      ssl: false,
      maxReconnectCount: 0,
    });

    await client.connectAsync();
  });

  afterAll(async () => {
    await client.closeAsync();
  });

  describe("Worker 환경 확인", () => {
    it("브라우저 환경에서 Worker API 사용 가능", () => {
      expect(typeof Worker).toBe("function");
    });

    it("WebSocket 연결 성공", () => {
      expect(client.connected).toBe(true);
    });
  });

  describe("서비스 호출", () => {
    it("echo 메소드 호출", async () => {
      const svc = client.getService<TestService>("TestService");
      const result = await svc.echo("Hello from Browser");
      expect(result).toBe("Echo: Hello from Browser");
    });

    it("복잡한 객체 반환 (직렬화/역직렬화)", async () => {
      const svc = client.getService<TestService>("TestService");
      const result = await svc.getComplexData();

      expect(result.number).toBe(42);
      expect(result.string).toBe("hello");
      expect(result.array).toEqual([1, 2, 3]);
      expect(result.nested).toEqual({ a: "nested", b: 99 });
      expect(result.date).toBeInstanceOf(Date);
    });
  });

  describe("대용량 데이터 (Worker 테스트)", () => {
    it("30KB 이하 데이터 처리 (메인 스레드)", async () => {
      const svc = client.getService<TestService>("TestService");
      const result = await svc.getLargeData(25); // 25KB
      expect(result.length).toBe(25 * 1024);
    });

    it("30KB 초과 데이터 처리 (Worker 사용)", async () => {
      const svc = client.getService<TestService>("TestService");

      // 50KB 데이터 요청 - Worker가 처리해야 함
      const result = await svc.getLargeData(50);
      expect(result.length).toBe(50 * 1024);
    });

    it("100KB 대용량 데이터 처리 (Worker 사용)", async () => {
      const svc = client.getService<TestService>("TestService");

      // 100KB 데이터 요청
      const result = await svc.getLargeData(100);
      expect(result.length).toBe(100 * 1024);
    });
  });
});
