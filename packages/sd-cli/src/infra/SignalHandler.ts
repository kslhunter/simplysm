/**
 * Class that handles process termination signals
 *
 * Detects SIGINT (Ctrl+C) and SIGTERM signals and
 * provides a Promise that waits until termination.
 */
export class SignalHandler {
  private _terminateResolver: (() => void) | null = null;
  private readonly _terminatePromise: Promise<void>;
  private _terminated = false;

  constructor() {
    this._terminatePromise = new Promise((resolve) => {
      this._terminateResolver = resolve;
    });

    const handler = () => {
      process.off("SIGINT", handler);
      process.off("SIGTERM", handler);
      this._terminated = true;
      this._terminateResolver?.();
    };

    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
  }

  /**
   * Wait until termination signal is received
   */
  waitForTermination(): Promise<void> {
    return this._terminatePromise;
  }

  /**
   * Check if terminated
   */
  isTerminated(): boolean {
    return this._terminated;
  }

  /**
   * Request termination programmatically
   * (used when triggering termination from tests or externally)
   */
  requestTermination(): void {
    if (!this._terminated) {
      this._terminated = true;
      this._terminateResolver?.();
    }
  }
}
