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
export function registerCleanupHandlers(cleanup: () => Promise<void>, logger: ConsolaInstance): void {
  const handleSignal = () => {
    cleanup()
      .catch((err) => {
        logger.error("cleanup 실패", err);
      })
      .finally(() => {
        process.exit(0);
      });
  };

  process.on("SIGTERM", handleSignal);
  process.on("SIGINT", handleSignal);
}
