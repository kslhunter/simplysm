import type { PluginListenerHandle } from "@capacitor/core";

export interface IBroadcastResult {
  /** Broadcast action */
  action?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
}

export interface IBroadcastPlugin {
  /**
   * Register broadcast receiver
   */
  subscribe(
    options: { filters: string[] },
    callback: (result: IBroadcastResult) => void,
  ): Promise<{ id: string }>;

  /**
   * Unsubscribe a specific broadcast receiver
   */
  unsubscribe(options: { id: string }): Promise<void>;

  /**
   * Unsubscribe all broadcast receivers
   */
  unsubscribeAll(): Promise<void>;

  /**
   * Send broadcast
   */
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;

  /**
   * Get launch intent
   */
  getLaunchIntent(): Promise<IBroadcastResult>;

  /**
   * Register listener for new intents received while app is running
   */
  addListener(
    eventName: "onNewIntent",
    listenerFunc: (data: IBroadcastResult) => void,
  ): Promise<PluginListenerHandle>;
}
