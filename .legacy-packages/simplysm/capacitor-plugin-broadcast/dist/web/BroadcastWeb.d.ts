import { WebPlugin } from "@capacitor/core";
import type { IBroadcastPlugin, IBroadcastResult } from "../IBroadcastPlugin";
export declare class BroadcastWeb extends WebPlugin implements IBroadcastPlugin {
  subscribe(
    _options: {
      filters: string[];
    },
    _callback: (result: IBroadcastResult) => void,
  ): Promise<{
    id: string;
  }>;
  unsubscribe(_options: { id: string }): Promise<void>;
  unsubscribeAll(): Promise<void>;
  send(_options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  getLaunchIntent(): Promise<IBroadcastResult>;
}
