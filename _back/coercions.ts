import { NumberUtil } from "@simplysm/sd-core-common";

export const coercionBoolean =
  <T extends boolean | undefined>(initialValue: T) =>
  (value: boolean | "" | undefined): boolean | T => {
    return value == null ? initialValue : value != false;
  };

export const coercionNumber =
  <T extends number | undefined>(initialValue: T) =>
  (value: number | string | undefined): number | T => {
    return value == null ? initialValue : NumberUtil.parseFloat(value)!;
  };

/*
export function coercionNumber(value: number | string | undefined): number | undefined {
  return NumberUtil.parseFloat(value);
}

export function coercionNumber(): (value: number | string) => number;
export function coercionNumber(initialValue: number): (value: number | "" | undefined) => boolean;
export function coercionNumber(initialValue?: boolean) {
  if (initialValue) {
    return (value: boolean | "" | undefined) => {
      return value == null ? initialValue : value != false;
    };
  } else {
    return (value: boolean | "") => {
      return value != false;
    };
  }
}
*/
