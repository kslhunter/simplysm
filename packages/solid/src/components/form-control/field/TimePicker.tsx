import clsx from "clsx";
import { type Component, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { Time } from "@simplysm/core-common";
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

type TimePickerUnit = "minute" | "second";

export interface TimePickerProps {
  /** 입력 값 */
  value?: Time;

  /** 값 변경 콜백 */
  onValueChange?: (value: Time | undefined) => void;

  /** 시간 단위 */
  unit?: TimePickerUnit;

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
 * Time 값을 input value용 문자열로 변환
 */
function formatValue(value: Time | undefined, unit: TimePickerUnit): string {
  if (value == null) return "";

  switch (unit) {
    case "minute":
      return value.toFormatString("HH:mm");
    case "second":
      return value.toFormatString("HH:mm:ss");
  }
}

/**
 * 입력 문자열을 Time으로 변환
 */
function parseValue(str: string, unit: TimePickerUnit): Time | undefined {
  if (str === "") return undefined;

  switch (unit) {
    case "minute": {
      // HH:mm 형식
      const match = /^(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new Time(Number(match[1]), Number(match[2]), 0);
    }
    case "second": {
      // HH:mm:ss 형식
      const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new Time(Number(match[1]), Number(match[2]), Number(match[3]));
    }
  }
}

/**
 * TimePicker 컴포넌트
 *
 * 시간 입력 필드. minute, second 단위를 지원한다.
 * 내부적으로 string ↔ Time 타입 변환을 처리한다.
 *
 * @example
 * ```tsx
 * // 시간 입력 (분 단위)
 * <TimePicker unit="minute" value={time()} onValueChange={setTime} />
 *
 * // 시간 입력 (초 단위)
 * <TimePicker unit="second" value={time()} onValueChange={setTime} />
 * ```
 */
export const TimePicker: Component<TimePickerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "unit",
    "title",
    "disabled",
    "readonly",
    "size",
    "inset",
    "class",
    "style",
  ]);

  // 기본 단위는 minute
  const fieldType = () => local.unit ?? "minute";

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

  // wrapper 클래스
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

  // step 속성 (second일 때 1)
  const getStep = () => (fieldType() === "second" ? "1" : undefined);

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
              onChange={handleChange}
            />
          </div>
        </Show>
      }
    >
      {/* inset 모드: dual-element overlay 패턴 */}
      <div
        {...rest}
        data-time-field
        class={twMerge(getWrapperClass(false), "relative", local.class)}
        style={local.style}
      >
        <div
          data-time-field-content
          style={{ visibility: isEditable() ? "hidden" : undefined }}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>

        <Show when={isEditable()}>
          <input
            type="time"
            class={clsx(fieldInputClass, "absolute left-0 top-0 size-full", "px-2 py-1")}
            value={displayValue()}
            title={local.title}
            step={getStep()}
            onChange={handleChange}
          />
        </Show>
      </div>
    </Show>
  );
};
