import { WebPlugin } from "@capacitor/core";
import { IBroadcastPlugin, IBroadcastResult } from "../IBroadcastPlugin";

export class BroadcastWeb extends WebPlugin implements IBroadcastPlugin {
  async subscribe(
    _options: { filters: string[] },
    _callback: (result: IBroadcastResult) => void,
  ): Promise<{ id: string }> {
    alert("[Broadcast] 웹 환경에서는 Broadcast를 지원하지 않습니다.");
    return await Promise.resolve({ id: "web-stub" });
  }

  async unsubscribe(_options: { id: string }): Promise<void> {
    await Promise.resolve();
  }

  async unsubscribeAll(): Promise<void> {
    await Promise.resolve();
  }

  async send(_options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    alert("[Broadcast] 웹 환경에서는 Broadcast를 지원하지 않습니다.");
    await Promise.resolve();
  }

  async getLaunchIntent(): Promise<IBroadcastResult> {
    return await Promise.resolve({});
  }
}
