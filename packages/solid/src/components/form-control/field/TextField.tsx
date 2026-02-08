import clsx from "clsx";
import { type Component, createEffect, createSignal, type JSX, onCleanup, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";
import {
  type FieldSize,
  fieldBaseClass,
  fieldSizeClasses,
  fieldErrorClass,
  fieldInsetClass,
  fieldInsetHeightClass,
  fieldInsetSizeHeightClasses,
  fieldDisabledClass,
  fieldInputClass,
} from "./Field.styles";

type TextFieldType = "text" | "password" | "email";

export interface TextFieldProps {
  /** 입력 값 */
  value?: string;

  /** 값 변경 콜백 */
  onValueChange?: (value: string) => void;

  /** 입력 타입 */
  type?: TextFieldType;

  /** 플레이스홀더 */
  placeholder?: string;

  /** 타이틀 (툴팁) */
  title?: string;

  /** 자동완성 */
  autocomplete?: string;

  /** 비활성화 */
  disabled?: boolean;

  /** 에러 상태 */
  error?: boolean;

  /** 사이즈 */
  size?: FieldSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 입력 포맷 (예: XXX-XXXX-XXXX) */
  format?: string;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * 값에 포맷을 적용한다
 * @param value 원본 값
 * @param format 포맷 문자열 (예: XXX-XXXX-XXXX)
 * @returns 포맷이 적용된 값
 */
function applyFormat(value: string, format: string): string {
  if (!value || !format) return value;

  let result = "";
  let valueIndex = 0;

  for (let i = 0; i < format.length && valueIndex < value.length; i++) {
    if (format[i] === "X") {
      result += value[valueIndex];
      valueIndex++;
    } else {
      result += format[i];
    }
  }

  return result;
}

/**
 * 포맷 문자를 제거하여 원본 값을 추출한다
 * @param formattedValue 포맷이 적용된 값
 * @param format 포맷 문자열
 * @returns 원본 값
 */
function removeFormat(formattedValue: string, format: string): string {
  if (!formattedValue || !format) return formattedValue;

  let result = "";

  for (let i = 0; i < formattedValue.length; i++) {
    const formatChar = format[i];
    if (formatChar === "X") {
      result += formattedValue[i];
    }
    // 포맷 문자가 아닌 경우 (구분자) 스킵
  }

  return result;
}

/**
 * TextField 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <TextField value={text()} onValueChange={setText} />
 *
 * // 포맷 적용
 * <TextField format="XXX-XXXX-XXXX" value={phone()} onValueChange={setPhone} />
 *
 * // password 타입
 * <TextField type="password" placeholder="비밀번호 입력" />
 * ```
 */
export const TextField: Component<TextFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "type",
    "placeholder",
    "title",
    "autocomplete",
    "disabled",
    "error",
    "size",
    "inset",
    "format",
    "class",
    "style",
  ]);

  // controlled/uncontrolled 패턴 지원
  const [value, setValue] = createPropSignal({
    value: () => local.value ?? "",
    onChange: () => local.onValueChange,
  });

  // IME 조합 중 onValueChange를 지연하여 DOM 재생성(한글 조합 끊김) 방지
  // composingValue: 조합 중 content div 표시용 값 (null이면 비조합 상태)
  const [composingValue, setComposingValue] = createSignal<string | null>(null);
  let compositionFlushTimer: ReturnType<typeof setTimeout> | undefined;

  function extractValue(el: HTMLInputElement): string {
    let val = el.value;
    if (local.format != null && local.format !== "") {
      val = removeFormat(val, local.format);
    }
    return val;
  }

  function flushComposition(): void {
    if (compositionFlushTimer != null) {
      clearTimeout(compositionFlushTimer);
      compositionFlushTimer = undefined;
    }
    const pending = composingValue();
    if (pending != null) {
      setComposingValue(null);
      setValue(pending);
    }
  }

  // input 요소용 값 (composingValue 미포함 — IME 조합 방해 방지)
  const inputValue = () => {
    const val = value();
    if (local.format != null && local.format !== "") {
      return applyFormat(val, local.format);
    }
    return val;
  };

  // content div용 표시 값 (composingValue 포함 — 셀 너비 결정)
  const displayValue = () => {
    const composing = composingValue();
    if (composing != null) {
      if (local.format != null && local.format !== "") {
        return applyFormat(composing, local.format);
      }
      return composing;
    }
    return inputValue();
  };

  const handleCompositionStart = () => {
    if (compositionFlushTimer != null) {
      clearTimeout(compositionFlushTimer);
      compositionFlushTimer = undefined;
    }
  };

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const val = extractValue(e.currentTarget);
    if (e.isComposing || compositionFlushTimer != null) {
      // 조합 중이거나 compositionEnd 직후의 input → content div만 갱신, 커밋 안 함
      setComposingValue(val);
      return;
    }
    setComposingValue(null);
    setValue(val);
  };

  const handleCompositionEnd: JSX.EventHandler<HTMLInputElement, CompositionEvent> = (e) => {
    const inputEl = e.currentTarget;
    setComposingValue(extractValue(inputEl));
    compositionFlushTimer = setTimeout(() => {
      compositionFlushTimer = undefined;
      setComposingValue(null);
      setValue(extractValue(inputEl));
    }, 0);
  };

  onCleanup(() => flushComposition());

  // wrapper 클래스 (includeCustomClass=false일 때 local.class 제외 — inset에서 outer에만 적용)
  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.disabled && fieldDisabledClass,
      local.inset && fieldInsetClass,
      local.inset && (local.size ? fieldInsetSizeHeightClasses[local.size] : fieldInsetHeightClass),

      includeCustomClass && local.class,
    );

  // 편집 가능 여부
  const isEditable = () => !local.disabled;

  // disabled 전환 시 미커밋 조합 값 flush
  createEffect(() => {
    if (!isEditable()) {
      flushComposition();
    }
  });

  return (
    <Show
      when={local.inset}
      fallback={
        // standalone 모드: 기존 Show 패턴 유지
        <Show
          when={isEditable()}
          fallback={
            <div {...rest} data-text-field class={twMerge(getWrapperClass(true), "sd-text-field")} style={local.style} title={local.title}>
              {displayValue() || (local.placeholder
                ? <span class="text-base-400 dark:text-base-500">{local.placeholder}</span>
                : "\u00A0")}
            </div>
          }
        >
          <div {...rest} data-text-field class={getWrapperClass(true)} style={local.style}>
            <input
              type={local.type ?? "text"}
              class={fieldInputClass}
              value={inputValue()}
              placeholder={local.placeholder}
              title={local.title}
              autocomplete={local.autocomplete}
              onInput={handleInput}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
            />
          </div>
        </Show>
      }
    >
      {/* inset 모드: dual-element overlay 패턴 */}
      <div
        {...rest}
        data-text-field
        class={twMerge(getWrapperClass(false), "relative", local.class)}
        style={local.style}
      >
        <div
          data-text-field-content
          style={{ visibility: isEditable() ? "hidden" : undefined }}
        >
          {displayValue() || (local.placeholder
            ? <span class="text-base-400 dark:text-base-500">{local.placeholder}</span>
            : "\u00A0")}
        </div>

        <Show when={isEditable()}>
          <input
            type={local.type ?? "text"}
            class={clsx(
              fieldInputClass,
              "absolute left-0 top-0 size-full",
              "px-2 py-1",
            )}
            value={inputValue()}
            placeholder={local.placeholder}
            title={local.title}
            autocomplete={local.autocomplete}
            onInput={handleInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
        </Show>
      </div>
    </Show>
  );
};
