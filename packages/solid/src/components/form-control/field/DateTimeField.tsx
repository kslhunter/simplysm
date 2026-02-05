import { type Component, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { DateTime } from "@simplysm/core-common";
import { createPropSignal } from "../../../utils/createPropSignal";
import {
  type FieldSize,
  fieldBaseClass,
  fieldSizeClasses,
  fieldErrorClass,
  fieldInsetClass,
  fieldDisabledClass,
  fieldReadonlyClass,
  fieldInputClass,
} from "./styles";

type DateTimeFieldType = "datetime" | "datetime-sec";

export interface DateTimeFieldProps {
  /** 입력 값 */
  value?: DateTime;

  /** 값 변경 콜백 */
  onValueChange?: (value: DateTime | undefined) => void;

  /** 날짜시간 타입 */
  type?: DateTimeFieldType;

  /** 최소 날짜시간 */
  min?: DateTime;

  /** 최대 날짜시간 */
  max?: DateTime;

  /** 타이틀 (툴팁) */
  title?: string;

  /** 비활성화 */
  disabled?: boolean;

  /** 읽기 전용 */
  readonly?: boolean;

  /** 에러 상태 */
  error?: boolean;

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
 * DateTime 값을 타입에 맞는 문자열로 변환
 */
function formatValue(value: DateTime | undefined, type: DateTimeFieldType): string {
  if (value == null) return "";

  switch (type) {
    case "datetime":
      return value.toFormatString("yyyy-MM-ddTHH:mm");
    case "datetime-sec":
      return value.toFormatString("yyyy-MM-ddTHH:mm:ss");
  }
}

/**
 * 입력 문자열을 DateTime으로 변환
 */
function parseValue(str: string, type: DateTimeFieldType): DateTime | undefined {
  if (str === "") return undefined;

  switch (type) {
    case "datetime": {
      // yyyy-MM-ddTHH:mm 형식
      const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new DateTime(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        0,
      );
    }
    case "datetime-sec": {
      // yyyy-MM-ddTHH:mm:ss 형식
      const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new DateTime(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6]),
      );
    }
  }
}

/**
 * min/max 속성을 타입에 맞는 문자열로 변환
 */
function formatMinMax(value: DateTime | undefined, type: DateTimeFieldType): string | undefined {
  if (value == null) return undefined;

  switch (type) {
    case "datetime":
      return value.toFormatString("yyyy-MM-ddTHH:mm");
    case "datetime-sec":
      return value.toFormatString("yyyy-MM-ddTHH:mm:ss");
  }
}

/**
 * DateTimeField 컴포넌트
 *
 * 날짜시간 입력 필드. datetime, datetime-sec 타입을 지원한다.
 * 내부적으로 string ↔ DateTime 타입 변환을 처리한다.
 *
 * @example
 * ```tsx
 * // 날짜시간 입력 (분 단위)
 * <DateTimeField type="datetime" value={dateTime()} onValueChange={setDateTime} />
 *
 * // 날짜시간 입력 (초 단위)
 * <DateTimeField type="datetime-sec" value={dateTime()} onValueChange={setDateTime} />
 *
 * // min/max 제한
 * <DateTimeField
 *   type="datetime"
 *   value={dateTime()}
 *   min={new DateTime(2025, 1, 1, 0, 0, 0)}
 *   max={new DateTime(2025, 12, 31, 23, 59, 0)}
 * />
 * ```
 */
export const DateTimeField: Component<DateTimeFieldProps> = (props) => {
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

  // 기본 타입은 datetime
  const fieldType = () => local.type ?? "datetime";

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
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.inset && fieldInsetClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.class,
    );

  // disabled/readonly일 때 div로 표시
  const isDisplayMode = () => local.disabled || local.readonly;

  // step 속성 (datetime-sec일 때 1)
  const getStep = () => (fieldType() === "datetime-sec" ? "1" : undefined);

  return (
    <Show
      when={!isDisplayMode()}
      fallback={
        <div
          {...rest}
          class={twMerge(getWrapperClass(), "sd-datetime-field")}
          style={local.style}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>
      }
    >
      <div {...rest} class={getWrapperClass()} style={local.style}>
        <input
          type="datetime-local"
          class={fieldInputClass}
          value={displayValue()}
          title={local.title}
          min={formatMinMax(local.min, fieldType())}
          max={formatMinMax(local.max, fieldType())}
          step={getStep()}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
