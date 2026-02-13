import clsx from "clsx";
import { type Component, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { DateOnly } from "@simplysm/core-common";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import {
  type FieldSize,
  fieldBaseClass,
  fieldSizeClasses,
  fieldInsetClass,
  fieldInsetHeightClass,
  fieldInsetSizeHeightClasses,
  fieldDisabledClass,
  fieldInputClass,
} from "./Field.styles";

type DatePickerUnit = "year" | "month" | "date";

export interface DatePickerProps {
  /** 입력 값 */
  value?: DateOnly;

  /** 값 변경 콜백 */
  onValueChange?: (value: DateOnly | undefined) => void;

  /** 날짜 단위 */
  unit?: DatePickerUnit;

  /** 최소 날짜 */
  min?: DateOnly;

  /** 최대 날짜 */
  max?: DateOnly;

  /** 타이틀 (툴팁) */
  title?: string;

  /** 비활성화 */
  disabled?: boolean;

  /** 읽기 전용 */
  readonly?: boolean;

  /** 사이즈 */
  size?: FieldSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * DateOnly 값을 input value용 문자열로 변환 (ISO 형식)
 */
function formatValue(value: DateOnly | undefined, type: DatePickerUnit): string {
  if (value == null) return "";

  switch (type) {
    case "year":
      return value.toFormatString("yyyy");
    case "month":
      return value.toFormatString("yyyy-MM");
    case "date":
      return value.toFormatString("yyyy-MM-dd");
  }
}

/**
 * 입력 문자열을 DateOnly로 변환
 */
function parseValue(str: string, type: DatePickerUnit): DateOnly | undefined {
  if (str === "") return undefined;

  switch (type) {
    case "year": {
      const year = Number(str);
      if (Number.isNaN(year)) return undefined;
      return new DateOnly(year, 1, 1);
    }
    case "month": {
      // yyyy-MM 형식
      const match = /^(\d{4})-(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new DateOnly(Number(match[1]), Number(match[2]), 1);
    }
    case "date": {
      // yyyy-MM-dd 형식
      return DateOnly.parse(str);
    }
  }
}

/**
 * HTML input의 type 속성 결정
 */
function getInputType(type: DatePickerUnit): string {
  switch (type) {
    case "year":
      return "number";
    case "month":
      return "month";
    case "date":
      return "date";
  }
}

/**
 * min/max 속성을 타입에 맞는 문자열로 변환
 */
function formatMinMax(value: DateOnly | undefined, type: DatePickerUnit): string | undefined {
  if (value == null) return undefined;

  switch (type) {
    case "year":
      return value.toFormatString("yyyy");
    case "month":
      return value.toFormatString("yyyy-MM");
    case "date":
      return value.toFormatString("yyyy-MM-dd");
  }
}

/**
 * DatePicker 컴포넌트
 *
 * 날짜 입력 필드. year, month, date 단위를 지원한다.
 * 내부적으로 string ↔ DateOnly 타입 변환을 처리한다.
 *
 * @example
 * ```tsx
 * // 날짜 입력
 * <DatePicker unit="date" value={date()} onValueChange={setDate} />
 *
 * // 연도만 입력
 * <DatePicker unit="year" value={yearDate()} onValueChange={setYearDate} />
 *
 * // 연월 입력
 * <DatePicker unit="month" value={monthDate()} onValueChange={setMonthDate} />
 *
 * // min/max 제한
 * <DatePicker
 *   unit="date"
 *   value={date()}
 *   min={new DateOnly(2025, 1, 1)}
 *   max={new DateOnly(2025, 12, 31)}
 * />
 * ```
 */
export const DatePicker: Component<DatePickerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "unit",
    "min",
    "max",
    "title",
    "disabled",
    "readonly",
    "size",
    "inset",
    "class",
    "style",
  ]);

  // 기본 단위는 date
  const fieldType = () => local.unit ?? "date";

  // controlled/uncontrolled 패턴 지원
  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  // 표시 값
  const displayValue = () => formatValue(value(), fieldType());

  // 값 확정 핸들러 (포커스 아웃 또는 Enter 시)
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const newValue = e.currentTarget.value;
    const parsed = parseValue(newValue, fieldType());
    setValue(parsed);
  };

  // wrapper 클래스 (includeCustomClass: 외부 class를 포함할지 여부)
  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.disabled && fieldDisabledClass,
      local.inset && fieldInsetClass + " block",
      local.inset && (local.size ? fieldInsetSizeHeightClasses[local.size] : fieldInsetHeightClass),

      includeCustomClass && local.class,
    );

  // 편집 가능 여부
  const isEditable = () => !local.disabled && !local.readonly;

  return (
    <Show
      when={local.inset}
      fallback={
        // standalone 모드: 기존 Show 패턴 유지
        <Show
          when={isEditable()}
          fallback={
            <div
              {...rest}
              data-date-field
              class={twMerge(getWrapperClass(true), "sd-date-field")}
              style={local.style}
              title={local.title}
            >
              {displayValue() || "\u00A0"}
            </div>
          }
        >
          <div {...rest} data-date-field class={getWrapperClass(true)} style={local.style}>
            <input
              type={getInputType(fieldType())}
              class={fieldInputClass}
              value={displayValue()}
              title={local.title}
              min={formatMinMax(local.min, fieldType())}
              max={formatMinMax(local.max, fieldType())}
              onChange={handleChange}
            />
          </div>
        </Show>
      }
    >
      {/* inset 모드: dual-element overlay 패턴 */}
      <div
        {...rest}
        data-date-field
        class={twMerge(getWrapperClass(false), "relative", local.class)}
        style={local.style}
      >
        <div data-date-field-content style={{ visibility: isEditable() ? "hidden" : undefined }} title={local.title}>
          {displayValue() || "\u00A0"}
        </div>

        <Show when={isEditable()}>
          <input
            type={getInputType(fieldType())}
            class={clsx(fieldInputClass, "absolute left-0 top-0 size-full", "px-2 py-1")}
            value={displayValue()}
            title={local.title}
            min={formatMinMax(local.min, fieldType())}
            max={formatMinMax(local.max, fieldType())}
            onChange={handleChange}
          />
        </Show>
      </div>
    </Show>
  );
};
