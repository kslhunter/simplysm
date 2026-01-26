import { type JSX, mergeProps, Show, splitProps, createSignal, untrack, createMemo } from "solid-js";
import { DateOnly, numParseInt } from "@simplysm/core-common";
import { fieldVariants, fieldInsetWidths } from "../styles/field-variants";
import type { BaseFieldProps } from "../types/field.types";

/**
 * SdDateField의 Props 타입
 *
 * @remarks
 * - `type` - 날짜 타입 (date, month, year). 기본값: date
 * - `value` - controlled 모드에서 DateOnly 값
 * - `defaultValue` - uncontrolled 모드에서 초기값
 * - `onChange` - 값 변경 시 호출되는 콜백
 * - `min` - 최소 날짜
 * - `max` - 최대 날짜
 */
export interface SdDateFieldProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "min" | "max" | "size">,
    BaseFieldProps {
  type?: "date" | "month" | "year";
  value?: DateOnly;
  defaultValue?: DateOnly;
  onChange?: (value: DateOnly | undefined) => void;
  min?: DateOnly;
  max?: DateOnly;
}

/**
 * 날짜 필드 컴포넌트
 *
 * @remarks
 * Controlled/Uncontrolled 모드를 모두 지원한다.
 * DateOnly 타입을 사용하여 날짜를 관리한다.
 *
 * @example
 * // Uncontrolled
 * <SdDateField type="date" defaultValue={new DateOnly()} onChange={(v) => console.log(v)} />
 *
 * // Controlled
 * const [date, setDate] = createSignal(new DateOnly());
 * <SdDateField value={date()} onChange={setDate} />
 */
export function SdDateField(props: SdDateFieldProps) {
  const merged = mergeProps(
    {
      type: "date" as const,
      disabled: false,
      readonly: false,
    },
    props,
  );

  const [local, rest] = splitProps(merged, [
    "type",
    "value",
    "defaultValue",
    "onChange",
    "min",
    "max",
    "placeholder",
    "title",
    "disabled",
    "readonly",
    "required",
    "size",
    "theme",
    "inline",
    "inset",
    "inputStyle",
    "inputClass",
    "class",
  ]);

  // Controlled vs Uncontrolled
  const [internalValue, setInternalValue] = createSignal<DateOnly | undefined>(untrack(() => local.defaultValue));
  const isControlled = () => local.value !== undefined;
  const currentValue = () => (isControlled() ? local.value : internalValue());

  // 스타일 계산
  const styles = createMemo(() =>
    fieldVariants({
      size: local.size,
      theme: local.theme,
      inline: local.inline,
      inset: local.inset,
      disabled: local.disabled,
      readonly: local.readonly,
    }),
  );

  // input type 결정
  const inputType = () => {
    switch (local.type) {
      case "date":
        return "date";
      case "month":
        return "month";
      case "year":
        return "number";
      default:
        return "date";
    }
  };

  // DateOnly를 input value로 변환
  const toInputValue = (date: DateOnly | undefined): string => {
    if (!date) return "";
    switch (local.type) {
      case "date":
        return date.toFormatString("yyyy-MM-dd");
      case "month":
        return date.toFormatString("yyyy-MM");
      case "year":
        return date.toFormatString("yyyy");
      default:
        return date.toFormatString("yyyy-MM-dd");
    }
  };

  // input value를 DateOnly로 변환
  const fromInputValue = (value: string): DateOnly | undefined => {
    if (!value) return undefined;
    try {
      switch (local.type) {
        case "date":
          return DateOnly.parse(value);
        case "month":
          return DateOnly.parse(`${value}-01`);
        case "year": {
          const year = numParseInt(value);
          return year != null ? new DateOnly(year, 1, 1) : undefined;
        }
        default:
          return DateOnly.parse(value);
      }
    } catch {
      return undefined;
    }
  };

  // min/max를 input 속성용 문자열로 변환
  const minValue = () => (local.min ? toInputValue(local.min) : undefined);
  const maxValue = () => (local.max ? toInputValue(local.max) : undefined);

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = fromInputValue(e.currentTarget.value);

    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalValue(newValue);
      local.onChange?.(newValue);
    }
  };

  // 표시 값 (readonly/disabled 시)
  const displayValue = () => {
    const val = currentValue();
    if (!val) return "";
    switch (local.type) {
      case "date":
        return val.toFormatString("yyyy-MM-dd");
      case "month":
        return val.toFormatString("yyyy-MM");
      case "year":
        return val.toFormatString("yyyy");
      default:
        return val.toFormatString("yyyy-MM-dd");
    }
  };

  // inset 시 고정 너비 클래스
  const insetWidthClass = () => {
    if (!local.inset) return "";
    return fieldInsetWidths[local.type];
  };

  return (
    <div class={styles().container({ class: local.class })}>
      {/* display: inset일 때 항상 렌더링, 아니면 readonly/disabled일 때만 */}
      <Show when={local.inset || local.readonly || local.disabled}>
        <div
          class={styles().display({ class: [local.inputClass, insetWidthClass()].filter(Boolean).join(" ") })}
          style={{
            ...local.inputStyle,
            visibility: !local.readonly && !local.disabled ? "hidden" : undefined,
          }}
          title={local.title ?? local.placeholder}
        >
          <Show when={displayValue()} fallback={<span class="text-text-muted">{local.placeholder ?? "\u00A0"}</span>}>
            {displayValue()}
          </Show>
        </div>
      </Show>

      {/* input: readonly/disabled가 아닐 때만 */}
      <Show when={!local.readonly && !local.disabled}>
        <input
          type={inputType()}
          value={toInputValue(currentValue())}
          placeholder={local.placeholder}
          title={local.title ?? local.placeholder}
          disabled={local.disabled}
          readonly={local.readonly}
          required={local.required}
          min={minValue()}
          max={maxValue()}
          step="any"
          onInput={handleInput}
          class={styles().input({
            class: [
              local.inputClass,
              insetWidthClass(),
              "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
              "dark:[&::-webkit-calendar-picker-indicator]:invert",
            ]
              .filter(Boolean)
              .join(" "),
          })}
          style={local.inputStyle}
          {...rest}
        />
      </Show>
    </div>
  );
}
