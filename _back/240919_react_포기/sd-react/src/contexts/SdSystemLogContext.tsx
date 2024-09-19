import { context } from "../utils/context";
import { signal } from "../utils/signal";
import { useMemo } from "react";


export const {
  SdSystemLogProvider,
  useSdSystemLog,
  SdSystemLogConsumer
} = context("SdSystemLog", () => {
  return useMemo(() => new class {
    writeFn$ = signal<(severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void>();

    async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void> {
      if (this.writeFn$.value) {
        await this.writeFn$.value(severity, ...data);
      }
      else {
        // eslint-disable-next-line no-console
        console[severity](...data);
      }
    }
  }, []);
});