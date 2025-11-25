export interface IReconnectStrategy {
  /**
   * 해당 reconnectCount에서 재연결을 시도할지 여부
   */
  shouldReconnect(reconnectCount: number): boolean;

  /**
   * 해당 reconnectCount에서 재연결까지 대기할 시간(ms)
   */
  getDelayMs(reconnectCount: number): number;
}

/**
 * 기본 재연결 전략
 * - 기존 구현과 동일하게 최대 100번까지 재연결
 * - 각 시도 사이에 2초 대기
 */
export class DefaultReconnectStrategy implements IReconnectStrategy {
  shouldReconnect(reconnectCount: number): boolean {
    // 기존: reconnectCount > 100 이면 종료
    return reconnectCount <= 100;
  }

  getDelayMs(_reconnectCount: number): number {
    // 기존: 항상 2000ms 대기
    return 2000;
  }
}
