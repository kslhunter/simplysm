import clsx from "clsx";
import { type Component, createMemo, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { Time } from "@simplysm/core-common";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { type FieldSize, fieldInputClass, getFieldWrapperClass } from "./Field.styles";
import { Invalid } from "../../form-control/Invalid";

type TimePickerUnit = "minute" | "second";

export interface TimePickerProps {
  /** Input value */
  value?: Time;

  /** Value change callback */
  onValueChange?: (value: Time | undefined) => void;

  /** Time unit */
  unit?: TimePickerUnit;

  /** Title (tooltip) */
  title?: string;

  /** Disable input */
  disabled?: boolean;

  /** Read-only */
  readonly?: boolean;

  /** Size */
  size?: FieldSize;

  /** Borderless style */
  inset?: boolean;

  /** Custom class */
  class?: string;

  /** Custom style */
  style?: JSX.CSSProperties;

  /** Minimum time */
  min?: Time;

  /** Maximum time */
  max?: Time;

  /** Required input */
  required?: boolean;

  /** Custom validation function */
  validate?: (value: Time | undefined) => string | undefined;

  /** touchMode: show errors only after blur */
  touchMode?: boolean;
}

/**
 * Convert Time value to input value string
 */
function formatValue(value: Time | undefined, unit: TimePickerUnit): string {
  if (value == null) return "";

  switch (unit) {
    case "minute":
      return value.toFormatString("HH:mm");
    case "second":
      return value.toFormatString("HH:mm:ss");
  }
}

/**
 * Convert input string to Time
 */
function parseValue(str: string, unit: TimePickerUnit): Time | undefined {
  if (str === "") return undefined;

  switch (unit) {
    case "minute": {
      // HH:mm format
      const match = /^(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new Time(Number(match[1]), Number(match[2]), 0);
    }
    case "second": {
      // HH:mm:ss format
      const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new Time(Number(match[1]), Number(match[2]), Number(match[3]));
    }
  }
}

/**
 * TimePicker component
 *
 * Time input field supporting minute and second units.
 * Handles string ↔ Time type conversion internally.
 *
 * @example
 * ```tsx
 * // Time input (minute unit)
 * <TimePicker unit="minute" value={time()} onValueChange={setTime} />
 *
 * // Time input (second unit)
 * <TimePicker unit="second" value={time()} onValueChange={setTime} />
 * ```
 */
export const TimePicker: Component<TimePickerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "unit",
    "title",
    "disabled",
    "readonly",
    "size",
    "inset",
    "class",
    "style",
    "min",
    "max",
    "required",
    "validate",
    "touchMode",
  ]);

  // Default unit is minute
  const fieldType = () => local.unit ?? "minute";

  // Support controlled/uncontrolled pattern
  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  // Display value
  const displayValue = () => formatValue(value(), fieldType());

  // Change handler (on blur or Enter)
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const newValue = e.currentTarget.value;
    const parsed = parseValue(newValue, fieldType());
    setValue(parsed);
  };

  // Wrapper class
  const getWrapperClass = (includeCustomClass: boolean) =>
    getFieldWrapperClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      includeCustomClass: includeCustomClass && local.class,
      extra: "min-w-24",
    });

  // Editable check
  const isEditable = () => !local.disabled && !local.readonly;

  // Step attribute (1 when second)
  const getStep = () => (fieldType() === "second" ? "1" : undefined);

  // Validation message (check in order, return first error)
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && v === undefined) return "This field is required";
    if (v !== undefined) {
      if (local.min !== undefined && v.tick < local.min.tick)
        return `Must be greater than or equal to ${local.min.toFormatString("HH:mm:ss")}`;
      if (local.max !== undefined && v.tick > local.max.tick)
        return `Must be less than or equal to ${local.max.toFormatString("HH:mm:ss")}`;
    }
    return local.validate?.(v);
  });

  return (
    <Invalid
      message={errorMsg()}
      variant={local.inset ? "dot" : "border"}
      touchMode={local.touchMode}
    >
      <Show
        when={local.inset}
        fallback={
          // standalone mode
          <Show
            when={isEditable()}
            fallback={
              <div
                {...rest}
                data-time-field
                class={twMerge(getWrapperClass(true), "sd-time-field")}
                style={local.style}
                title={local.title}
              >
                {displayValue() || "\u00A0"}
              </div>
            }
          >
            <div {...rest} data-time-field class={getWrapperClass(true)} style={local.style}>
              <input
                type="time"
                class={fieldInputClass}
                value={displayValue()}
                title={local.title}
                step={getStep()}
                autocomplete="one-time-code"
                onChange={handleChange}
              />
            </div>
          </Show>
        }
      >
        {/* inset mode: dual-element overlay pattern */}
        <div {...rest} data-time-field class={clsx("relative", local.class)} style={local.style}>
          <div
            data-time-field-content
            class={getWrapperClass(false)}
            style={{ visibility: isEditable() ? "hidden" : undefined }}
            title={local.title}
          >
            {displayValue() || "\u00A0"}
          </div>

          <Show when={isEditable()}>
            <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
              <input
                type="time"
                class={fieldInputClass}
                value={displayValue()}
                title={local.title}
                step={getStep()}
                autocomplete="one-time-code"
                onChange={handleChange}
              />
            </div>
          </Show>
        </div>
      </Show>
    </Invalid>
  );
};
