import { WebPlugin } from "@capacitor/core";
import type {
  IntentPlugin,
  IntentResult,
  StartActivityForResultOptions,
  StartActivityForResultResult,
} from "../IntentPlugin";

export class IntentWeb extends WebPlugin implements IntentPlugin {
  private static readonly _warn = () =>
    // eslint-disable-next-line no-console
    console.warn("[Intent] 웹 환경에서는 지원하지 않습니다.");

  subscribe(
    _options: { filters: string[] },
    _callback: (result: IntentResult) => void,
  ): Promise<{ id: string }> {
    IntentWeb._warn();
    return Promise.resolve({ id: "web-stub" });
  }

  async unsubscribe(_options: { id: string }): Promise<void> {
    // 웹에서는 동작 없음
  }

  async unsubscribeAll(): Promise<void> {
    // 웹에서는 동작 없음
  }

  send(_options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    IntentWeb._warn();
    return Promise.resolve();
  }

  getLaunchIntent(): Promise<IntentResult> {
    return Promise.resolve({});
  }

  startActivityForResult(
    _options: StartActivityForResultOptions,
  ): Promise<StartActivityForResultResult> {
    IntentWeb._warn();
    return Promise.resolve({ resultCode: 0 });
  }
}
