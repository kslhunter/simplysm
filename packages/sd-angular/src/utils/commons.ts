import {NumberUtil} from "@simplysm/sd-core-common";

export function coercionBoolean(value: boolean | string | undefined): boolean {
  return value != null && value !== false;
}

export function coercionNumber(value: number | string | undefined): number | undefined {
  return NumberUtil.parseFloat(value);
}

export function coercionNonNullableNumber(value: number | string): number {
  return NumberUtil.parseFloat(value) ?? 0;
}

// export function transformTheme(value?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey") {
//   return value;
// }

// export function transformColor(value?: string): string | undefined {
//   if (value == null) return undefined;
//
//   if ((/^#[0-9a-fA-F]{6}$/).test(value)) {
//     return value;
//   }
//
//   throw new Error("색상 텍스트 변환 오류: " + value);
// }

// export type TSdTheme = Parameters<typeof transformTheme>[0];

export type TSdFnInfo<F> = [F, ...[() => any, ("one" | "all")?][]];

export function getSdFnCheckData(name: string, sdFn: TSdFnInfo<any> | undefined) {
  return {
    [name]: [sdFn?.[0]],
    ...sdFn ? sdFn.slice(1).toObject((item, i) => `${name}[${i}]`, item => [item[0](), item[1]]) : {}
  };
}

export function sdFnInfo<F extends Function>(fn: F, ...params: [() => any, ("one" | "all")?][]): TSdFnInfo<F> {
  return [fn, ...params];
}