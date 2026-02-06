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

  const getWrapperClass = () =>
    twMerge(
      fieldTextAreaBaseClass,
      local.size && textAreaSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.inset && fieldInsetClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.class,
    );

  const getTextareaClass = () =>
    twMerge(
      textareaBaseClass,
      local.size && textAreaSizeClasses[local.size],
      local.inset && "p-0",
    );

  const isDisplayMode = () => local.disabled || local.readonly;

  return (
    <Show
      when={!isDisplayMode()}
      fallback={
        <div
          {...rest}
          data-textarea-field
          class={getWrapperClass()}
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
        class={getWrapperClass()}
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
