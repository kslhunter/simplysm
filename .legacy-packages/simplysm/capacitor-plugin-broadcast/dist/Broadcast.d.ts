import type { IBroadcastResult } from "./IBroadcastPlugin";
/**
 * Android Broadcast 송수신 플러그인
 * - 산업용 장치(바코드 스캐너, PDA 등) 연동용
 */
export declare abstract class Broadcast {
  /**
   * Broadcast 수신 등록
   * @returns 해제 함수
   *
   * @example
   * ```ts
   * const unsub = await Broadcast.subscribe(
   *   ["com.symbol.datawedge.api.RESULT_ACTION"],
   *   (result) => console.log(result.extras)
   * );
   *
   * // 해제
   * unsub();
   * ```
   */
  static subscribe(
    filters: string[],
    callback: (result: IBroadcastResult) => void,
  ): Promise<() => Promise<void>>;
  /**
   * 모든 Broadcast 수신기 해제
   */
  static unsubscribeAll(): Promise<void>;
  /**
   * Broadcast 전송
   *
   * @example
   * ```ts
   * await Broadcast.send({
   *   action: "com.symbol.datawedge.api.ACTION",
   *   extras: {
   *     "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING"
   *   }
   * });
   * ```
   */
  static send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  /**
   * 앱 시작 Intent 가져오기
   */
  static getLaunchIntent(): Promise<IBroadcastResult>;
}
