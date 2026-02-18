import clsx from "clsx";
import { type Component, createEffect, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createIMEHandler } from "../../../hooks/createIMEHandler";
import {
  type FieldSize,
  textAreaBaseClass as fieldTextAreaBaseClass,
  textAreaSizeClasses,
  fieldInsetClass,
  fieldDisabledClass,
} from "./Field.styles";
import { textMuted } from "../../../styles/tokens.styles";

export interface TextareaProps {
  /** 입력 값 */
  value?: string;

  /** 값 변경 콜백 */
  onValueChange?: (value: string) => void;

  /** 플레이스홀더 */
  placeholder?: string;

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

  /** 최소 줄 수 (기본값: 1) */
  minRows?: number;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

const textareaBaseClass = clsx(
  "absolute left-0 top-0",
  "size-full",
  "resize-none overflow-hidden",
  "bg-transparent",
  "px-2 py-1",
  "placeholder:text-base-400 dark:placeholder:text-base-500",
);

/**
 * Textarea 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <Textarea value={text()} onValueChange={setText} />
 *
 * // 최소 줄 수 지정
 * <Textarea minRows={3} value={text()} onValueChange={setText} />
 * ```
 */
export const Textarea: Component<TextareaProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "placeholder",
    "title",
    "disabled",
    "readonly",
    "size",
    "inset",
    "minRows",
    "class",
    "style",
  ]);

  const [value, setValue] = createControllableSignal({
    value: () => local.value ?? "",
    onChange: () => local.onValueChange,
  });

  // IME 조합 중 onValueChange를 지연하여 DOM 재생성(한글 조합 끊김) 방지
  const ime = createIMEHandler((v) => setValue(v));

  // content div용 표시 값 (composingValue 포함 — 셀 너비/높이 결정)
  const displayValue = () => ime.composingValue() ?? value();

  const handleCompositionStart = () => ime.handleCompositionStart();

  const handleInput: JSX.InputEventHandler<HTMLTextAreaElement, InputEvent> = (e) => {
    ime.handleInput(e.currentTarget.value, e.isComposing);
  };

  const handleCompositionEnd: JSX.EventHandler<HTMLTextAreaElement, CompositionEvent> = (e) => {
    ime.handleCompositionEnd(e.currentTarget.value);
  };

  const handleKeyDown: JSX.EventHandler<HTMLTextAreaElement, KeyboardEvent> = (e) => {
    if (e.key === "Enter" && e.altKey) {
      e.preventDefault();
      e.stopPropagation();

      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = el.value.substring(0, start);
      const after = el.value.substring(end);
      const newVal = before + "\n" + after;

      el.value = newVal;
      el.selectionStart = start + 1;
      el.selectionEnd = start + 1;

      // input 이벤트를 수동 발행하여 값 동기화
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  };

  const contentForHeight = () => {
    const rows = local.minRows ?? 1;
    const val = displayValue();
    const content =
      val !== "" && val.split("\n").length >= rows ? val : "\n".repeat(rows - 1) + "\u00A0";
    // 마지막이 줄바꿈이면 빈 줄 높이 확보를 위해 공백 추가
    return content.endsWith("\n") ? content + "\u00A0" : content;
  };

  // wrapper 클래스 (includeCustomClass=false일 때 local.class 제외 — inset에서 outer에만 적용)
  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldTextAreaBaseClass,
      local.size && textAreaSizeClasses[local.size],
      local.disabled && fieldDisabledClass,
      local.inset && fieldInsetClass,

      includeCustomClass && local.class,
    );

  const getTextareaClass = () =>
    twMerge(textareaBaseClass, local.size && textAreaSizeClasses[local.size], local.inset && "p-0");

  // 편집 가능 여부
  const isEditable = () => !local.disabled && !local.readonly;

  // disabled 전환 시 미커밋 조합 값 flush
  createEffect(() => {
    if (!isEditable()) {
      ime.flushComposition();
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
            <div
              {...rest}
              data-textarea-field
              class={getWrapperClass(true)}
              style={{ "white-space": "pre-wrap", "word-break": "break-all", ...local.style }}
              title={local.title}
            >
              {value() ||
                (local.placeholder != null && local.placeholder !== "" ? (
                  <span class={textMuted}>{local.placeholder}</span>
                ) : (
                  "\u00A0"
                ))}
            </div>
          }
        >
          <div
            {...rest}
            data-textarea-field
            class={getWrapperClass(true)}
            style={{ position: "relative", ...local.style }}
          >
            <div
              data-hidden-content
              style={{
                "visibility": "hidden",
                "white-space": "pre-wrap",
                "word-break": "break-all",
              }}
            >
              {contentForHeight()}
            </div>

            <textarea
              class={getTextareaClass()}
              value={value()}
              placeholder={local.placeholder}
              title={local.title}
              onKeyDown={handleKeyDown}
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
        data-textarea-field
        class={twMerge(getWrapperClass(false), "relative", local.class)}
        style={local.style}
      >
        <div
          data-textarea-field-content
          style={{
            "visibility": isEditable() ? "hidden" : undefined,
            "white-space": "pre-wrap",
            "word-break": "break-all",
          }}
          title={local.title}
        >
          {isEditable()
            ? contentForHeight()
            : value() ||
              (local.placeholder != null && local.placeholder !== "" ? (
                <span class={textMuted}>{local.placeholder}</span>
              ) : (
                "\u00A0"
              ))}
        </div>

        <Show when={isEditable()}>
          <textarea
            class={twMerge(textareaBaseClass, local.size && textAreaSizeClasses[local.size])}
            value={value()}
            placeholder={local.placeholder}
            title={local.title}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
        </Show>
      </div>
    </Show>
  );
};
