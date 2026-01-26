import { type JSX, mergeProps, Show, splitProps, createSignal, untrack, createMemo } from "solid-js";
import { fieldVariants } from "../styles/field-variants";
import type { BaseFieldProps } from "../types/field.types";

/**
 * SdColorField의 Props 타입
 *
 * @remarks
 * - `value` - controlled 모드에서 색상 값 (hex 형식: #RRGGBB)
 * - `defaultValue` - uncontrolled 모드에서 초기값
 * - `onChange` - 값 변경 시 호출되는 콜백
 */
export interface SdColorFieldProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "size">,
    BaseFieldProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
}

/**
 * 색상 선택 필드 컴포넌트
 *
 * @remarks
 * Controlled/Uncontrolled 모드를 모두 지원한다.
 * 브라우저의 기본 color picker를 사용한다.
 *
 * @example
 * // Uncontrolled
 * <SdColorField defaultValue="#ff0000" onChange={(v) => console.log(v)} />
 *
 * // Controlled
 * const [color, setColor] = createSignal("#ff0000");
 * <SdColorField value={color()} onChange={setColor} />
 */
export function SdColorField(props: SdColorFieldProps) {
  const merged = mergeProps(
    {
      disabled: false,
      readonly: false,
    },
    props,
  );

  const [local, rest] = splitProps(merged, [
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
  const [internalValue, setInternalValue] = createSignal(untrack(() => local.defaultValue ?? "#000000"));
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

  // 높이 계산 (size에 따라) - 버튼 py와 동일하게 맞춤
  const colorHeight = () => {
    switch (local.size) {
      case "sm":
        return "calc(1em * 1.5 + var(--spacing-ctrl-xs) * 2)";
      case "lg":
        return "calc(1em * 1.5 + var(--spacing-ctrl) * 2)";
      default:
        return "calc(1em * 1.5 + var(--spacing-ctrl-sm) * 2)";
    }
  };

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value || undefined;

    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalValue(newValue ?? "#000000");
      local.onChange?.(newValue);
    }
  };

  // display에 표시되는 값
  const displayValue = () => currentValue() || "";

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
            <div
              class="
                inline-block h-4 w-6 rounded-sm border border-black/10
                align-middle
                dark:border-white/10
              "
              style={{ "background-color": displayValue() }}
            />
            <span class="ml-2 align-middle">{displayValue()}</span>
          </Show>
        </div>
      </Show>

      {/* input: readonly/disabled가 아닐 때만 */}
      <Show when={!local.readonly && !local.disabled}>
        <input
          type="color"
          value={currentValue()}
          title={local.title ?? local.placeholder}
          disabled={local.disabled}
          readonly={local.readonly}
          required={local.required}
          onInput={handleInput}
          class={styles().input({ class: [local.inputClass, "p-0", "cursor-pointer"].filter(Boolean).join(" ") })}
          style={{
            ...local.inputStyle,
            height: colorHeight(),
          }}
          {...rest}
        />
      </Show>
    </div>
  );
}
