import { context } from "../utils/context";
import { signal } from "../utils/signal";


export const {
  SdSystemLogProvider,
  useSdSystemLog,
  SdSystemLogConsumer
} = context("SdSystemLog", () => {
  const writeFn$ = signal<(severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void>();

  return class {
    writeFn$ = writeFn$;

    async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void> {
      if (this.writeFn$.current) {
        await this.writeFn$.current(severity, ...data);
      }
      else {
        // eslint-disable-next-line no-console
        console[severity](...data);
      }
    }
  };
});