import { createEffect, createMemo, type JSX, Show, splitProps } from "solid-js";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createSlot } from "../../../helpers/createSlot";
import { createIMEHandler } from "../../../hooks/createIMEHandler";
import {
  fieldGapClasses,
  fieldInputClass,
  type FieldSize,
  getFieldWrapperClass,
} from "./Field.styles";
import { PlaceholderFallback } from "./FieldPlaceholder";
import { FieldShell } from "./FieldShell";
import { useI18n } from "../../../providers/i18n/I18nProvider";

const [TextInputPrefixSlot, createTextInputPrefixAccessor] = createSlot<{ children: JSX.Element }>();
export const TextInputPrefix = TextInputPrefixSlot;

export interface TextInputProps {
  /** Input value */
  value?: string;

  /** Value change callback */
  onValueChange?: (value: string) => void;

  /** Input type */
  type?: "text" | "password" | "email";

  /** Placeholder */
  placeholder?: string;

  /** Title (tooltip) */
  title?: string;

  /** Autocomplete */
  autocomplete?: JSX.HTMLAutocomplete;

  /** Disabled state */
  disabled?: boolean;

  /** Read-only */
  readOnly?: boolean;

  /** Size */
  size?: FieldSize;

  /** Borderless style */
  inset?: boolean;

  /** Input format (e.g., XXX-XXXX-XXXX) */
  format?: string;

  /** Required input */
  required?: boolean;

  /** Minimum length */
  minLength?: number;

  /** Maximum length */
  maxLength?: number;

  /** Input pattern (regex string or RegExp) */
  pattern?: string | RegExp;

  /** Custom validation function */
  validate?: (value: string) => string | undefined;

  /** touchMode: Show error only after blur */
  touchMode?: boolean;

  /** Custom class */
  class?: string;

  /** Custom style */
  style?: JSX.CSSProperties;

  /** children (TextInput.Prefix slot) */
  children?: JSX.Element;
}

/**
 * Apply format to value
 * @param value original value
 * @param format format string (e.g., XXX-XXXX-XXXX)
 * @returns formatted value
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
 * Remove format characters to extract original value
 * @param formattedValue formatted value
 * @param format format string
 * @returns original value
 */
function removeFormat(formattedValue: string, format: string): string {
  if (!formattedValue || !format) return formattedValue;

  const separators = new Set<string>();
  for (const ch of format) {
    if (ch !== "X") separators.add(ch);
  }

  let result = "";
  for (const ch of formattedValue) {
    if (!separators.has(ch)) {
      result += ch;
    }
  }

  return result;
}

/**
 * TextInput component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TextInput value={text()} onValueChange={setText} />
 *
 * // With format
 * <TextInput format="XXX-XXXX-XXXX" value={phone()} onValueChange={setPhone} />
 *
 * // Password type
 * <TextInput type="password" placeholder="Enter password" />
 * ```
 */
interface TextInputComponent {
  (props: TextInputProps): JSX.Element;
  Prefix: typeof TextInputPrefix;
}

const TextInputInner = (props: TextInputProps) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "type",
    "placeholder",
    "title",
    "autocomplete",
    "disabled",
    "readOnly",
    "size",
    "inset",
    "format",
    "required",
    "minLength",
    "maxLength",
    "pattern",
    "validate",
    "touchMode",
    "class",
    "style",
    "children",
  ]);

  const i18n = useI18n();

  // Support controlled/uncontrolled pattern
  const [value, setValue] = createControllableSignal({
    value: () => local.value ?? "",
    onChange: () => local.onValueChange,
  });

  // Delay onValueChange during IME composition to prevent DOM recreation (Korean composition break)
  const ime = createIMEHandler((v) => setValue(v));

  function extractValue(el: HTMLInputElement): string {
    let val = el.value;
    if (local.format != null && local.format !== "") {
      val = removeFormat(val, local.format);
    }
    return val;
  }

  // Value for input element (excludes composingValue — prevent IME composition disruption)
  const inputValue = () => {
    const val = value();
    if (local.format != null && local.format !== "") {
      return applyFormat(val, local.format);
    }
    return val;
  };

  // Display value for content div (includes composingValue — determines cell width)
  const displayValue = () => {
    const composing = ime.composingValue();
    if (composing != null) {
      if (local.format != null && local.format !== "") {
        return applyFormat(composing, local.format);
      }
      return composing;
    }
    return inputValue();
  };

  const handleCompositionStart = () => ime.handleCompositionStart();

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    ime.handleInput(extractValue(e.currentTarget), e.isComposing);
  };

  const handleCompositionEnd: JSX.EventHandler<HTMLInputElement, CompositionEvent> = (e) => {
    ime.handleCompositionEnd(extractValue(e.currentTarget));
  };

  const [prefix, PrefixProvider] = createTextInputPrefixAccessor();
  const prefixEl = () => prefix() !== undefined;

  // Wrapper class (exclude local.class when includeCustomClass=false — only apply to outer in inset)
  const getWrapperClass = (includeCustomClass: boolean) =>
    getFieldWrapperClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      includeCustomClass: includeCustomClass && local.class,
      extra: prefixEl() && fieldGapClasses[local.size ?? "default"],
    });

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
      if (local.pattern != null && !(local.pattern instanceof RegExp ? local.pattern : new RegExp(local.pattern)).test(v))
        return i18n.t("validation.invalidFormat");
    }
    return local.validate?.(v);
  });

  return (
    <PrefixProvider>
      {local.children}
      <FieldShell
        errorMsg={errorMsg()}
        invalidVariant={local.inset ? "dot" : "border"}
        touchMode={local.touchMode}
        inset={local.inset}
        isEditable={isEditable()}
        wrapperClass={getWrapperClass}
        dataAttr="data-text-field"
        readonlyExtraClass="sd-text-field"
        insetExtraClass="[text-decoration:inherit]"
        style={local.style}
        title={local.title}
        class={local.class}
        rest={rest}
        displayContent={
          <>
            <Show when={prefix()}>
              <span class="shrink-0">{prefix()!.children}</span>
            </Show>
            <PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />
          </>
        }
      >
        <Show when={prefix()}>
          <span class="shrink-0">{prefix()!.children}</span>
        </Show>
        <input
          type={local.type ?? "text"}
          class={fieldInputClass}
          value={inputValue()}
          placeholder={local.placeholder}
          title={local.title}
          autocomplete={local.autocomplete ?? "one-time-code"}
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
        />
      </FieldShell>
    </PrefixProvider>
  );
};

export const TextInput = TextInputInner as unknown as TextInputComponent;
TextInput.Prefix = TextInputPrefix;
