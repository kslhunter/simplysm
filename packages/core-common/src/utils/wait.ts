/**
 * 대기 유틸리티 함수
 */
import { TimeoutError } from "../errors/timeout-error";

/**
 * 조건이 true가 될 때까지 대기
 * @param forwarder 조건 함수
 * @param milliseconds 확인 간격 (기본값: 100ms)
 * @param maxCount 최대 시도 횟수 (undefined이면 무제한)
 *
 * @note 첫 번째 호출에서 조건이 true이면 즉시 반환.
 * @throws TimeoutError 최대 시도 횟수를 초과했을 때
 */
export async function until(
  forwarder: () => boolean | Promise<boolean>,
  milliseconds?: number,
  maxCount?: number,
): Promise<void> {
  let count = 0;
  while (!(await forwarder())) {
    count++;
    if (maxCount != null && count >= maxCount) {
      throw new TimeoutError(count);
    }

    await time(milliseconds ?? 100);
  }
}

/**
 * 지정된 시간만큼 대기
 * @param millisecond 대기 시간 (ms)
 */
export async function time(millisecond: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, millisecond));
}
