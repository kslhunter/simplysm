import {Type} from "@angular/core";

export type TypeValidateTypes = Type<any> | "ThemeStrings" | "SizeStrings";
export type SizeStrings = "xxs" | "xs" | "sm" | "lg" | "xl" | "xxl";
export type ThemeStrings = "primary" | "warning" | "danger" | "info" | "success";