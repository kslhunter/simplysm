import { type Component, type JSX, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { DateOnly } from "@simplysm/core-common";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { type FieldSize } from "../field/Field.styles";
import { text } from "../../../styles/base.styles";
import { gap } from "../../../styles/control.styles";
import { DatePicker } from "../field/DatePicker";
import { Select } from "../select/Select";
import { useI18n } from "../../../providers/i18n/I18nProvider";

export type DateRangePeriodType = "day" | "month" | "range";

export interface DateRangePickerProps {
  /** Period type */
  periodType?: DateRangePeriodType;

  /** Period type change callback */
  onPeriodTypeChange?: (value: DateRangePeriodType) => void;

  /** Start date */
  from?: DateOnly;

  /** Start date change callback */
  onFromChange?: (value: DateOnly | undefined) => void;

  /** End date */
  to?: DateOnly;

  /** End date change callback */
  onToChange?: (value: DateOnly | undefined) => void;

  /** Required input */
  required?: boolean;

  /** Disabled */
  disabled?: boolean;

  /** Size */
  size?: FieldSize;

  /** Custom class */
  class?: string;

  /** Custom style */
  style?: JSX.CSSProperties;
}

/**
 * Get the last day of the month.
 */
function getLastDayOfMonth(date: DateOnly): DateOnly {
  return date.addMonths(1).setDay(1).addDays(-1);
}

/**
 * DateRangePicker component
 *
 * Input date range based on selected period type (day/month/range).
 * Automatically adjusts from/to when periodType changes.
 *
 * @example
 * ```tsx
 * const [periodType, setPeriodType] = createSignal<DateRangePeriodType>("range");
 * const [from, setFrom] = createSignal<DateOnly>();
 * const [to, setTo] = createSignal<DateOnly>();
 *
 * <DateRangePicker
 *   periodType={periodType()}
 *   onPeriodTypeChange={setPeriodType}
 *   from={from()}
 *   onFromChange={setFrom}
 *   to={to()}
 *   onToChange={setTo}
 *   required
 * />
 * ```
 */
export const DateRangePicker: Component<DateRangePickerProps> = (props) => {
  const i18n = useI18n();

  const [local, rest] = splitProps(props, [
    "periodType",
    "onPeriodTypeChange",
    "from",
    "onFromChange",
    "to",
    "onToChange",
    "required",
    "disabled",
    "size",
    "class",
    "style",
  ]);

  // Controlled/uncontrolled pattern
  const [periodType, setPeriodType] = createControllableSignal({
    value: () => local.periodType ?? ("range" as DateRangePeriodType),
    onChange: () => local.onPeriodTypeChange,
  });

  const [from, setFrom] = createControllableSignal({
    value: () => local.from,
    onChange: () => local.onFromChange,
  });

  const [to, setTo] = createControllableSignal({
    value: () => local.to,
    onChange: () => local.onToChange,
  });

  // Handle period type change
  const handlePeriodTypeChange = (newType: DateRangePeriodType | undefined) => {
    if (newType == null) return;
    setPeriodType(newType);

    const currentFrom = from();

    if (newType === "month") {
      if (currentFrom) {
        const adjusted = currentFrom.setDay(1);
        setFrom(adjusted);
        setTo(getLastDayOfMonth(adjusted));
      } else {
        setTo(undefined as DateOnly | undefined);
      }
    } else if (newType === "day") {
      setTo(currentFrom);
    }
  };

  // Handle from date change
  const handleFromChange = (newFrom: DateOnly | undefined) => {
    setFrom(newFrom);

    const type = periodType();

    if (type === "month") {
      setTo(newFrom ? getLastDayOfMonth(newFrom) : (undefined as DateOnly | undefined));
    } else if (type === "day") {
      setTo(newFrom);
    } else {
      const currentTo = to();
      if (newFrom && currentTo && newFrom.tick > currentTo.tick) {
        setTo(newFrom);
      }
    }
  };

  // Handle to date change
  const handleToChange = (newTo: DateOnly | undefined) => {
    setTo(newTo);
  };

  // Wrapper CSS class
  const getWrapperClass = () => twMerge(clsx("inline-flex items-center", gap.default), local.class);

  return (
    <div {...rest} data-date-range-picker class={getWrapperClass()} style={local.style}>
      <Select
        value={periodType()}
        onValueChange={handlePeriodTypeChange}
        renderValue={(v: DateRangePeriodType) => {
          const labels = {
            day: i18n.t("dateRangePicker.day"),
            month: i18n.t("dateRangePicker.month"),
            range: i18n.t("dateRangePicker.range"),
          };
          return <>{labels[v]}</>;
        }}
        required
        disabled={local.disabled}
        size={local.size}
        inset
      >
        <Select.Item value={"day" as DateRangePeriodType}>
          {i18n.t("dateRangePicker.day")}
        </Select.Item>
        <Select.Item value={"month" as DateRangePeriodType}>
          {i18n.t("dateRangePicker.month")}
        </Select.Item>
        <Select.Item value={"range" as DateRangePeriodType}>
          {i18n.t("dateRangePicker.range")}
        </Select.Item>
      </Select>

      <Show
        when={periodType() === "range"}
        fallback={
          <DatePicker
            unit={periodType() === "month" ? "month" : "date"}
            value={from()}
            onValueChange={handleFromChange}
            disabled={local.disabled}
            size={local.size}
          />
        }
      >
        <DatePicker
          unit="date"
          value={from()}
          onValueChange={handleFromChange}
          disabled={local.disabled}
          size={local.size}
        />
        <span class={text.muted}>~</span>
        <DatePicker
          unit="date"
          value={to()}
          onValueChange={handleToChange}
          min={from()}
          disabled={local.disabled}
          size={local.size}
        />
      </Show>
    </div>
  );
};
