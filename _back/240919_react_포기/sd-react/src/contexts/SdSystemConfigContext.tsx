import { context } from "../utils/context";
import { signal } from "../utils/signal";
import { useSdLocalStorage } from "./SdLocalStorageContext";
import { useMemo } from "react";


export const { useSdSystemConfig, SdSystemConfigProvider, SdSystemConfigConsumer } = context("SdSystemConfig", () => {
  const sdLocalStorage = useSdLocalStorage();

  return useMemo(() => new class {
    fns$ = signal<{
      set: (key: string, data: any) => Promise<void> | void;
      get: (key: string) => PromiseLike<any>;
    }>();

    async setAsync(key: string, data: any) {
      if (this.fns$.value) {
        await this.fns$.value.set(key, data);
      }
      else {
        sdLocalStorage.set(key, data);
      }
    }

    async getAsync(key: string) {
      if (this.fns$.value) {
        return await this.fns$.value.get(key);
      }
      else {
        return sdLocalStorage.get(key);
      }
    }
  }, []);
});