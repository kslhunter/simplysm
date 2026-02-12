import { consola } from "consola";
import { LogAdapter, type LogEntry } from "../configs/LogConfig";

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function useLogger(): Logger {
  const createLogFunction = (level: LogEntry["level"]) => {
    return (...args: unknown[]) => {
      // Always log to consola
      (consola as any)[level](...args);

      // Optionally write to adapter
      if (LogAdapter.write != null) {
        try {
          const message = args
            .map((arg) => {
              if (typeof arg === "string") {
                return arg;
              }
              if (arg == null) {
                return String(arg);
              }
              try {
                return JSON.stringify(arg);
              } catch {
                return String(arg);
              }
            })
            .join(" ");

          LogAdapter.write({
            level,
            message,
            timestamp: Date.now(),
          });
        } catch (err) {
          consola.error("Failed to write log to adapter:", err);
        }
      }
    };
  };

  return {
    log: createLogFunction("log"),
    info: createLogFunction("info"),
    warn: createLogFunction("warn"),
    error: createLogFunction("error"),
  };
}
