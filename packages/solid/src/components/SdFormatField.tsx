import { type JSX, mergeProps, Show, splitProps, createSignal, untrack, createMemo } from "solid-js";
import { fieldVariants } from "../styles/field-variants";
import type { BaseFieldProps } from "../types/field.types";

/**
 * SdFormatField의 Props 타입
 *
 * @remarks
 * - `format` - 포맷 문자열. X는 입력 문자, 그 외는 구분자. 예: "XXX-XXXX-XXXX" 또는 "XX-XXXX|XXX-XXXX" (다중 포맷)
 * - `value` - controlled 모드에서 값 (구분자 제외 순수 값)
 * - `defaultValue` - uncontrolled 모드에서 초기값
 * - `onChange` - 값 변경 시 호출되는 콜백
 */
export interface SdFormatFieldProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "size">,
    BaseFieldProps {
  format: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
}

/**
 * 포맷 필드 컴포넌트
 *
 * @remarks
 * 전화번호, 사업자등록번호 등 특정 포맷의 입력을 지원한다.
 * 값은 구분자가 제거된 순수 문자열로 저장되고, 표시 시 포맷에 맞게 구분자가 삽입된다.
 *
 * @example
 * // 전화번호 (다중 포맷)
 * <SdFormatField format="XXX-XXXX-XXXX|XX-XXX-XXXX" onChange={(v) => console.log(v)} />
 *
 * // 사업자등록번호
 * <SdFormatField format="XXX-XX-XXXXX" onChange={(v) => console.log(v)} />
 */
export function SdFormatField(props: SdFormatFieldProps) {
  const merged = mergeProps(
    {
      disabled: false,
      readonly: false,
    },
    props,
  );

  const [local, rest] = splitProps(merged, [
    "format",
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
  const [internalValue, setInternalValue] = createSignal<string | undefined>(untrack(() => local.defaultValue));
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

  // 포맷 문자열에서 구분자 문자 추출
  const getNonFormatChars = (format: string): string[] => {
    const chars = format.match(/[^X|]/g);
    return chars ? [...new Set(chars)] : [];
  };

  // 순수 값을 포맷에 맞게 변환
  const formatValue = (value: string | undefined): string => {
    if (value == null || value === "") return "";

    const formatItems = local.format.split("|");

    for (const formatItem of formatItems) {
      const xCount = (formatItem.match(/X/g) || []).length;
      if (xCount === value.length) {
        let result = "";
        let valCur = 0;
        for (const char of formatItem) {
          if (char === "X") {
            result += value[valCur];
            valCur++;
          } else {
            result += char;
          }
        }
        return result;
      }
    }

    // 매칭되는 포맷이 없으면 원본 반환
    return value;
  };

  // 포맷된 값에서 순수 값 추출
  const unformatValue = (formattedValue: string): string => {
    if (!local.format) return formattedValue;

    const nonFormatChars = getNonFormatChars(local.format);
    if (nonFormatChars.length === 0) return formattedValue;

    const regex = new RegExp(`[${nonFormatChars.map((c) => "\\" + c).join("")}]`, "g");
    return formattedValue.replace(regex, "");
  };

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const rawValue = e.currentTarget.value;
    const pureValue = unformatValue(rawValue);
    const newValue = pureValue || undefined;

    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalValue(newValue);
      local.onChange?.(newValue);
    }
  };

  // input에 표시되는 값
  const controlValue = () => formatValue(currentValue());

  // 표시 값 (readonly/disabled 시)
  const displayValue = () => formatValue(currentValue());

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
          value={controlValue()}
          placeholder={local.placeholder}
          title={local.title ?? local.placeholder}
          disabled={local.disabled}
          readonly={local.readonly}
          required={local.required}
          onInput={handleInput}
          class={styles().input({ class: local.inputClass })}
          style={local.inputStyle}
          {...rest}
        />
      </Show>
    </div>
  );
}
