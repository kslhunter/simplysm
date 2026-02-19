import { consola } from "consola";
import { useLogAdapter, type LogAdapter } from "../providers/LoggerContext";

type LogLevel = Parameters<LogAdapter["write"]>[0];

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function useLogger(): Logger {
  const logAdapter = useLogAdapter();

  const createLogFunction = (level: LogLevel) => {
    return (...args: unknown[]) => {
      if (logAdapter) {
        void logAdapter.write(level, ...args);
      } else {
        (consola as any)[level](...args);
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
