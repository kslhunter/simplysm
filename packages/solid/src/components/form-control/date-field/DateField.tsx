import { type Component, type JSX, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { DateOnly } from "@simplysm/core-common";
import { createPropSignal } from "../../../utils/createPropSignal";

type DateFieldType = "year" | "month" | "date";
type DateFieldSize = "sm" | "lg";

// 기본 wrapper 스타일
const baseClass = clsx(
  "inline-flex items-center",
  "border border-neutral-300 dark:border-neutral-600",
  "rounded",
  "bg-white dark:bg-neutral-950",
  "focus-within:border-primary-500",
  "px-2 py-1",
);

// 사이즈별 스타일
const sizeClasses: Record<DateFieldSize, string> = {
  sm: clsx("px-1.5 py-0.5"),
  lg: clsx("px-3 py-2"),
};

// 에러 스타일
const errorClass = clsx("border-danger-500 dark:border-danger-500");

// inset 스타일
const insetClass = clsx("rounded-none border-none bg-transparent");

// disabled 스타일
const disabledClass = clsx("bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400");

// input 스타일
const inputClass = clsx("min-w-0 flex-1", "bg-transparent", "outline-none");

export interface DateFieldProps {
  /** 입력 값 */
  value?: DateOnly;

  /** 값 변경 콜백 */
  onValueChange?: (value: DateOnly | undefined) => void;

  /** 날짜 타입 */
  type?: DateFieldType;

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

  /** 에러 상태 */
  error?: boolean;

  /** 사이즈 */
  size?: DateFieldSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * DateOnly 값을 타입에 맞는 문자열로 변환
 */
function formatValue(value: DateOnly | undefined, type: DateFieldType): string {
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
function parseValue(str: string, type: DateFieldType): DateOnly | undefined {
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
function getInputType(type: DateFieldType): string {
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
function formatMinMax(value: DateOnly | undefined, type: DateFieldType): string | undefined {
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
 * DateField 컴포넌트
 *
 * 날짜 입력 필드. year, month, date 타입을 지원한다.
 * 내부적으로 string ↔ DateOnly 타입 변환을 처리한다.
 *
 * @example
 * ```tsx
 * // 날짜 입력
 * <DateField type="date" value={date()} onValueChange={setDate} />
 *
 * // 연도만 입력
 * <DateField type="year" value={yearDate()} onValueChange={setYearDate} />
 *
 * // 연월 입력
 * <DateField type="month" value={monthDate()} onValueChange={setMonthDate} />
 *
 * // min/max 제한
 * <DateField
 *   type="date"
 *   value={date()}
 *   min={new DateOnly(2025, 1, 1)}
 *   max={new DateOnly(2025, 12, 31)}
 * />
 * ```
 */
export const DateField: Component<DateFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "type",
    "min",
    "max",
    "title",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "class",
    "style",
  ]);

  void rest;

  // 기본 타입은 date
  const fieldType = () => local.type ?? "date";

  // controlled/uncontrolled 패턴 지원
  const [value, setValue] = createPropSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  // 표시 값
  const displayValue = () => formatValue(value(), fieldType());

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value;
    const parsed = parseValue(newValue, fieldType());
    setValue(parsed);
  };

  // wrapper 클래스
  const getWrapperClass = () =>
    twMerge(
      baseClass,
      local.size && sizeClasses[local.size],
      local.error && errorClass,
      local.inset && insetClass,
      (local.disabled || local.readonly) && disabledClass,
      local.class,
    );

  // disabled/readonly일 때 div로 표시
  const isDisplayMode = () => local.disabled || local.readonly;

  return (
    <Show
      when={!isDisplayMode()}
      fallback={
        <div class={twMerge(getWrapperClass(), "sd-date-field")} style={local.style} title={local.title}>
          {displayValue() || "\u00A0"}
        </div>
      }
    >
      <div class={getWrapperClass()} style={local.style}>
        <input
          type={getInputType(fieldType())}
          class={inputClass}
          value={displayValue()}
          title={local.title}
          min={formatMinMax(local.min, fieldType())}
          max={formatMinMax(local.max, fieldType())}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
