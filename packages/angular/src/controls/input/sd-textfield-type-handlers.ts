import {
  DateOnly,
  DateTime,
  SdError,
  Time,
} from "@simplysm/core-common";

// region 타입 정의

export type SdTextfieldTypes = {
  "number": number;
  "text": string;
  "password": string;
  "color": string;
  "email": string;
  "format": string;
  "date": DateOnly;
  "month": DateOnly;
  "year": DateOnly;
  "datetime": DateTime;
  "datetime-sec": DateTime;
  "time": Time;
  "time-sec": Time;
};

export const sdTextfieldTypes: (keyof SdTextfieldTypes)[] = [
  "number",
  "text",
  "password",
  "color",
  "email",
  "format",
  "date",
  "month",
  "year",
  "datetime",
  "datetime-sec",
  "time",
  "time-sec",
];

// endregion

// region 핸들러 인터페이스

export interface TextfieldParseOpts {
  format?: string;
}

export interface TextfieldFormatOpts {
  useNumberComma?: boolean;
  format?: string;
}

export interface TextfieldDisplayOpts {
  minDigits?: number;
}

export interface TextfieldValidateOpts {
  required?: boolean;
  min?: unknown;
  max?: unknown;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
  format?: string;
}

export interface TextfieldTypeHandler {
  readonly controlType: string;
  getControlStep(explicitStep: number | undefined): number | string;
  parse(raw: string, opts: TextfieldParseOpts): unknown;
  toControlValue(value: unknown, opts: TextfieldFormatOpts): string;
  toDisplayText(value: unknown, opts: TextfieldDisplayOpts): string | undefined;
  validate(value: unknown, opts: TextfieldValidateOpts): string[];
}

// endregion

// region 문자열 타입 핸들러 (text, password, email, color)

function createStringHandler(type: "text" | "password" | "email" | "color"): TextfieldTypeHandler {
  return {
    controlType: type,
    getControlStep(_explicitStep) {
      return "any";
    },
    parse(raw) {
      return raw;
    },
    toControlValue(value) {
      return value as string;
    },
    toDisplayText() {
      return undefined;
    },
    validate(value, opts) {
      const errors: string[] = [];
      if (value == null) {
        if (opts.required) {
          errors.push("값을 입력하세요.");
        }
        return errors;
      }

      if (type !== "color") {
        const str = value as string;
        if (opts.minlength != null && opts.minlength > str.length) {
          errors.push(`문자의 길이가 ${opts.minlength}보다 길거나 같아야 합니다.`);
        }
        if (opts.maxlength != null && opts.maxlength < str.length) {
          errors.push(`문자의 길이가 ${opts.maxlength}보다 짧거나 같아야 합니다.`);
        }

        const pattern = opts.pattern;
        if (pattern != null && pattern !== "") {
          try {
            const regex = new RegExp(pattern);
            if (!regex.test(str)) {
              errors.push("입력 값이 형식에 맞지 않습니다.");
            }
          } catch (err) {
            throw new SdError(err instanceof Error ? err : new Error(String(err)), `잘못된 pattern: ${pattern}`);
          }
        }
      }

      return errors;
    },
  };
}

// endregion

// region 숫자 타입 핸들러

