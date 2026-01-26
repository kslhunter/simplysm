import { type JSX, mergeProps, Show, splitProps, createSignal, untrack, createMemo } from "solid-js";
import { numParseFloat } from "@simplysm/core-common";
import { fieldVariants } from "../styles/field-variants";
import type { BaseFieldProps } from "../types/field.types";

/**
 * SdNumberField의 Props 타입
 *
 * @remarks
 * - `value` - controlled 모드에서 값
 * - `defaultValue` - uncontrolled 모드에서 초기값
 * - `onChange` - 값 변경 시 호출되는 콜백
 * - `min` - 최소값
 * - `max` - 최대값
 * - `step` - 증감 단위
 * - `useComma` - 천단위 콤마 표시 여부. 기본값: true
 * - `minDigits` - 최소 소수점 자릿수 (표시용)
 */
export interface SdNumberFieldProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "min" | "max" | "step" | "size">,
    BaseFieldProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  useComma?: boolean;
  minDigits?: number;
}

/**
 * 숫자 필드 컴포넌트
 *
 * @remarks
 * Controlled/Uncontrolled 모드를 모두 지원한다.
 * 천단위 콤마를 자동으로 표시하며, 숫자가 아닌 문자는 자동으로 제거된다.
 *
 * @example
 * // Uncontrolled
 * <SdNumberField defaultValue={1000} onChange={(v) => console.log(v)} />
 *
 * // Controlled
 * const [value, setValue] = createSignal(1000);
 * <SdNumberField value={value()} onChange={setValue} />
 */
export function SdNumberField(props: SdNumberFieldProps) {
  const merged = mergeProps(
    {
      disabled: false,
      readonly: false,
      useComma: true,
    },
    props,
  );

  const [local, rest] = splitProps(merged, [
    "value",
    "defaultValue",
    "onChange",
    "min",
    "max",
    "step",
    "useComma",
    "minDigits",
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
  const [internalValue, setInternalValue] = createSignal<number | undefined>(untrack(() => local.defaultValue));
  const isControlled = () => local.value !== undefined;
  const currentValue = () => (isControlled() ? local.value : internalValue());

  // input 요소의 표시 값 (사용자 입력 중 중간 상태 유지를 위해)
  const [inputText, setInputText] = createSignal("");
  const [isFocused, setIsFocused] = createSignal(false);

  // 스타일 계산
  const styles = createMemo(() =>
    fieldVariants({
      size: local.size,
      theme: local.theme,
      inline: local.inline,
      inset: local.inset,
      disabled: local.disabled,
      readonly: local.readonly,
      textAlign: "right",
    }),
  );

  // 숫자를 포맷팅된 문자열로 변환
  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return "";
    if (local.useComma) {
      return num.toLocaleString(undefined, {
        maximumFractionDigits: 10,
        minimumFractionDigits: local.minDigits,
      });
    }
    return num.toString();
  };

  // 입력 값 (포커스 중이면 입력 텍스트, 아니면 포맷팅된 값)
  const controlValue = () => {
    if (isFocused()) {
      return inputText();
    }
    return formatNumber(currentValue());
  };

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const rawValue = e.currentTarget.value;
    setInputText(rawValue);

    if (rawValue === "" || rawValue === "-") {
      // 빈 값이거나 마이너스만 입력된 경우
      if (rawValue === "") {
        if (isControlled()) {
          local.onChange?.(undefined);
        } else {
          setInternalValue(undefined);
          local.onChange?.(undefined);
        }
      }
      return;
    }

    // 숫자가 아닌 문자 제거 (숫자, 소수점, 마이너스만 허용)
    const cleanValue = rawValue.replace(/[^0-9.\-]/g, "");

    // 입력 중간 상태: 소수점으로 끝나거나("123."),
    // 소수점 이하만 입력 중인 0인 상태("0.0", "0.00", ".0" 등)
    if (cleanValue.endsWith(".") || (cleanValue.includes(".") && Number(cleanValue) === 0 && cleanValue !== "0")) {
      return;
    }

    const parsed = numParseFloat(cleanValue);
    if (parsed !== undefined) {
      if (isControlled()) {
        local.onChange?.(parsed);
      } else {
        setInternalValue(parsed);
        local.onChange?.(parsed);
      }
    }
  };

  // 포커스 이벤트
  const handleFocus = () => {
    setIsFocused(true);
    // 포커스 시 콤마 제거된 값으로 표시
    const val = currentValue();
    setInputText(val !== undefined ? val.toString() : "");
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // 표시 값 (readonly/disabled 시)
  const displayValue = createMemo(() => formatNumber(currentValue()));

  return (
    <div class={styles().container({ class: local.class })}>
      {/* display: inset일 때 항상 렌더링, 아니면 readonly/disabled일 때만 */}
      <Show when={local.inset || local.readonly || local.disabled}>
        <div
          class={styles().display({ class: local.inputClass })}
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
          type="text"
          inputMode="numeric"
          value={controlValue()}
          placeholder={local.placeholder}
          title={local.title ?? local.placeholder}
          disabled={local.disabled}
          readonly={local.readonly}
          required={local.required}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          class={styles().input({
            class: [
              local.inputClass,
              "[&::-webkit-outer-spin-button]:appearance-none",
              "[&::-webkit-inner-spin-button]:appearance-none",
              "[&::-webkit-outer-spin-button]:m-0",
              "[&::-webkit-inner-spin-button]:m-0",
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
