import React, { useContext } from "react";

export type TSdTheme = "modern" | "compact" | "kiosk" | "mobile";

const SdThemeContext = React.createContext<TSdTheme | undefined>(undefined);

export const useSdTheme = () => {
  const ctx = useContext(SdThemeContext);
  if (ctx == null) {
    throw new Error(`'SdThemeProvider'를 찾을 수 없습니다.`);
  }
  return ctx;
};

export const SdThemeProvider = SdThemeContext.Provider;
