import { NumberUtil } from "@simplysm/sd-core-common";

export function coercionBoolean(value: boolean | "" | undefined): boolean {
  return value != null && value !== false;
}

export function coercionNumber(value: number | string | undefined): number | undefined {
  return NumberUtil.parseFloat(value);
}
