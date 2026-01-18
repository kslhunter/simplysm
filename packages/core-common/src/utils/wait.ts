/**
 * 대기 유틸리티
 */
import { TimeoutError } from "../errors/timeout-error";

export class Wait {
  /**
   * 조건이 참이 될 때까지 대기
   * @param forwarder 조건 함수
   * @param milliseconds 체크 간격 (기본: 100ms)
   * @param timeout 타임아웃 (undefined면 무제한)
   * @throws TimeoutError 타임아웃 발생 시
   */
  static async until(
    forwarder: () => boolean | Promise<boolean>,
    milliseconds?: number,
    timeout?: number,
  ): Promise<void> {
    const startTime = Date.now();
    while (!(await forwarder())) {
      // 타임아웃 먼저 체크 (timeout=0 케이스 포함)
      if (timeout !== undefined) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeout) {
          throw new TimeoutError(timeout);
        }
      }

      await Wait.time(milliseconds ?? 100);
    }
  }

  /**
   * 지정된 시간만큼 대기
   * @param millisecond 대기 시간 (ms)
   */
  static async time(millisecond: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, millisecond);
    });
  }
}
