/**
 * 조건이 참이 될 때까지 대기
 * @param forwarder 조건 함수
 * @param milliseconds 체크 간격 (기본: 100ms)
 * @param maxCount 최대 시도 횟수 (undefined면 무제한)
 *
 * @note 조건이 첫 번째 호출에서 true면 즉시 반환됩니다.
 * @example
 * // maxCount=3: 최대 3번 조건 확인 후 모두 false면 TimeoutError
 * await waitUntil(() => someCondition, 100, 3);
 * @throws TimeoutError 최대 시도 횟수 초과 시
 */
export declare function waitUntil(
  forwarder: () => boolean | Promise<boolean>,
  milliseconds?: number,
  maxCount?: number,
): Promise<void>;
/**
 * 지정된 시간만큼 대기
 * @param millisecond 대기 시간 (ms)
 */
export declare function waitTime(millisecond: number): Promise<void>;
//# sourceMappingURL=wait.d.ts.map
