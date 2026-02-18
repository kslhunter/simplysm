import clsx from "clsx";
import { type Component, createEffect, createMemo, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createIMEHandler } from "../../../hooks/createIMEHandler";
import { type FieldSize, textAreaSizeClasses, getTextareaWrapperClass } from "./Field.styles";
import { PlaceholderFallback } from "./FieldPlaceholder";
import { Invalid } from "../../form-control/Invalid";

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

  /** 필수 입력 여부 */
  required?: boolean;

  /** 최소 길이 */
  minLength?: number;

  /** 최대 길이 */
  maxLength?: number;

  /** 커스텀 유효성 검사 함수 */
  validate?: (value: string) => string | undefined;

  /** touchMode: 포커스 해제 후에만 에러 표시 */
  touchMode?: boolean;

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
    "required",
    "minLength",
    "maxLength",
    "validate",
    "touchMode",
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
    getTextareaWrapperClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      includeCustomClass: includeCustomClass && local.class,
    });

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

  // 유효성 검사 메시지 (순서대로 검사, 최초 실패 메시지 반환)
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && !v) return "필수 입력 항목입니다";
    if (v) {
      if (local.minLength != null && v.length < local.minLength)
        return `최소 ${local.minLength}자 이상 입력하세요`;
      if (local.maxLength != null && v.length > local.maxLength)
        return `최대 ${local.maxLength}자까지 입력 가능합니다`;
    }
    return local.validate?.(v);
  });

  return (
    <Invalid message={errorMsg()} variant="border" touchMode={local.touchMode}>
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
                <PlaceholderFallback value={value()} placeholder={local.placeholder} />
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
          class={clsx("relative", local.class)}
          style={local.style}
        >
          <div
            data-textarea-field-content
            class={getWrapperClass(false)}
            style={{
              "visibility": isEditable() ? "hidden" : undefined,
              "white-space": "pre-wrap",
              "word-break": "break-all",
            }}
            title={local.title}
          >
            {isEditable() ? (
              contentForHeight()
            ) : (
              <PlaceholderFallback value={value()} placeholder={local.placeholder} />
            )}
          </div>

          <Show when={isEditable()}>
            <div
              class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}
              style={{ position: "relative" }}
            >
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
            </div>
          </Show>
        </div>
      </Show>
    </Invalid>
  );
};
