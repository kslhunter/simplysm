import { SdServiceEventBase } from "@simplysm/sd-service-common";

export function objectWithKey<T>(key: string, value: T): Record<string, T> {
  // noinspection UnnecessaryLocalVariableJS
  const result = (Array.isArray(value) && value.length > 0) || (!Array.isArray(value) && value !== undefined) ? { [key]: value } : {};
  return result;
}

export type TSdTheme = "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";
export const sdThemes = ["primary", "secondary", "info", "success", "warning", "danger", "grey", "blue-grey"];

// INPUT: 구분, 변경키 목록
export class SdSharedDataChangeEvent extends SdServiceEventBase<string, (string | number)[] | undefined> {
}
