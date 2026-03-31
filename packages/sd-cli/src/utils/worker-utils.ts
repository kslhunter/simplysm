import consola, { type ConsolaInstance, LogLevels } from "consola";
import { SdCliReporter } from "./SdCliReporter";

/**
 * Apply sd-cli reporter and debug log level in worker threads
 *
 * Checks the SD_DEBUG environment variable (set by --debug flag in main process)
 * and applies debug log level to consola in the current worker thread.
 * Must be called at worker module top level.
 */
export function applyDebugLevel(): void {
  consola.options.reporters = [new SdCliReporter()];
  if (process.env["SD_DEBUG"] === "true") {
    consola.level = LogLevels.debug;
  }
}

/**
 * Register cleanup handlers for worker process shutdown signals
 *
 * Registers SIGINT and SIGTERM handlers to gracefully cleanup resources
 * before process exit. Both handlers execute the cleanup function and
 * exit with code 0.
 *
 * @param cleanup - Cleanup function to execute on shutdown (sync or async)
 * @param logger - Consola logger instance for error logging
 */
export function registerCleanupHandlers(
  cleanup: () => void | Promise<void>,
  logger: ConsolaInstance,
): void {
  const handleSignal = () => {
    Promise.resolve(cleanup())
      .then(() => {
        process.exit(0);
      })
      .catch((err) => {
        logger.error("정리 작업 실패", err);
        process.exit(1);
      });
  };

  process.on("SIGTERM", handleSignal);
  process.on("SIGINT", handleSignal);
}

/**
 * Create guard to prevent duplicate calls to Worker function
 *
 * @param label - Function name to use in error message
 * @returns Guard function that throws error if called twice
 */
export function createOnceGuard(label: string): () => void {
  let called = false;
  return () => {
    if (called) {
      throw new Error(`${label} can only be called once per Worker`);
    }
    called = true;
  };
}
