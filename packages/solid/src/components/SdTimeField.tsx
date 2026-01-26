import { type JSX, mergeProps, Show, splitProps, createSignal, untrack, createMemo } from "solid-js";
import { Time } from "@simplysm/core-common";
import { fieldVariants, fieldInsetWidths } from "../styles/field-variants";
import type { BaseFieldProps } from "../types/field.types";

/**
 * SdTimeField의 Props 타입
 *
 * @remarks
 * - `type` - 시간 타입 (time, time-sec). 기본값: time
 * - `value` - controlled 모드에서 Time 값
 * - `defaultValue` - uncontrolled 모드에서 초기값
 * - `onChange` - 값 변경 시 호출되는 콜백
 */
export interface SdTimeFieldProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "size">,
    BaseFieldProps {
  type?: "time" | "time-sec";
  value?: Time;
  defaultValue?: Time;
  onChange?: (value: Time | undefined) => void;
}

/**
 * 시간 필드 컴포넌트
 *
 * @remarks
 * Controlled/Uncontrolled 모드를 모두 지원한다.
 * Time 타입을 사용하여 시간을 관리한다.
 *
 * @example
 * // Uncontrolled
 * <SdTimeField type="time" defaultValue={new Time(10, 30)} onChange={(v) => console.log(v)} />
 *
 * // Controlled
 * const [time, setTime] = createSignal(new Time(10, 30));
 * <SdTimeField value={time()} onChange={setTime} />
 */
export function SdTimeField(props: SdTimeFieldProps) {
  const merged = mergeProps(
    {
      type: "time" as const,
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
  const [internalValue, setInternalValue] = createSignal<Time | undefined>(untrack(() => local.defaultValue));
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

  // step 결정 (time-sec는 초 단위)
  const step = () => (local.type === "time-sec" ? "1" : "any");

  // Time을 input value로 변환
  const toInputValue = (time: Time | undefined): string => {
    if (!time) return "";
    switch (local.type) {
      case "time":
        return time.toFormatString("HH:mm");
      case "time-sec":
        return time.toFormatString("HH:mm:ss");
      default:
        return time.toFormatString("HH:mm");
    }
  };

  // input value를 Time으로 변환
  const fromInputValue = (value: string): Time | undefined => {
    if (!value) return undefined;
    try {
      return Time.parse(value);
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
      case "time":
        return val.toFormatString("tt hh:mm");
      case "time-sec":
        return val.toFormatString("tt hh:mm:ss");
      default:
        return val.toFormatString("tt hh:mm");
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
          type="time"
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
