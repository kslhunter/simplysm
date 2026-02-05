import { type Component, type JSX, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { Time } from "@simplysm/core-common";
import { createPropSignal } from "../../../utils/createPropSignal";

type TimeFieldType = "time" | "time-sec";
type TimeFieldSize = "sm" | "lg";

// 기본 wrapper 스타일
const baseClass = clsx(
  "inline-flex items-center",
  "border border-neutral-300 dark:border-neutral-600",
  "rounded",
  "bg-white dark:bg-transparent",
  "focus-within:border-primary-400 dark:focus-within:border-primary-400",
  "px-2 py-1",
);

// 사이즈별 스타일
const sizeClasses: Record<TimeFieldSize, string> = {
  sm: clsx("px-1.5 py-0.5"),
  lg: clsx("px-3 py-2"),
};

// 에러 스타일
const errorClass = clsx("border-danger-500 dark:border-danger-500");

// inset 스타일
const insetClass = clsx("rounded-none border-none bg-transparent");

// disabled 스타일
const disabledClass = clsx(
  "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
);

// input 스타일
const inputClass = clsx("min-w-0 flex-1", "bg-transparent", "outline-none");

export interface TimeFieldProps {
  /** 입력 값 */
  value?: Time;

  /** 값 변경 콜백 */
  onValueChange?: (value: Time | undefined) => void;

  /** 시간 타입 */
  type?: TimeFieldType;

  /** 타이틀 (툴팁) */
  title?: string;

  /** 비활성화 */
  disabled?: boolean;

  /** 읽기 전용 */
  readonly?: boolean;

  /** 에러 상태 */
  error?: boolean;

  /** 사이즈 */
  size?: TimeFieldSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * Time 값을 타입에 맞는 문자열로 변환
 */
function formatValue(value: Time | undefined, type: TimeFieldType): string {
  if (value == null) return "";

  switch (type) {
    case "time":
      return value.toFormatString("HH:mm");
    case "time-sec":
      return value.toFormatString("HH:mm:ss");
  }
}

/**
 * 입력 문자열을 Time으로 변환
 */
function parseValue(str: string, type: TimeFieldType): Time | undefined {
  if (str === "") return undefined;

  switch (type) {
    case "time": {
      // HH:mm 형식
      const match = /^(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new Time(Number(match[1]), Number(match[2]), 0);
    }
    case "time-sec": {
      // HH:mm:ss 형식
      const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new Time(Number(match[1]), Number(match[2]), Number(match[3]));
    }
  }
}

/**
 * TimeField 컴포넌트
 *
 * 시간 입력 필드. time, time-sec 타입을 지원한다.
 * 내부적으로 string ↔ Time 타입 변환을 처리한다.
 *
 * @example
 * ```tsx
 * // 시간 입력 (분 단위)
 * <TimeField type="time" value={time()} onValueChange={setTime} />
 *
 * // 시간 입력 (초 단위)
 * <TimeField type="time-sec" value={time()} onValueChange={setTime} />
 * ```
 */
export const TimeField: Component<TimeFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "type",
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

  // 기본 타입은 time
  const fieldType = () => local.type ?? "time";

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

  // step 속성 (time-sec일 때 1)
  const getStep = () => (fieldType() === "time-sec" ? "1" : undefined);

  return (
    <Show
      when={!isDisplayMode()}
      fallback={
        <div
          class={twMerge(getWrapperClass(), "sd-time-field")}
          style={local.style}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>
      }
    >
      <div class={getWrapperClass()} style={local.style}>
        <input
          type="time"
          class={inputClass}
          value={displayValue()}
          title={local.title}
          step={getStep()}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
