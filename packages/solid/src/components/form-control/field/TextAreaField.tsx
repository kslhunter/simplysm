import clsx from "clsx";
import { type Component, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";
import {
  type FieldSize,
  textAreaBaseClass as fieldTextAreaBaseClass,
  textAreaSizeClasses,
  fieldErrorClass,
  fieldInsetClass,
  fieldDisabledClass,
  fieldReadonlyClass,
} from "./Field.styles";

export interface TextAreaFieldProps {
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

  /** 에러 상태 */
  error?: boolean;

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
  "outline-none",
  "px-2 py-1",
  "placeholder:text-base-400 dark:placeholder:text-base-500",
);


/**
 * TextAreaField 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <TextAreaField value={text()} onValueChange={setText} />
 *
 * // 최소 줄 수 지정
 * <TextAreaField minRows={3} value={text()} onValueChange={setText} />
 * ```
 */
export const TextAreaField: Component<TextAreaFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "placeholder",
    "title",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "minRows",
    "class",
    "style",
  ]);

  const [value, setValue] = createPropSignal({
    value: () => local.value ?? "",
    onChange: () => local.onValueChange,
  });

  const handleInput: JSX.InputEventHandler<HTMLTextAreaElement, InputEvent> = (e) => {
    setValue(e.currentTarget.value);
  };

  const contentForHeight = () => {
    const rows = local.minRows ?? 1;
    const val = value();
    const content = (val !== "" && val.split("\n").length >= rows)
      ? val
      : "\n".repeat(rows - 1) + "\u00A0";
    // 마지막이 줄바꿈이면 빈 줄 높이 확보를 위해 공백 추가
    return content.endsWith("\n") ? content + "\u00A0" : content;
  };

  // wrapper 클래스 (includeCustomClass=false일 때 local.class 제외 — inset에서 outer에만 적용)
  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldTextAreaBaseClass,
      local.size && textAreaSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.inset && fieldInsetClass,
      includeCustomClass && local.class,
    );

  const getTextareaClass = () =>
    twMerge(
      textareaBaseClass,
      local.size && textAreaSizeClasses[local.size],
      local.inset && "p-0",
    );

  // 편집 가능 여부
  const isEditable = () => !local.disabled && !local.readonly;

  // inset 모드: dual-element overlay 패턴
  if (local.inset) {
    return (
      <div
        {...rest}
        data-textarea-field
        class={twMerge(getWrapperClass(false), "relative", local.class)}
        style={local.style}
      >
        {/* content div: 항상 DOM에 존재하여 셀 크기 유지 */}
        <div
          data-textarea-field-content
          style={{
            "white-space": "pre-wrap",
            "word-break": "break-all",
            position: "relative",
            ...(isEditable() ? { visibility: "hidden" as const } : {}),
          }}
          title={local.title}
        >
          {/* hidden height calculator — 항상 존재 */}
          <div
            data-hidden-content
            style={{
              visibility: "hidden",
              "white-space": "pre-wrap",
              "word-break": "break-all",
            }}
          >
            {contentForHeight()}
          </div>
          {/* readonly/disabled일 때 실제 텍스트 표시 */}
          <Show when={!isEditable()}>
            <div
              style={{
                position: "absolute",
                left: "0",
                top: "0",
                width: "100%",
                height: "100%",
                "white-space": "pre-wrap",
                "word-break": "break-all",
              }}
            >
              {value() || "\u00A0"}
            </div>
          </Show>
        </div>

        {/* textarea overlay — 편집 가능할 때만 */}
        <Show when={isEditable()}>
          <div
            class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}
            style={{ position: "relative" }}
          >
            <div
              data-hidden-content
              style={{
                visibility: "hidden",
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
              onInput={handleInput}
            />
          </div>
        </Show>
      </div>
    );
  }

  // standalone 모드: 기존 Show 패턴 유지
  return (
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
          {value() || "\u00A0"}
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
            visibility: "hidden",
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
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
