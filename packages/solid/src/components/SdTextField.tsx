import { type JSX, mergeProps, Show, splitProps, createSignal, untrack, createMemo } from "solid-js";
import { fieldVariants } from "../styles/field-variants";
import type { BaseFieldProps } from "../types/field.types";

/**
 * SdTextField의 Props 타입
 *
 * @remarks
 * - `type` - 입력 타입 (text, password, email). 기본값: text
 * - `value` - controlled 모드에서 값
 * - `defaultValue` - uncontrolled 모드에서 초기값
 * - `onChange` - 값 변경 시 호출되는 콜백
 * - `minLength` - 최소 문자 길이
 * - `maxLength` - 최대 문자 길이
 * - `pattern` - 정규식 패턴
 * - `autocomplete` - 자동완성 설정
 */
export interface SdTextFieldProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "size">,
    BaseFieldProps {
  type?: "text" | "password" | "email";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  autocomplete?: string;
}

/**
 * 텍스트 필드 컴포넌트
 *
 * @remarks
 * Controlled/Uncontrolled 모드를 모두 지원한다.
 * `value` prop이 있으면 controlled, 없으면 uncontrolled 모드로 동작한다.
 *
 * @example
 * // Uncontrolled
 * <SdTextField defaultValue="초기값" onChange={(v) => console.log(v)} />
 *
 * // Controlled
 * const [value, setValue] = createSignal("초기값");
 * <SdTextField value={value()} onChange={setValue} />
 */
export function SdTextField(props: SdTextFieldProps) {
  const merged = mergeProps(
    {
      type: "text" as const,
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
    "minLength",
    "maxLength",
    "pattern",
    "autocomplete",
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
  const [internalValue, setInternalValue] = createSignal(untrack(() => local.defaultValue ?? ""));
  const isControlled = () => local.value !== undefined;
  const currentValue = () => (isControlled() ? local.value! : internalValue());

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

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value || undefined;

    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalValue(newValue ?? "");
      local.onChange?.(newValue);
    }
  };

  // 표시 값 (readonly/disabled 시)
  const displayValue = () => {
    if (local.type === "password" && currentValue()) {
      return "****";
    }
    return currentValue() || "";
  };

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
          type={local.type}
          value={currentValue()}
          placeholder={local.placeholder}
          title={local.title ?? local.placeholder}
          disabled={local.disabled}
          readonly={local.readonly}
          required={local.required}
          minLength={local.minLength}
          maxLength={local.maxLength}
          pattern={local.pattern}
          autocomplete={local.autocomplete}
          onInput={handleInput}
          class={styles().input({ class: local.inputClass })}
          style={local.inputStyle}
          {...rest}
        />
      </Show>
    </div>
  );
}
