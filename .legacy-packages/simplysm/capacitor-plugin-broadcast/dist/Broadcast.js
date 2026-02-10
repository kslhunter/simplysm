import { registerPlugin } from "@capacitor/core";
const BroadcastPlugin = registerPlugin("Broadcast", {
  web: async () => {
    const { BroadcastWeb } = await import("./web/BroadcastWeb.d.ts");
    return new BroadcastWeb();
  },
});
/**
 * Android Broadcast 송수신 플러그인
 * - 산업용 장치(바코드 스캐너, PDA 등) 연동용
 */
export class Broadcast {
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
  static async subscribe(filters, callback) {
    const { id } = await BroadcastPlugin.subscribe({ filters }, callback);
    return async () => {
      await BroadcastPlugin.unsubscribe({ id });
    };
  }
  /**
   * 모든 Broadcast 수신기 해제
   */
  static async unsubscribeAll() {
    await BroadcastPlugin.unsubscribeAll();
  }
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
  static async send(options) {
    await BroadcastPlugin.send(options);
  }
  /**
   * 앱 시작 Intent 가져오기
   */
  static async getLaunchIntent() {
    return await BroadcastPlugin.getLaunchIntent();
  }
}
//# sourceMappingURL=Broadcast.js.map
