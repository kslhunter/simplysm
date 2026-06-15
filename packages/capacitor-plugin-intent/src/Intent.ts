import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type {
  IntentPlugin,
  IntentResult,
  StartActivityForResultOptions,
  StartActivityForResultResult,
} from "./IntentPlugin";

const intentPlugin = registerPlugin<IntentPlugin>("Intent", {
  web: async () => {
    const { IntentWeb } = await import("./web/IntentWeb");
    return new IntentWeb();
  },
});

/**
 * Android 인텐트 플러그인
 * - 브로드캐스트 송수신, 실행 인텐트 조회
 * - 산업용 디바이스 연동용 (바코드 스캐너, PDA 등)
 */
export abstract class Intent {
  /**
   * 브로드캐스트 수신기 등록
   * @returns 구독 해제 함수
   */
  static async subscribe(
    filters: string[],
    callback: (result: IntentResult) => void,
  ): Promise<() => Promise<void>> {
    const { id } = await intentPlugin.subscribe({ filters }, (result) => {
      // { id }만 포함된 초기 resolve를 필터링
      if (result.action != null) {
        callback(result);
      }
    });
    return async () => {
      await intentPlugin.unsubscribe({ id });
    };
  }

  /**
   * 모든 브로드캐스트 수신기 구독 해제
   */
  static async unsubscribeAll(): Promise<void> {
    await intentPlugin.unsubscribeAll();
  }

  /**
   * 브로드캐스트 전송
   */
  static async send(options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    await intentPlugin.send(options);
  }

  /**
   * 실행 인텐트 조회
   */
  static async getLaunchIntent(): Promise<IntentResult> {
    return intentPlugin.getLaunchIntent();
  }

  /**
   * 이벤트 리스너 등록
   * @returns 리스너 핸들 (handle.remove()로 해제)
   */
  static async addListener(
    eventName: "newIntent",
    callback: (result: IntentResult) => void,
  ): Promise<PluginListenerHandle> {
    return intentPlugin.addListener(eventName, callback);
  }

  /**
   * 모든 이벤트 리스너 제거
   */
  static async removeAllListeners(): Promise<void> {
    await intentPlugin.removeAllListeners();
  }

  /**
   * startActivityForResult로 외부 Activity를 실행하고 결과를 수신한다
   */
  static async startActivityForResult(
    options: StartActivityForResultOptions,
  ): Promise<StartActivityForResultResult> {
    return intentPlugin.startActivityForResult(options);
  }
}
