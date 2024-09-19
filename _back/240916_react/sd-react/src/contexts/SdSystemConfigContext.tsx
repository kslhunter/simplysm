import { context } from "../utils/context";
import { signal } from "../utils/signal";
import { useSdLocalStorage } from "./SdLocalStorageContext";


export const { useSdSystemConfig, SdSystemConfigProvider, SdSystemConfigConsumer } = context("SdSystemConfig", () => {
  const sdLocalStorage = useSdLocalStorage();

  const fns$ = signal<{
    set: (key: string, data: any) => Promise<void> | void;
    get: (key: string) => PromiseLike<any>;
  }>();

  return class {
    fns$ = fns$;

    async setAsync(key: string, data: any) {
      if (this.fns$.current) {
        await this.fns$.current.set(key, data);
      }
      else {
        sdLocalStorage.set(key, data);
      }
    }

    async getAsync(key: string) {
      if (this.fns$.current) {
        return await this.fns$.current.get(key);
      }
      else {
        return sdLocalStorage.get(key);
      }
    }
  };
});