function createNumberHandler(): TextfieldTypeHandler {
  return {
    controlType: "text",
    getControlStep(explicitStep) {
      return explicitStep ?? "any";
    },
    parse(raw) {
      const inputValue = raw.replace(/[^0-9-.]/g, "");
      if (
        inputValue === ""
        || Number.isNaN(Number(inputValue))
        || inputValue.endsWith(".")
      ) {
        return undefined;
      }
      const result = Number.parseFloat(inputValue);
      return Number.isNaN(result) ? undefined : result;
    },
    toControlValue(value, opts) {
      const num = value as number;
      return opts.useNumberComma !== false
        ? num.toLocaleString(undefined, { maximumFractionDigits: 10 })
        : num.toString(10);
    },
    toDisplayText(value, opts) {
      if (opts.minDigits != null) {
        return (value as number).toLocaleString(undefined, {
          maximumFractionDigits: 10,
          minimumFractionDigits: opts.minDigits,
        });
      }
      return undefined;
    },
    validate(value, opts) {
      const errors: string[] = [];
      if (value == null) {
        if (opts.required) {
          errors.push("값을 입력하세요.");
        }
        return errors;
      }

      if (typeof value !== "number") {
        errors.push("숫자를 입력하세요");
        return errors;
      }

      const min = opts.min;
      const max = opts.max;
      if (typeof min === "number" && min > value) {
        errors.push(`${min}보다 크거나 같아야 합니다.`);
      }
      if (typeof max === "number" && max < value) {
        errors.push(`${max}보다 작거나 같아야 합니다.`);
      }

      return errors;
    },
  };
}

// endregion

// region 포맷 타입 핸들러

function createFormatHandler(): TextfieldTypeHandler {
  return {
    controlType: "text",
    getControlStep(_explicitStep) {
      return "any";
    },
    parse(raw, opts) {
      const format = opts.format;
      if (format == null || format === "") return raw;

      const nonFormatChars = format.match(/[^X]/g)?.filter(
        (v, i, a) => a.indexOf(v) === i,
      );
      if (nonFormatChars != null && nonFormatChars.length > 0) {
        const escaped = nonFormatChars.map((ch) =>
          ch === "]" || ch === "\\" || ch === "^" || ch === "-" ? "\\" + ch : ch,
        ).join("");
        return raw.replace(new RegExp(`[${escaped}]`, "g"), "");
      }
      return raw;
    },
    toControlValue(value, opts) {
      const str = value as string;
      const format = opts.format;
      if (format == null || format === "") return str;

      const formatItems = format.split("|");
      for (const formatItem of formatItems) {
        const fullLength = formatItem.match(/X/g)?.length;
        if (fullLength === str.length) {
          let result = "";
          let valCur = 0;
          for (const formatItemChar of formatItem) {
            if (formatItemChar === "X") {
              result += str[valCur];
              valCur++;
            } else {
              result += formatItemChar;
            }
          }
          return result;
        }
      }

      return str;
    },
    toDisplayText() {
      return undefined;
    },
    validate(value, opts) {
      const errors: string[] = [];
      if (value == null) {
        if (opts.required) {
          errors.push("값을 입력하세요.");
        }
        return errors;
      }

      const format = opts.format;
      if (format != null && format !== "") {
        const formatItems = format.split("|");
        if (
          !formatItems.some(
            (formatItem) => formatItem.match(/X/g)?.length === (value as string).length,
          )
        ) {
          errors.push("문자의 길이가 요구되는 길이와 다릅니다.");
        }
      }

      return errors;
    },
  };
}

// endregion

// region DateOnly 타입 핸들러 (date, month, year)

function createDateOnlyHandler(
  subtype: "date" | "month" | "year",
): TextfieldTypeHandler {
  const controlTypeMap = { date: "date", month: "month", year: "text" } as const;
  const formatMap = {
    date: "yyyy-MM-dd",
    month: "yyyy-MM",
    year: "yyyy",
  } as const;

  return {
    controlType: controlTypeMap[subtype],
    getControlStep(explicitStep) {
      return explicitStep ?? "any";
    },
    parse(raw) {
      try {
        return DateOnly.parse(raw);
      } catch {
        return undefined;
      }
    },
    toControlValue(value) {
      return (value as DateOnly).toFormatString(formatMap[subtype]);
    },
    toDisplayText() {
      return undefined;
    },
    validate(value, opts) {
      const errors: string[] = [];
      if (value == null) {
        if (opts.required) {
          errors.push("값을 입력하세요.");
        }
        return errors;
      }

      if (!(value instanceof DateOnly)) {
        errors.push("날짜를 입력하세요");
        return errors;
      }

      const min = opts.min;
      const max = opts.max;
      if (min instanceof DateOnly && min.tick > value.tick) {
        errors.push(`${min}보다 크거나 같아야 합니다.`);
      }
      if (max instanceof DateOnly && max.tick < value.tick) {
        errors.push(`${max}보다 작거나 같아야 합니다.`);
      }

      return errors;
    },
  };
}

