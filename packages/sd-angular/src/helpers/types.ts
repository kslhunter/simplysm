import { Type } from "@angular/core";

export type TypeValidateTypes = Type<any> | "SdThemeString" | "SdSizeString";
export type SdSizeString = "xxs" | "xs" | "sm" | "lg" | "xl" | "xxl";
export type SdThemeString = "primary" | "warning" | "danger" | "info" | "success";