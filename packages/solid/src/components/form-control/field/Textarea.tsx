import clsx from "clsx";
import { type Component, createEffect, createMemo, type JSX, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { text } from "../../../styles/base.styles";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createIMEHandler } from "../../../hooks/createIMEHandler";
import { textAreaSizeClasses, getTextareaWrapperClass } from "./Field.styles";
import type { ComponentSize } from "../../../styles/control.styles";
import { PlaceholderFallback } from "./FieldPlaceholder";
import { FieldShell } from "./FieldShell";
import { useI18n } from "../../../providers/i18n/I18nProvider";

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
  readOnly?: boolean;

  /** Size */
  size?: ComponentSize;

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

  /** lazyValidation: Show error only after blur */
  lazyValidation?: boolean;

  /** Custom class */
  class?: string;

  /** Custom style */
  style?: JSX.CSSProperties;
}


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
    "readOnly",
    "size",
    "inset",
    "minRows",
    "required",
    "minLength",
    "maxLength",
    "validate",
    "lazyValidation",
    "class",
    "style",
  ]);

  const i18n = useI18n();

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
    twMerge(
      getTextareaWrapperClass({
        size: local.size,
        disabled: local.disabled,
        inset: local.inset,
        includeCustomClass: includeCustomClass && local.class,
      }),
      "whitespace-pre-wrap break-all",
    );


  // Whether editable
  const isEditable = () => !local.disabled && !local.readOnly;

  // Flush uncommitted composition value when toggling disabled
  createEffect(() => {
    if (!isEditable()) {
      ime.flushComposition();
    }
  });

  // Validation error message (check in order, return first failure message)
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && !v) return i18n.t("validation.required");
    if (v) {
      if (local.minLength != null && v.length < local.minLength)
        return i18n.t("validation.minLength", { min: String(local.minLength) });
      if (local.maxLength != null && v.length > local.maxLength)
        return i18n.t("validation.maxLength", { max: String(local.maxLength) });
    }
    return local.validate?.(v);
  });

  return (
    <FieldShell
      errorMsg={errorMsg()}
      invalidVariant={local.inset ? "dot" : "border"}
      lazyValidation={local.lazyValidation}
      inset={local.inset}
      isEditable={isEditable()}
      wrapperClass={getWrapperClass}
      dataAttr="data-textarea-field"
      readonlyExtraClass="sd-textarea-field"
      style={local.style}
      title={local.title}
      class={local.class}
      rest={rest}
      displayContent={
        <PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />
      }
      renderSizing={() => (
        isEditable() ? (
          <span style={{ "white-space": "pre-wrap", "word-break": "break-all" }}>
            {contentForHeight()}
          </span>
        ) : (
          <PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />
        )
      )}
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
        class={twMerge(
          clsx(
            "absolute left-0 top-0",
            "size-full",
            "resize-none overflow-hidden",
            "bg-transparent",
            text.placeholder,
          ),
          textAreaSizeClasses[local.size ?? "md"],
          local.inset && "p-0",
        )}
        value={value()}
        placeholder={local.placeholder}
        title={local.title}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
    </FieldShell>
  );
};
