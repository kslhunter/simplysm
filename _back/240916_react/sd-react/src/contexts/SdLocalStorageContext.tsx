import { context } from "../utils/context";
import { JsonConvert } from "@simplysm/sd-core-common";
import { useSdReactConfig } from "./SdReactConfigContext";

export const { SdLocalStorageConsumer, SdLocalStorageProvider, useSdLocalStorage } = context("SdLocalStorage", () => {
  const sdConf = useSdReactConfig();

  return class {
    set(key: string, value: any) {
      localStorage.setItem(`${sdConf.clientName$.current}.${key}`, JsonConvert.stringify(value));
    }

    get(key: string) {
      const json = localStorage.getItem(`${sdConf.clientName$.current}.${key}`);
      if (json == null) return undefined;
      return JsonConvert.parse(json);
    }

    remove(key: string) {
      localStorage.removeItem(`${sdConf.clientName$.current}.${key}`);
    }
  };
});