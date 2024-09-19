import { JsonConvert } from "@simplysm/sd-core-common";
import { useSdReactConfig } from "./SdReactConfigContext";
import { context } from "../utils/context";
import { useMemo } from "react";

export const {
  SdLocalStorageConsumer,
  SdLocalStorageProvider,
  useSdLocalStorage
} = context("SdLocalStorage", <T extends Record<string, any>>() => {
  const sdConf = useSdReactConfig();

  return useMemo(() => new class {
    set<K extends (keyof T & string)>(key: K, value: T[K] | undefined) {
      localStorage.setItem(`${sdConf.clientName$.value}.${key}`, JsonConvert.stringify(value));
    }

    get<K extends (keyof T & string)>(key: K): T[K] | undefined {
      const json = localStorage.getItem(`${sdConf.clientName$.value}.${key}`);
      if (json == null) return undefined;
      return JsonConvert.parse(json);
    }

    remove<K extends (keyof T & string)>(key: K) {
      localStorage.removeItem(`${sdConf.clientName$.value}.${key}`);
    }
  }, []);
});