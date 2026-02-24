import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type { IBroadcastPlugin, IBroadcastResult } from "./IBroadcastPlugin";

const BroadcastPlugin = registerPlugin<IBroadcastPlugin>("Broadcast", {
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
    callback: (result: IBroadcastResult) => void,
  ): Promise<() => Promise<void>> {
    const { id } = await BroadcastPlugin.subscribe({ filters }, (result) => {
      // Filter out the initial resolve that only contains { id }
      if (result.action != null) {
        callback(result);
      }
    });
    return async () => {
      await BroadcastPlugin.unsubscribe({ id });
    };
  }

  /**
   * Unsubscribe all broadcast receivers
   */
  static async unsubscribeAll(): Promise<void> {
    await BroadcastPlugin.unsubscribeAll();
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
    await BroadcastPlugin.send(options);
  }

  /**
   * Get launch intent
   */
  static async getLaunchIntent(): Promise<IBroadcastResult> {
    return BroadcastPlugin.getLaunchIntent();
  }

  /**
   * Register listener for new intents received while app is running
   * @returns Listener handle (release with remove())
   */
  static async addNewIntentListener(
    callback: (result: IBroadcastResult) => void,
  ): Promise<PluginListenerHandle> {
    return BroadcastPlugin.addListener("onNewIntent", callback);
  }
}
