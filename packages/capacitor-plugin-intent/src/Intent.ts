import { registerPlugin } from "@capacitor/core";
import { IActivityResult, IIntentPlugin, IIntentResult, IStartActivityForResultOptions } from "./IIntentPlugin";

const IntentPlugin = registerPlugin<IIntentPlugin>("Intent", {
  web: async () => {
    const { IntentWeb } = await import("./web/IntentWeb");
    return new IntentWeb();
  },
});

/**
 * Android Intent 송수신 플러그인
 * - 산업용 장치(바코드 스캐너, PDA 등) 연동용
 */
export abstract class Intent {
  /**
   * Intent 수신 등록
   * @returns 해제 함수
   *
   * @example
   * ```ts
   * const unsub = await Intent.subscribe(
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
    callback: (result: IIntentResult) => void,
  ): Promise<() => Promise<void>> {
    const { id } = await IntentPlugin.subscribe({ filters }, callback);
    return async () => {
      await IntentPlugin.unsubscribe({ id });
    };
  }

  /**
   * 모든 Intent 수신기 해제
   */
  static async unsubscribeAll(): Promise<void> {
    await IntentPlugin.unsubscribeAll();
  }

  /**
   * Intent 전송
   *
   * @example
   * ```ts
   * await Intent.send({
   *   action: "com.symbol.datawedge.api.ACTION",
   *   extras: {
   *     "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING"
   *   }
   * });
   * ```
   */
  static async send(options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    await IntentPlugin.send(options);
  }

  /**
   * 앱 시작 Intent 가져오기
   */
  static async getLaunchIntent(): Promise<IIntentResult> {
    return await IntentPlugin.getLaunchIntent();
  }

  /**
   * Activity 시작 후 결과 수신
   *
   * @example
   * ```ts
   * const result = await Intent.startActivityForResult({
   *   action: "android.intent.action.GET_CONTENT",
   *   type: "image/*",
   * });
   *
   * if (result.resultCode === -1) { // RESULT_OK
   *   console.log("Selected:", result.data);
   * }
   * ```
   */
  static async startActivityForResult(options: IStartActivityForResultOptions): Promise<IActivityResult> {
    return await IntentPlugin.startActivityForResult(options);
  }
}
