import clsx from "clsx";
import { type Component, createEffect, createMemo, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createIMEHandler } from "../../../hooks/createIMEHandler";
import { type FieldSize, textAreaSizeClasses, getTextareaWrapperClass } from "./Field.styles";
import { PlaceholderFallback } from "./FieldPlaceholder";
import { Invalid } from "../../form-control/Invalid";

export interface TextareaProps {
  /** Input value */
  value?: string;

  /** Value change callback */
  onValueChange?: (value: string) => void;

  /** Placeholder */
  placeholder?: string;

  /** Title (tooltip) */
  title?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Read-only */
  readonly?: boolean;

  /** Size */
  size?: FieldSize;

  /** Borderless style */
  inset?: boolean;

  /** Minimum rows (default: 1) */
  minRows?: number;

  /** Required input */
  required?: boolean;

  /** Minimum length */
  minLength?: number;

  /** Maximum length */
  maxLength?: number;

  /** Custom validation function */
  validate?: (value: string) => string | undefined;

  /** touchMode: Show error only after blur */
  touchMode?: boolean;

  /** Custom class */
  class?: string;

  /** Custom style */
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
 * Textarea component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Textarea value={text()} onValueChange={setText} />
 *
 * // Specify minimum rows
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

  // Delay onValueChange during IME composition to prevent DOM recreation (Korean composition break)
  const ime = createIMEHandler((v) => setValue(v));

  // Display value for content div (includes composingValue — determines cell width/height)
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

      // Manually dispatch input event to sync value
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  };

  const contentForHeight = () => {
    const rows = local.minRows ?? 1;
    const val = displayValue();
    const content =
      val !== "" && val.split("\n").length >= rows ? val : "\n".repeat(rows - 1) + "\u00A0";
    // Add space if ending with newline to ensure empty line height
    return content.endsWith("\n") ? content + "\u00A0" : content;
  };

  // Wrapper class (exclude local.class when includeCustomClass=false — only apply to outer in inset)
  const getWrapperClass = (includeCustomClass: boolean) =>
    getTextareaWrapperClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      includeCustomClass: includeCustomClass && local.class,
    });

  const getTextareaClass = () =>
    twMerge(textareaBaseClass, local.size && textAreaSizeClasses[local.size], local.inset && "p-0");

  // Whether editable
  const isEditable = () => !local.disabled && !local.readonly;

  // Flush uncommitted composition value when toggling disabled
  createEffect(() => {
    if (!isEditable()) {
      ime.flushComposition();
    }
  });

  // Validation error message (check in order, return first failure message)
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && !v) return "This is a required field";
    if (v) {
      if (local.minLength != null && v.length < local.minLength)
        return `Enter at least ${local.minLength} characters`;
      if (local.maxLength != null && v.length > local.maxLength)
        return `Enter up to ${local.maxLength} characters`;
    }
    return local.validate?.(v);
  });

  return (
    <Invalid message={errorMsg()} variant="border" touchMode={local.touchMode}>
      <Show
        when={local.inset}
        fallback={
          // standalone mode: maintain existing Show pattern
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
        {/* inset mode: dual-element overlay pattern */}
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
