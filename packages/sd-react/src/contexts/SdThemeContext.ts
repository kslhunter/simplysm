import React from "react";

export const SdThemeContext = React.createContext<TSdTheme>("modern");

export type TSdTheme = "modern" | "compact" | "kiosk" | "mobile";
