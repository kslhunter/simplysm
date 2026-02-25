import clsx from "clsx";
import { createContext, createEffect, createMemo, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createSlotComponent } from "../../../helpers/createSlotComponent";
import { createSlotSignal, type SlotAccessor } from "../../../hooks/createSlotSignal";
import { createIMEHandler } from "../../../hooks/createIMEHandler";
import {
  fieldGapClasses,
  fieldInputClass,
  type FieldSize,
  getFieldWrapperClass,
} from "./Field.styles";
import { PlaceholderFallback } from "./FieldPlaceholder";
import { Invalid } from "../../form-control/Invalid";

interface TextInputSlotsContextValue {
  setPrefix: (content: SlotAccessor) => void;
}

const TextInputSlotsContext = createContext<TextInputSlotsContextValue>();

type TextInputType = "text" | "password" | "email";

const TextInputPrefix = createSlotComponent(TextInputSlotsContext, (ctx) => ctx.setPrefix);

export interface TextInputProps {
  /** Input value */
  value?: string;

  /** Value change callback */
  onValueChange?: (value: string) => void;

  /** Input type */
  type?: TextInputType;

  /** Placeholder */
  placeholder?: string;

  /** Title (tooltip) */
  title?: string;

  /** Autocomplete */
  autocomplete?: JSX.HTMLAutocomplete;

  /** Disabled state */
  disabled?: boolean;

  /** Read-only */
  readonly?: boolean;

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

  /** Input pattern (regex string) */
  pattern?: string;

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
    "readonly",
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

  // Register Prefix slot Context
  const [prefix, setPrefix] = createSlotSignal();
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
      if (local.pattern != null && !new RegExp(local.pattern).test(v))
        return "The input format is invalid";
    }
    return local.validate?.(v);
  });

  return (
    <TextInputSlotsContext.Provider value={{ setPrefix }}>
      {local.children}
      <Invalid
        message={errorMsg()}
        variant={local.inset ? "dot" : "border"}
        touchMode={local.touchMode}
      >
        <Show
          when={local.inset}
          fallback={
            // standalone mode: maintain existing Show pattern
            <Show
              when={isEditable()}
              fallback={
                <div
                  {...rest}
                  data-text-field
                  class={twMerge(getWrapperClass(true), "sd-text-field")}
                  style={local.style}
                  title={local.title}
                >
                  <Show when={prefix()}>
                    <span class="shrink-0">{prefix()!()}</span>
                  </Show>
                  <PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />
                </div>
              }
            >
              <div {...rest} data-text-field class={getWrapperClass(true)} style={local.style}>
                <Show when={prefix()}>
                  <span class="shrink-0">{prefix()!()}</span>
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
              </div>
            </Show>
          }
        >
          {/* inset mode: dual-element overlay pattern */}
          <div
            {...rest}
            data-text-field
            class={clsx("relative", "[text-decoration:inherit]", local.class)}
            style={local.style}
          >
            <div
              data-text-field-content
              class={getWrapperClass(false)}
              style={{ visibility: isEditable() ? "hidden" : undefined }}
              title={local.title}
            >
              <Show when={prefix()}>
                <span class="shrink-0">{prefix()!()}</span>
              </Show>
              <PlaceholderFallback value={displayValue()} placeholder={local.placeholder} />
            </div>

            <Show when={isEditable()}>
              <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
                <Show when={prefix()}>
                  <span class="shrink-0">{prefix()!()}</span>
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
              </div>
            </Show>
          </div>
        </Show>
      </Invalid>
    </TextInputSlotsContext.Provider>
  );
};

export const TextInput = TextInputInner as unknown as TextInputComponent;
TextInput.Prefix = TextInputPrefix;
