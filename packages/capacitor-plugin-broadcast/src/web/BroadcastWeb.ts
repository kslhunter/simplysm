import { WebPlugin } from "@capacitor/core";
import type { IBroadcastPlugin, IBroadcastResult } from "../IBroadcastPlugin";

export class BroadcastWeb extends WebPlugin implements IBroadcastPlugin {
  private static readonly _warn = () =>
    // eslint-disable-next-line no-console
    console.warn("[Broadcast] 웹 환경에서는 Broadcast를 지원하지 않습니다.");

  subscribe(
    _options: { filters: string[] },
    _callback: (result: IBroadcastResult) => void,
  ): Promise<{ id: string }> {
    BroadcastWeb._warn();
    return Promise.resolve({ id: "web-stub" });
  }

  async unsubscribe(_options: { id: string }): Promise<void> {
    // 웹 환경에서는 no-op
  }

  async unsubscribeAll(): Promise<void> {
    // 웹 환경에서는 no-op
  }

  send(_options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    BroadcastWeb._warn();
    return Promise.resolve();
  }

  getLaunchIntent(): Promise<IBroadcastResult> {
    return Promise.resolve({});
  }
}
