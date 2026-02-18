import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServiceClient, type ServiceClient } from "@simplysm/service-client";
import { defineEvent } from "@simplysm/service-common";
import type { TestServiceMethods, TestAuthInfo } from "./test-service";
import * as jose from "jose";

const TEST_PORT = 23100;
const JWT_SECRET = new TextEncoder().encode("test-secret-key-for-jwt-signing");

/** 테스트용 JWT 생성 */
async function createTestToken(authInfo: TestAuthInfo): Promise<string> {
  // 서버의 AuthTokenPayload 형식에 맞게 토큰 생성
  // { roles: string[], data: TAuthInfo }
  const payload = {
    roles: authInfo.roles,
    data: authInfo,
  };
  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .sign(JWT_SECRET);
}

/** 테스트용 이벤트 */
const TestEvent = defineEvent<{ channel: string }, string>("TestEvent");

describe("ServiceClient 브라우저 테스트", () => {
  let client: ServiceClient;

  beforeAll(async () => {
    // 브라우저 환경 확인
    expect(typeof Worker).toBe("function");
    expect(typeof window).toBe("object");

    client = createServiceClient("test-client", {
      host: "localhost",
      port: TEST_PORT,
      ssl: false,
      maxReconnectCount: 0,
    });

    await client.connect();
  });

  afterAll(async () => {
    await client.close();
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
      const svc = client.getService<TestServiceMethods>("TestService");
      const result = await svc.echo("Hello from Browser");
      expect(result).toBe("Echo: Hello from Browser");
    });

    it("복잡한 객체 반환 (직렬화/역직렬화)", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");
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
      const svc = client.getService<TestServiceMethods>("TestService");
      const result = await svc.getLargeData(25); // 25KB
      expect(result.length).toBe(25 * 1024);
    });

    it("30KB 초과 데이터 처리 (Worker 사용)", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      // 50KB 데이터 요청 - Worker가 처리해야 함
      const result = await svc.getLargeData(50);
      expect(result.length).toBe(50 * 1024);
    });

    it("100KB 대용량 데이터 처리 (Worker 사용)", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      // 100KB 데이터 요청
      const result = await svc.getLargeData(100);
      expect(result.length).toBe(100 * 1024);
    });

    it("3MB 초과 데이터 진행률 콜백 호출", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      // 진행률 콜백 추적
      const progressStates: Array<{ totalSize: number; completedSize: number }> = [];

      client.on("response-progress", (state) => {
        progressStates.push({ totalSize: state.totalSize, completedSize: state.completedSize });
      });

      // 4MB 데이터 요청 (청킹 발생)
      const result = await svc.getLargeData(4 * 1024);
      expect(result.length).toBe(4 * 1024 * 1024);

      // 진행률 콜백이 호출되었어야 함
      expect(progressStates.length).toBeGreaterThan(0);

      // 마지막 진행률은 완료 상태여야 함
      const lastProgress = progressStates[progressStates.length - 1];
      expect(lastProgress.completedSize).toBe(lastProgress.totalSize);
    });
  });

  describe("인증 및 권한", () => {
    it("인증 토큰 전송 및 인증 정보 조회", async () => {
      // JWT 토큰 생성
      const authInfo: TestAuthInfo = {
        userId: "test-user-1",
        userName: "Test User",
        roles: ["user"],
      };
      const token = await createTestToken(authInfo);

      // 인증
      await client.auth(token);

      // 인증 정보 조회
      const svc = client.getService<TestServiceMethods>("TestService");
      const result = await svc.getAuthInfo();

      expect(result).toBeDefined();
      expect(result?.userId).toBe("test-user-1");
      expect(result?.userName).toBe("Test User");
      expect(result?.roles).toContain("user");
    });

    it("관리자 권한 필요 메서드 - 권한 없음", async () => {
      // 일반 사용자 토큰
      const authInfo: TestAuthInfo = {
        userId: "normal-user",
        userName: "Normal User",
        roles: ["user"],
      };
      const token = await createTestToken(authInfo);
      await client.auth(token);

      const svc = client.getService<TestServiceMethods>("TestService");

      // 권한 없음 에러 예상
      await expect(svc.adminOnly()).rejects.toThrow();
    });

    it("관리자 권한 필요 메서드 - 권한 있음", async () => {
      // 관리자 토큰
      const authInfo: TestAuthInfo = {
        userId: "admin-user",
        userName: "Admin User",
        roles: ["admin"],
      };
      const token = await createTestToken(authInfo);
      await client.auth(token);

      const svc = client.getService<TestServiceMethods>("TestService");
      const result = await svc.adminOnly();

      expect(result).toBe("Admin access granted");
    });
  });

  describe("에러 처리", () => {
    it("서비스 메서드 에러 전파", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      await expect(svc.throwError("테스트 에러 메시지")).rejects.toThrow("테스트 에러 메시지");
    });

    it("에러 발생 후에도 후속 요청 정상 처리", async () => {
      const svc = client.getService<TestServiceMethods>("TestService");

      // 에러 발생
      await expect(svc.throwError("에러")).rejects.toThrow();

      // 후속 요청 정상 처리
      const result = await svc.echo("정상 요청");
      expect(result).toBe("Echo: 정상 요청");
    });
  });

  describe("이벤트 리스너", () => {
    it("이벤트 리스너 등록 및 해제", async () => {
      // 관리자 인증 (이벤트 등록에 필요할 수 있음)
      const authInfo: TestAuthInfo = {
        userId: "event-test-user",
        userName: "Event Test",
        roles: ["user"],
      };
      const token = await createTestToken(authInfo);
      await client.auth(token);

      // 이벤트 수신 콜백
      const receivedData: string[] = [];
      const listenerKey = await client.addEventListener(
        TestEvent,
        { channel: "test-channel" },
        (data) => {
          receivedData.push(data);
          return Promise.resolve();
        },
      );

      expect(listenerKey).toBeDefined();
      expect(typeof listenerKey).toBe("string");

      // 리스너 해제
      await client.removeEventListener(listenerKey);
    });
  });
});
