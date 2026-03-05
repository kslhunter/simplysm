import { type Component, createMemo, type JSX, splitProps } from "solid-js";
import { DateTime } from "@simplysm/core-common";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { type FieldSize, fieldInputClass, getFieldWrapperClass } from "./Field.styles";
import { useI18n } from "../../../providers/i18n/I18nProvider";
import { FieldShell } from "./FieldShell";

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
  readOnly?: boolean;

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

  /** lazyValidation: show errors only after blur */
  lazyValidation?: boolean;
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
    "readOnly",
    "size",
    "inset",
    "class",
    "style",
    "required",
    "validate",
    "lazyValidation",
  ]);

  const i18n = useI18n();

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
  const isEditable = () => !local.disabled && !local.readOnly;

  // Step attribute (1 when second)
  const getStep = () => (fieldType() === "second" ? "1" : undefined);

  // Validation message (check in order, return first error)
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && v === undefined) return i18n.t("validation.required");
    if (v !== undefined) {
      if (local.min !== undefined && v.tick < local.min.tick)
        return i18n.t("validation.minDate", { min: local.min.toFormatString("yyyy-MM-dd HH:mm:ss") });
      if (local.max !== undefined && v.tick > local.max.tick)
        return i18n.t("validation.maxDate", { max: local.max.toFormatString("yyyy-MM-dd HH:mm:ss") });
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
      dataAttr="data-datetime-field"
      readonlyExtraClass="sd-datetime-field"
      style={local.style}
      title={local.title}
      class={local.class}
      rest={rest}
      displayContent={displayValue() || "\u00A0"}
    >
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
    </FieldShell>
  );
};
