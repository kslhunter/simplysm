import { type JSX, mergeProps, Show, splitProps, createSignal, untrack, createMemo } from "solid-js";
import { fieldVariants } from "../styles/field-variants";
import type { BaseFieldProps } from "../types/field.types";

/**
 * SdTextarea의 Props 타입
 *
 * @remarks
 * - `value` - controlled 모드에서 값
 * - `defaultValue` - uncontrolled 모드에서 초기값
 * - `onChange` - 값 변경 시 호출되는 콜백
 * - `minRows` - 최소 행 수. 기본값: 1
 */
export interface SdTextareaProps
  extends Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">,
    BaseFieldProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
  minRows?: number;
}

/**
 * 텍스트 영역 컴포넌트
 *
 * @remarks
 * Controlled/Uncontrolled 모드를 모두 지원한다.
 * `value` prop이 있으면 controlled, 없으면 uncontrolled 모드로 동작한다.
 * 내용에 따라 자동으로 높이가 조절된다.
 *
 * @example
 * // Uncontrolled
 * <SdTextarea defaultValue="초기값" onChange={(v) => console.log(v)} />
 *
 * // Controlled
 * const [value, setValue] = createSignal("초기값");
 * <SdTextarea value={value()} onChange={setValue} />
 *
 * // 최소 행 수 지정
 * <SdTextarea minRows={3} />
 */
export function SdTextarea(props: SdTextareaProps) {
  const merged = mergeProps(
    {
      disabled: false,
      readonly: false,
      minRows: 1,
    },
    props,
  );

  const [local, rest] = splitProps(merged, [
    "value",
    "defaultValue",
    "onChange",
    "minRows",
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

  // 자동 높이 조절을 위한 행 수 계산
  const currentRows = createMemo(() => {
    const lines = (currentValue() || "").split("\n").length;
    return Math.max(local.minRows, lines);
  });

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLTextAreaElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value || undefined;

    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalValue(newValue ?? "");
      local.onChange?.(newValue);
    }
  };

  // 표시 값 (readonly/disabled 시)
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
            <pre class="m-0 font-[inherit] whitespace-pre-wrap">{displayValue()}</pre>
          </Show>
        </div>
      </Show>

      {/* textarea: readonly/disabled가 아닐 때만 */}
      <Show when={!local.readonly && !local.disabled}>
        <textarea
          value={currentValue()}
          placeholder={local.placeholder}
          title={local.title ?? local.placeholder}
          disabled={local.disabled}
          readonly={local.readonly}
          required={local.required}
          rows={currentRows()}
          onInput={handleInput}
          class={styles().input({ class: `resize-none ${local.inputClass ?? ""}`.trim() })}
          style={local.inputStyle}
          {...rest}
        />
      </Show>
    </div>
  );
}
