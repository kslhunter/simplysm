import { type JSX, mergeProps, Show, splitProps, createSignal, untrack, createMemo } from "solid-js";
import { DateTime } from "@simplysm/core-common";
import { fieldVariants, fieldInsetWidths } from "../styles/field-variants";
import type { BaseFieldProps } from "../types/field.types";

/**
 * SdDateTimeField의 Props 타입
 *
 * @remarks
 * - `type` - 날짜시간 타입 (datetime, datetime-sec). 기본값: datetime
 * - `value` - controlled 모드에서 DateTime 값
 * - `defaultValue` - uncontrolled 모드에서 초기값
 * - `onChange` - 값 변경 시 호출되는 콜백
 */
export interface SdDateTimeFieldProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "size">,
    BaseFieldProps {
  type?: "datetime" | "datetime-sec";
  value?: DateTime;
  defaultValue?: DateTime;
  onChange?: (value: DateTime | undefined) => void;
}

/**
 * 날짜시간 필드 컴포넌트
 *
 * @remarks
 * Controlled/Uncontrolled 모드를 모두 지원한다.
 * DateTime 타입을 사용하여 날짜와 시간을 함께 관리한다.
 *
 * @example
 * // Uncontrolled
 * <SdDateTimeField type="datetime" defaultValue={new DateTime()} onChange={(v) => console.log(v)} />
 *
 * // Controlled
 * const [dateTime, setDateTime] = createSignal(new DateTime());
 * <SdDateTimeField value={dateTime()} onChange={setDateTime} />
 */
export function SdDateTimeField(props: SdDateTimeFieldProps) {
  const merged = mergeProps(
    {
      type: "datetime" as const,
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
  const [internalValue, setInternalValue] = createSignal<DateTime | undefined>(untrack(() => local.defaultValue));
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

  // step 결정 (datetime-sec는 초 단위)
  const step = () => (local.type === "datetime-sec" ? "1" : "any");

  // DateTime을 input value로 변환
  const toInputValue = (dateTime: DateTime | undefined): string => {
    if (!dateTime) return "";
    switch (local.type) {
      case "datetime":
        return dateTime.toFormatString("yyyy-MM-ddTHH:mm");
      case "datetime-sec":
        return dateTime.toFormatString("yyyy-MM-ddTHH:mm:ss");
      default:
        return dateTime.toFormatString("yyyy-MM-ddTHH:mm");
    }
  };

  // input value를 DateTime으로 변환
  const fromInputValue = (value: string): DateTime | undefined => {
    if (!value) return undefined;
    try {
      return DateTime.parse(value);
    } catch {
      return undefined;
    }
  };

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

  // 표시 값 (readonly/disabled 시 - 오전/오후 포맷)
  const displayValue = () => {
    const val = currentValue();
    if (!val) return "";
    switch (local.type) {
      case "datetime":
        return val.toFormatString("yyyy-MM-dd tt hh:mm");
      case "datetime-sec":
        return val.toFormatString("yyyy-MM-dd tt hh:mm:ss");
      default:
        return val.toFormatString("yyyy-MM-dd tt hh:mm");
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
          type="datetime-local"
          value={toInputValue(currentValue())}
          placeholder={local.placeholder}
          title={local.title ?? local.placeholder}
          disabled={local.disabled}
          readonly={local.readonly}
          required={local.required}
          step={step()}
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
