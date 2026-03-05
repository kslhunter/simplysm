import type { PluginListenerHandle } from "@capacitor/core";

export interface BroadcastResult {
  /** Broadcast action */
  action?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
}

export interface BroadcastPlugin {
  /**
   * Register broadcast receiver
   */
  subscribe(
    options: { filters: string[] },
    callback: (result: BroadcastResult) => void,
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
  getLaunchIntent(): Promise<BroadcastResult>;

  /**
   * Register listener for new intents received while app is running
   */
  addListener(
    eventName: "newIntent",
    listenerFunc: (data: BroadcastResult) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Remove all event listeners
   */
  removeAllListeners(): Promise<void>;
}
