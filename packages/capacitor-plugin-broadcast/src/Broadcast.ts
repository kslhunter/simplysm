import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type { BroadcastPlugin, BroadcastResult } from "./BroadcastPlugin";

const broadcastPlugin = registerPlugin<BroadcastPlugin>("Broadcast", {
  web: async () => {
    const { BroadcastWeb } = await import("./web/BroadcastWeb");
    return new BroadcastWeb();
  },
});

/**
 * Android Broadcast send/receive plugin
 * - For industrial device integration (barcode scanners, PDAs, etc.)
 */
export abstract class Broadcast {
  /**
   * Register broadcast receiver
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsub = await Broadcast.subscribe(
   *   ["com.symbol.datawedge.api.RESULT_ACTION"],
   *   (result) => console.log(result.extras)
   * );
   *
   * // Unsubscribe
   * unsub();
   * ```
   */
  static async subscribe(
    filters: string[],
    callback: (result: BroadcastResult) => void,
  ): Promise<() => Promise<void>> {
    const { id } = await broadcastPlugin.subscribe({ filters }, (result) => {
      // Filter out the initial resolve that only contains { id }
      if (result.action != null) {
        callback(result);
      }
    });
    return async () => {
      await broadcastPlugin.unsubscribe({ id });
    };
  }

  /**
   * Unsubscribe all broadcast receivers
   */
  static async unsubscribeAll(): Promise<void> {
    await broadcastPlugin.unsubscribeAll();
  }

  /**
   * Send broadcast
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
    await broadcastPlugin.send(options);
  }

  /**
   * Get launch intent
   */
  static async getLaunchIntent(): Promise<BroadcastResult> {
    return broadcastPlugin.getLaunchIntent();
  }

  /**
   * Register listener for events
   * @returns Listener handle (release with handle.remove())
   */
  static async addListener(
    eventName: "newIntent",
    callback: (result: BroadcastResult) => void,
  ): Promise<PluginListenerHandle> {
    return broadcastPlugin.addListener(eventName, callback);
  }

  /**
   * Remove all event listeners
   */
  static async removeAllListeners(): Promise<void> {
    await broadcastPlugin.removeAllListeners();
  }
}
