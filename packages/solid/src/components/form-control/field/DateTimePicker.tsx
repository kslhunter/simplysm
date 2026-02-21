import clsx from "clsx";
import { type Component, createMemo, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { DateTime } from "@simplysm/core-common";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { type FieldSize, fieldInputClass, getFieldWrapperClass } from "./Field.styles";
import { Invalid } from "../../form-control/Invalid";

type DateTimePickerUnit = "minute" | "second";

export interface DateTimePickerProps {
  /** 입력 값 */
  value?: DateTime;

  /** 값 변경 콜백 */
  onValueChange?: (value: DateTime | undefined) => void;

  /** 날짜시간 단위 */
  unit?: DateTimePickerUnit;

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

  /** 사이즈 */
  size?: FieldSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;

  /** 필수 입력 여부 */
  required?: boolean;

  /** 커스텀 유효성 검사 함수 */
  validate?: (value: DateTime | undefined) => string | undefined;

  /** touchMode: 포커스 해제 후에만 에러 표시 */
  touchMode?: boolean;
}

/**
 * DateTime 값을 타입에 맞는 문자열로 변환
 */
function formatDateTimeValue(
  value: DateTime | undefined,
  unit: DateTimePickerUnit,
): string | undefined {
  if (value == null) return undefined;

  switch (unit) {
    case "minute":
      return value.toFormatString("yyyy-MM-ddTHH:mm");
    case "second":
      return value.toFormatString("yyyy-MM-ddTHH:mm:ss");
  }
}

/**
 * 입력 문자열을 DateTime으로 변환
 */
function parseValue(str: string, unit: DateTimePickerUnit): DateTime | undefined {
  if (str === "") return undefined;

  switch (unit) {
    case "minute": {
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
    case "second": {
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
 * DateTimePicker 컴포넌트
 *
 * 날짜시간 입력 필드. minute, second 단위를 지원한다.
 * 내부적으로 string ↔ DateTime 타입 변환을 처리한다.
 *
 * @example
 * ```tsx
 * // 날짜시간 입력 (분 단위)
 * <DateTimePicker unit="minute" value={dateTime()} onValueChange={setDateTime} />
 *
 * // 날짜시간 입력 (초 단위)
 * <DateTimePicker unit="second" value={dateTime()} onValueChange={setDateTime} />
 *
 * // min/max 제한
 * <DateTimePicker
 *   unit="minute"
 *   value={dateTime()}
 *   min={new DateTime(2025, 1, 1, 0, 0, 0)}
 *   max={new DateTime(2025, 12, 31, 23, 59, 0)}
 * />
 * ```
 */
export const DateTimePicker: Component<DateTimePickerProps> = (props) => {
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
    "required",
    "validate",
    "touchMode",
  ]);

  // 기본 단위는 minute
  const fieldType = () => local.unit ?? "minute";

  // controlled/uncontrolled 패턴 지원
  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  // 표시 값
  const displayValue = () => formatDateTimeValue(value(), fieldType()) ?? "";

  // 값 확정 핸들러 (포커스 아웃 또는 Enter 시)
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const newValue = e.currentTarget.value;
    const parsed = parseValue(newValue, fieldType());
    setValue(parsed);
  };

  // wrapper 클래스 (includeCustomClass: inset 모드에서는 커스텀 class를 외부 div에 적용)
  const getWrapperClass = (includeCustomClass: boolean) =>
    getFieldWrapperClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      includeCustomClass: includeCustomClass && local.class,
      extra: "min-w-44",
    });

  // 편집 가능 여부
  const isEditable = () => !local.disabled && !local.readonly;

  // step 속성 (second일 때 1)
  const getStep = () => (fieldType() === "second" ? "1" : undefined);

  // 유효성 검사 메시지 (순서대로 검사, 최초 실패 메시지 반환)
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && v === undefined) return "필수 입력 항목입니다";
    if (v !== undefined) {
      if (local.min !== undefined && v.tick < local.min.tick)
        return `${local.min.toFormatString("yyyy-MM-dd HH:mm:ss")}보다 크거나 같아야 합니다`;
      if (local.max !== undefined && v.tick > local.max.tick)
        return `${local.max.toFormatString("yyyy-MM-dd HH:mm:ss")}보다 작거나 같아야 합니다`;
    }
    return local.validate?.(v);
  });

  return (
    <Invalid
      message={errorMsg()}
      variant={local.inset ? "dot" : "border"}
      touchMode={local.touchMode}
    >
      <Show
        when={local.inset}
        fallback={
          // standalone 모드
          <Show
            when={isEditable()}
            fallback={
              <div
                {...rest}
                data-datetime-field
                class={twMerge(getWrapperClass(true), "sd-datetime-field")}
                style={local.style}
                title={local.title}
              >
                {displayValue() || "\u00A0"}
              </div>
            }
          >
            <div {...rest} data-datetime-field class={getWrapperClass(true)} style={local.style}>
              <input
                type="datetime-local"
                class={fieldInputClass}
                value={displayValue()}
                title={local.title}
                min={formatDateTimeValue(local.min, fieldType())}
                max={formatDateTimeValue(local.max, fieldType())}
                step={getStep()}
                autocomplete="one-time-code"
                onChange={handleChange}
              />
            </div>
          </Show>
        }
      >
        {/* inset 모드: dual-element overlay 패턴 */}
        <div
          {...rest}
          data-datetime-field
          class={clsx("relative", local.class)}
          style={local.style}
        >
          <div
            data-datetime-field-content
            class={getWrapperClass(false)}
            style={{ visibility: isEditable() ? "hidden" : undefined }}
            title={local.title}
          >
            {displayValue() || "\u00A0"}
          </div>

          <Show when={isEditable()}>
            <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
              <input
                type="datetime-local"
                class={fieldInputClass}
                value={displayValue()}
                title={local.title}
                min={formatDateTimeValue(local.min, fieldType())}
                max={formatDateTimeValue(local.max, fieldType())}
                step={getStep()}
                autocomplete="one-time-code"
                onChange={handleChange}
              />
            </div>
          </Show>
        </div>
      </Show>
    </Invalid>
  );
};
