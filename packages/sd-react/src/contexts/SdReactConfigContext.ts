import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import React, { useContext } from "react";

export interface ISdReactIcon {}

export type TSdReactConfig = {
  clientName: string;
  fallbackIcon: IconDefinition;
  icons: ISdReactIcon;
};

const SdReactConfigContext = React.createContext<TSdReactConfig | undefined>(undefined);

export const useSdReactConfig = () => {
  const ctx = useContext(SdReactConfigContext);
  if (ctx == null) {
    throw new Error(`'SdReactConfigProvider'를 찾을 수 없습니다.`);
  }
  return ctx;
};

export const SdReactConfigProvider = SdReactConfigContext.Provider;