// endregion

// region DateTime 타입 핸들러 (datetime, datetime-sec)

function createDateTimeHandler(withSeconds: boolean): TextfieldTypeHandler {
  const controlFormat = withSeconds ? "yyyy-MM-ddTHH:mm:ss" : "yyyy-MM-ddTHH:mm";
  const displayFormat = withSeconds ? "yyyy-MM-dd tt hh:mm:ss" : "yyyy-MM-dd tt hh:mm";

  return {
    controlType: "datetime-local",
    getControlStep(explicitStep) {
      return explicitStep ?? (withSeconds ? 1 : "any");
    },
    parse(raw) {
      try {
        return DateTime.parse(raw);
      } catch {
        return undefined;
      }
    },
    toControlValue(value) {
      return (value as DateTime).toFormatString(controlFormat);
    },
    toDisplayText(value) {
      return (value as DateTime).toFormatString(displayFormat);
    },
    validate(value, opts) {
      const errors: string[] = [];
      if (value == null) {
        if (opts.required) {
          errors.push("값을 입력하세요.");
        }
        return errors;
      }

      if (!(value instanceof DateTime)) {
        errors.push("날짜 및 시간을 입력하세요");
        return errors;
      }

      const min = opts.min;
      const max = opts.max;
      if (min instanceof DateTime && min.tick > value.tick) {
        errors.push(`${min}보다 크거나 같아야 합니다.`);
      }
      if (max instanceof DateTime && max.tick < value.tick) {
        errors.push(`${max}보다 작거나 같아야 합니다.`);
      }

      return errors;
    },
  };
}

// endregion

// region Time 타입 핸들러 (time, time-sec)

function createTimeHandler(withSeconds: boolean): TextfieldTypeHandler {
  const controlFormat = withSeconds ? "HH:mm:ss" : "HH:mm";
  const displayFormat = withSeconds ? "tt hh:mm:ss" : "tt hh:mm";

  return {
    controlType: "time",
    getControlStep(explicitStep) {
      return explicitStep ?? (withSeconds ? 1 : "any");
    },
    parse(raw) {
      try {
        return Time.parse(raw);
      } catch {
        return undefined;
      }
    },
    toControlValue(value) {
      return (value as DateTime | Time).toFormatString(controlFormat);
    },
    toDisplayText(value) {
      return (value as DateTime | Time).toFormatString(displayFormat);
    },
    validate(value, opts) {
      const errors: string[] = [];
      if (value == null) {
        if (opts.required) {
          errors.push("값을 입력하세요.");
        }
        return errors;
      }

      if (!(value instanceof Time)) {
        errors.push("시간을 입력하세요");
        return errors;
      }

      const min = opts.min;
      const max = opts.max;
      if (min instanceof Time && min.tick > value.tick) {
        errors.push(`${min}보다 크거나 같아야 합니다.`);
      }
      if (max instanceof Time && max.tick < value.tick) {
        errors.push(`${max}보다 작거나 같아야 합니다.`);
      }

      return errors;
    },
  };
}

// endregion

// region 핸들러 맵

export const textfieldTypeHandlers: Record<keyof SdTextfieldTypes, TextfieldTypeHandler> = {
  "text": createStringHandler("text"),
  "password": createStringHandler("password"),
  "email": createStringHandler("email"),
  "color": createStringHandler("color"),
  "number": createNumberHandler(),
  "format": createFormatHandler(),
  "date": createDateOnlyHandler("date"),
  "month": createDateOnlyHandler("month"),
  "year": createDateOnlyHandler("year"),
  "datetime": createDateTimeHandler(false),
  "datetime-sec": createDateTimeHandler(true),
  "time": createTimeHandler(false),
  "time-sec": createTimeHandler(true),
};

// endregion
