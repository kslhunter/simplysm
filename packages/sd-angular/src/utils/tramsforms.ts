import { NumberUtil } from "@simplysm/sd-core-common";

export function transformBoolean(value: boolean | "" | undefined): boolean {
  return value != null && value !== false;
}

export function transformNumber(value: number | string | undefined): number | undefined {
  return NumberUtil.parseFloat(value);
}
