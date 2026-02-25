import type { ConsolaInstance } from "consola";

/**
 * Register cleanup handlers for worker process shutdown signals
 *
 * Registers SIGINT and SIGTERM handlers to gracefully cleanup resources
 * before process exit. Both handlers execute the cleanup function and
 * exit with code 0.
 *
 * @param cleanup - Async cleanup function to execute on shutdown
 * @param logger - Consola logger instance for error logging
 */
export function registerCleanupHandlers(
  cleanup: () => Promise<void>,
  logger: ConsolaInstance,
): void {
  const handleSignal = () => {
    cleanup()
      .catch((err) => {
        logger.error("cleanup failed", err);
      })
      .finally(() => {
        process.exit(0);
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
