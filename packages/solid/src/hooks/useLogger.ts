import { consola } from "consola";
import { useConfig, type LogAdapter } from "../providers/ConfigContext";

type LogLevel = Parameters<LogAdapter["write"]>[0];

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function useLogger(): Logger {
  const config = useConfig();

  const createLogFunction = (level: LogLevel) => {
    return (...args: unknown[]) => {
      if (config.logger) {
        void config.logger.write(level, ...args);
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
