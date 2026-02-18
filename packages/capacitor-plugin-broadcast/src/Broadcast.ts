import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type { IBroadcastPlugin, IBroadcastResult } from "./IBroadcastPlugin";

const BroadcastPlugin = registerPlugin<IBroadcastPlugin>("Broadcast", {
  web: async () => {
    const { BroadcastWeb } = await import("./web/BroadcastWeb");
    return new BroadcastWeb();
  },
});

/**
 * Android Broadcast 송수신 플러그인
 * - 산업용 장치(바코드 스캐너, PDA 등) 연동용
 */
export abstract class Broadcast {
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
  static async subscribe(
    filters: string[],
    callback: (result: IBroadcastResult) => void,
  ): Promise<() => Promise<void>> {
    const { id } = await BroadcastPlugin.subscribe({ filters }, (result) => {
      // Filter out the initial resolve that only contains { id }
      if (result.action != null) {
        callback(result);
      }
    });
    return async () => {
      await BroadcastPlugin.unsubscribe({ id });
    };
  }

  /**
   * 모든 Broadcast 수신기 해제
   */
  static async unsubscribeAll(): Promise<void> {
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
  static async send(options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    await BroadcastPlugin.send(options);
  }

  /**
   * 앱 시작 Intent 가져오기
   */
  static async getLaunchIntent(): Promise<IBroadcastResult> {
    return BroadcastPlugin.getLaunchIntent();
  }

  /**
   * 앱 실행 중 새 Intent 수신 리스너 등록
   * @returns 리스너 핸들 (remove()로 해제)
   */
  static async addNewIntentListener(
    callback: (result: IBroadcastResult) => void,
  ): Promise<PluginListenerHandle> {
    return BroadcastPlugin.addListener("onNewIntent", callback);
  }
}
