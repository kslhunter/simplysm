import { consola } from "consola";
import { useLogAdapter, type LogAdapter } from "../providers/LoggerContext";

type LogLevel = Parameters<LogAdapter["write"]>[0];

export interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  /** LogAdapter를 나중에 주입. LoggerProvider 내부에서만 사용 가능 */
  configure: (adapter: LogAdapter) => void;
}

export function useLogger(): Logger {
  const loggerCtx = useLogAdapter();

  const createLogFunction = (level: LogLevel) => {
    return (...args: unknown[]) => {
      // Lazy read: 매 호출마다 현재 adapter를 확인
      const adapter = loggerCtx?.adapter();
      if (adapter) {
        void adapter.write(level, ...args);
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
    configure: (adapter: LogAdapter) => {
      if (!loggerCtx) {
        throw new Error("configure()는 LoggerProvider 내부에서만 사용할 수 있습니다");
      }
      loggerCtx.configure(adapter);
    },
  };
}
