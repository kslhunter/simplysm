import { type Component, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { Time } from "@simplysm/core-common";
import { createPropSignal } from "../../../utils/createPropSignal";
import {
  type FieldSize,
  fieldBaseClass,
  fieldSizeClasses,
  fieldErrorClass,
  fieldInsetClass,
  fieldInsetHeightClass,
  fieldInsetSizeHeightClasses,
  fieldDisabledClass,
  fieldInputClass,
} from "./Field.styles";

type TimeFieldType = "time" | "time-sec";

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
 * Time 값을 input value용 문자열로 변환
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
 * Time 값을 locale에 맞는 표시용 문자열로 변환
 */
function formatLocaleValue(value: Time | undefined, type: TimeFieldType): string {
  if (value == null) return "";

  const date = new Date(2000, 0, 1, value.hour, value.minute, value.second);
  switch (type) {
    case "time":
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    case "time-sec":
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
    "error",
    "size",
    "inset",
    "class",
    "style",
  ]);

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
  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.disabled && fieldDisabledClass,
      local.inset && (fieldInsetClass + " block"),
      local.inset && (local.size ? fieldInsetSizeHeightClasses[local.size] : fieldInsetHeightClass),

      includeCustomClass && local.class,
    );

  // 편집 가능 여부
  const isEditable = () => !local.disabled;

  // step 속성 (time-sec일 때 1)
  const getStep = () => (fieldType() === "time-sec" ? "1" : undefined);

  return (
    <Show
      when={local.inset}
      fallback={
        // standalone 모드
        <Show
          when={isEditable()}
          fallback={
            <div
              {...rest}
              data-time-field
              class={twMerge(getWrapperClass(true), "sd-time-field")}
              style={local.style}
              title={local.title}
            >
              {displayValue() || "\u00A0"}
            </div>
          }
        >
          <div {...rest} data-time-field class={getWrapperClass(true)} style={local.style}>
            <input
              type="time"
              class={fieldInputClass}
              value={displayValue()}
              title={local.title}
              step={getStep()}
              onInput={handleInput}
            />
          </div>
        </Show>
      }
    >
      {/* inset 모드: 너비 고정이므로 input만 렌더링 */}
      <Show
        when={isEditable()}
        fallback={
          <div
            {...rest}
            data-time-field
            class={twMerge(getWrapperClass(false), local.class)}
            style={local.style}
            title={local.title}
          >
            {formatLocaleValue(value(), fieldType()) || "\u00A0"}
          </div>
        }
      >
        <input
          {...rest}
          data-time-field
          type="time"
          class={twMerge(getWrapperClass(false), local.class)}
          value={displayValue()}
          title={local.title}
          step={getStep()}
          style={local.style}
          onInput={handleInput}
        />
      </Show>
    </Show>
  );
};
