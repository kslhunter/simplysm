import clsx from "clsx";
import { type Component, createMemo, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { DateTime } from "@simplysm/core-common";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { type FieldSize, fieldInputClass, getFieldWrapperClass } from "./Field.styles";
import { Invalid } from "../../form-control/Invalid";

type DateTimePickerUnit = "minute" | "second";

export interface DateTimePickerProps {
  /** Input value */
  value?: DateTime;

  /** Value change callback */
  onValueChange?: (value: DateTime | undefined) => void;

  /** DateTime unit */
  unit?: DateTimePickerUnit;

  /** Minimum datetime */
  min?: DateTime;

  /** Maximum datetime */
  max?: DateTime;

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

  /** Required input */
  required?: boolean;

  /** Custom validation function */
  validate?: (value: DateTime | undefined) => string | undefined;

  /** touchMode: show errors only after blur */
  touchMode?: boolean;
}

/**
 * Convert DateTime value to format string matching type
 */
function formatDateTimeValue(
  value: DateTime | undefined,
  unit: DateTimePickerUnit,
): string | undefined {
  if (value == null) return undefined;

  switch (unit) {
    case "minute":
      return value.toFormatString("yyyy-MM-ddTHH:mm");
    case "second":
      return value.toFormatString("yyyy-MM-ddTHH:mm:ss");
  }
}

/**
 * Convert input string to DateTime
 */
function parseValue(str: string, unit: DateTimePickerUnit): DateTime | undefined {
  if (str === "") return undefined;

  switch (unit) {
    case "minute": {
      // yyyy-MM-ddTHH:mm format
      const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new DateTime(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        0,
      );
    }
    case "second": {
      // yyyy-MM-ddTHH:mm:ss format
      const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new DateTime(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6]),
      );
    }
  }
}

/**
 * DateTimePicker component
 *
 * DateTime input field supporting minute and second units.
 * Handles string ↔ DateTime type conversion internally.
 *
 * @example
 * ```tsx
 * // DateTime input (minute unit)
 * <DateTimePicker unit="minute" value={dateTime()} onValueChange={setDateTime} />
 *
 * // DateTime input (second unit)
 * <DateTimePicker unit="second" value={dateTime()} onValueChange={setDateTime} />
 *
 * // With min/max constraints
 * <DateTimePicker
 *   unit="minute"
 *   value={dateTime()}
 *   min={new DateTime(2025, 1, 1, 0, 0, 0)}
 *   max={new DateTime(2025, 12, 31, 23, 59, 0)}
 * />
 * ```
 */
export const DateTimePicker: Component<DateTimePickerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "unit",
    "min",
    "max",
    "title",
    "disabled",
    "readonly",
    "size",
    "inset",
    "class",
    "style",
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
  const displayValue = () => formatDateTimeValue(value(), fieldType()) ?? "";

  // Change handler (on blur or Enter)
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const newValue = e.currentTarget.value;
    const parsed = parseValue(newValue, fieldType());
    setValue(parsed);
  };

  // Wrapper class (includeCustomClass: whether to apply custom class to outer div in inset mode)
  const getWrapperClass = (includeCustomClass: boolean) =>
    getFieldWrapperClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      includeCustomClass: includeCustomClass && local.class,
      extra: "min-w-44",
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
        return `Must be greater than or equal to ${local.min.toFormatString("yyyy-MM-dd HH:mm:ss")}`;
      if (local.max !== undefined && v.tick > local.max.tick)
        return `Must be less than or equal to ${local.max.toFormatString("yyyy-MM-dd HH:mm:ss")}`;
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
                data-datetime-field
                class={twMerge(getWrapperClass(true), "sd-datetime-field")}
                style={local.style}
                title={local.title}
              >
                {displayValue() || "\u00A0"}
              </div>
            }
          >
            <div {...rest} data-datetime-field class={getWrapperClass(true)} style={local.style}>
              <input
                type="datetime-local"
                class={fieldInputClass}
                value={displayValue()}
                title={local.title}
                min={formatDateTimeValue(local.min, fieldType())}
                max={formatDateTimeValue(local.max, fieldType())}
                step={getStep()}
                autocomplete="one-time-code"
                onChange={handleChange}
              />
            </div>
          </Show>
        }
      >
        {/* inset mode: dual-element overlay pattern */}
        <div
          {...rest}
          data-datetime-field
          class={clsx("relative", local.class)}
          style={local.style}
        >
          <div
            data-datetime-field-content
            class={getWrapperClass(false)}
            style={{ visibility: isEditable() ? "hidden" : undefined }}
            title={local.title}
          >
            {displayValue() || "\u00A0"}
          </div>

          <Show when={isEditable()}>
            <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
              <input
                type="datetime-local"
                class={fieldInputClass}
                value={displayValue()}
                title={local.title}
                min={formatDateTimeValue(local.min, fieldType())}
                max={formatDateTimeValue(local.max, fieldType())}
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
