import { WebPlugin } from "@capacitor/core";
import type { IBroadcastPlugin, IBroadcastResult } from "../IBroadcastPlugin";

export class BroadcastWeb extends WebPlugin implements IBroadcastPlugin {
  private static readonly _warn = () =>
    // eslint-disable-next-line no-console
    console.warn("[Broadcast] Broadcast is not supported in web environment.");

  subscribe(
    _options: { filters: string[] },
    _callback: (result: IBroadcastResult) => void,
  ): Promise<{ id: string }> {
    BroadcastWeb._warn();
    return Promise.resolve({ id: "web-stub" });
  }

  async unsubscribe(_options: { id: string }): Promise<void> {
    // No-op on web
  }

  async unsubscribeAll(): Promise<void> {
    // No-op on web
  }

  send(_options: { action: string; extras?: Record<string, unknown> }): Promise<void> {
    BroadcastWeb._warn();
    return Promise.resolve();
  }

  getLaunchIntent(): Promise<IBroadcastResult> {
    return Promise.resolve({});
  }
}
