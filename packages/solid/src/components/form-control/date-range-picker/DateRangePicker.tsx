import { type Component, type JSX, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { DateOnly } from "@simplysm/core-common";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { type FieldSize } from "../field/Field.styles";
import { DatePicker } from "../field/DatePicker";
import { Select } from "../select/Select";

export type DateRangePeriodType = "day" | "month" | "range";

const baseClass = clsx("inline-flex items-center", "gap-1");

export interface DateRangePickerProps {
  /** 기간 타입 */
  periodType?: DateRangePeriodType;

  /** 기간 타입 변경 콜백 */
  onPeriodTypeChange?: (value: DateRangePeriodType) => void;

  /** 시작 날짜 */
  from?: DateOnly;

  /** 시작 날짜 변경 콜백 */
  onFromChange?: (value: DateOnly | undefined) => void;

  /** 종료 날짜 */
  to?: DateOnly;

  /** 종료 날짜 변경 콜백 */
  onToChange?: (value: DateOnly | undefined) => void;

  /** 필수 입력 */
  required?: boolean;

  /** 비활성화 */
  disabled?: boolean;

  /** 사이즈 */
  size?: FieldSize;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * 월의 마지막 날을 구한다.
 */
function getLastDayOfMonth(date: DateOnly): DateOnly {
  return date.addMonths(1).setDay(1).addDays(-1);
}

/**
 * DateRangePicker 컴포넌트
 *
 * 기간 타입(일/월/범위) 선택에 따라 날짜 범위를 입력한다.
 * periodType 변경 시 from/to를 자동으로 보정한다.
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

  // controlled/uncontrolled 패턴
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

  // periodType 변경 핸들러
  const handlePeriodTypeChange = (newType: DateRangePeriodType | DateRangePeriodType[]) => {
    const type = Array.isArray(newType) ? newType[0] : newType;
    setPeriodType(type);

    const currentFrom = from();

    if (type === "month") {
      if (currentFrom) {
        const adjusted = currentFrom.setDay(1);
        setFrom(adjusted);
        setTo(getLastDayOfMonth(adjusted));
      } else {
        setTo(undefined as DateOnly | undefined);
      }
    } else if (type === "day") {
      setTo(currentFrom);
    }
  };

  // from 변경 핸들러
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

  // to 변경 핸들러
  const handleToChange = (newTo: DateOnly | undefined) => {
    setTo(newTo);
  };

  // wrapper 클래스
  const getWrapperClass = () => twMerge(baseClass, local.class);

  return (
    <div {...rest} data-date-range-picker class={getWrapperClass()} style={local.style}>
      <Select
        value={periodType()}
        onValueChange={handlePeriodTypeChange}
        renderValue={(v: DateRangePeriodType) => (
          <>{{ day: "일", month: "월", range: "범위" }[v]}</>
        )}
        required
        disabled={local.disabled}
        size={local.size}
        inset
      >
        <Select.Item value={"day" as DateRangePeriodType}>일</Select.Item>
        <Select.Item value={"month" as DateRangePeriodType}>월</Select.Item>
        <Select.Item value={"range" as DateRangePeriodType}>범위</Select.Item>
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
        <span class="text-base-400">~</span>
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
