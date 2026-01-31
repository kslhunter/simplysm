import { ServiceBase, Authorize } from "@simplysm/service-server";

/**
 * 테스트용 인증 정보 타입
 */
export interface TestAuthInfo {
  userId: string;
  userName: string;
  roles: string[];
}

/**
 * 통합 테스트용 서비스
 */
export class TestService extends ServiceBase<TestAuthInfo> {
  /**
   * 간단한 에코 메소드 (인증 불필요)
   */
  echo(message: string): Promise<string> {
    return Promise.resolve(`Echo: ${message}`);
  }

  /**
   * 복잡한 객체 반환 (직렬화 테스트)
   */
  getComplexData(): Promise<{
    number: number;
    string: string;
    array: number[];
    nested: { a: string; b: number };
    date: Date;
  }> {
    return Promise.resolve({
      number: 42,
      string: "hello",
      array: [1, 2, 3],
      nested: { a: "nested", b: 99 },
      date: new Date("2026-01-08T12:00:00Z"),
    });
  }

  /**
   * 에러 발생 테스트
   */
  throwError(message: string): Promise<void> {
    return Promise.reject(new Error(message));
  }

  /**
   * 지연 응답 (타임아웃/진행률 테스트용)
   */
  async delayedResponse(ms: number): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return `Delayed ${ms}ms`;
  }

  /**
   * 인증 필요한 메소드
   */
  @Authorize()
  getAuthInfo(): Promise<TestAuthInfo | undefined> {
    return Promise.resolve(this.authInfo);
  }

  /**
   * 관리자 권한 필요 메소드
   */
  @Authorize(["admin"])
  adminOnly(): Promise<string> {
    return Promise.resolve("Admin access granted");
  }

  /**
   * 클라이언트 이름 반환
   */
  getClientName(): Promise<string | undefined> {
    return Promise.resolve(this.clientName);
  }

  /**
   * 대용량 데이터 반환 (청킹 테스트)
   */
  getLargeData(sizeKb: number): Promise<string> {
    // sizeKb KB 크기의 문자열 생성 (repeat 사용으로 성능 최적화)
    return Promise.resolve("A".repeat(sizeKb * 1024));
  }
}
