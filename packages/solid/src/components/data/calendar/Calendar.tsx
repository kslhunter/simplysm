import { createMemo, For, type JSX, splitProps } from "solid-js";
import { DateOnly } from "@simplysm/core-common";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { bg, border, text } from "../../../styles/base.styles";
import { gap, pad } from "../../../styles/control.styles";
import { useI18n } from "../../../providers/i18n/I18nProvider";

export interface CalendarProps<TValue> extends Omit<
  JSX.HTMLAttributes<HTMLTableElement>,
  "children"
> {
  items: TValue[];
  getItemDate: (item: TValue, index: number) => DateOnly;
  renderItem: (item: TValue, index: number) => JSX.Element;
  yearMonth?: DateOnly;
  onYearMonthChange?: (value: DateOnly) => void;
  weekStartDay?: number;
  minDaysInFirstWeek?: number;
}

function CalendarBase<TValue>(props: CalendarProps<TValue>) {
  const [local, rest] = splitProps(props, [
    "class",
    "items",
    "getItemDate",
    "renderItem",
    "yearMonth",
    "onYearMonthChange",
    "weekStartDay",
    "minDaysInFirstWeek",
  ]);

  const weekStartDay = () => local.weekStartDay ?? 0;
  const minDaysInFirstWeek = () => local.minDaysInFirstWeek ?? 1;

  const [yearMonth] = createControllableSignal({
    value: () => local.yearMonth ?? new DateOnly().setDay(1),
    onChange: () => local.onYearMonthChange,
  });

  const i18n = useI18n();
  const weekNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

  const weekHeaders = createMemo(() => {
    const start = weekStartDay();
    return Array.from({ length: 7 }, (_, i) => {
      const key = weekNames[(start + i) % 7];
      return i18n.t(`calendar.weeks.${key}`);
    });
  });

  const dataTable = createMemo(() => {
    const ym = yearMonth();
    const items = local.items;
    const getDate = local.getItemDate;

    // Group items by date (O(N))
    const itemMap = new Map<number, { item: TValue; index: number }[]>();
    for (let i = 0; i < items.length; i++) {
      const date = getDate(items[i], i);
      const key = date.tick;
      const arr = itemMap.get(key);
      if (arr) {
        arr.push({ item: items[i], index: i });
      } else {
        itemMap.set(key, [{ item: items[i], index: i }]);
      }
    }

    const firstDate = ym.getWeekSeqStartDate(weekStartDay(), minDaysInFirstWeek());
    const result: { date: DateOnly; items: { item: TValue; index: number }[] }[][] = [];

    for (let r = 0; r < 6; r++) {
      const row: { date: DateOnly; items: { item: TValue; index: number }[] }[] = [];
      for (let c = 0; c < 7; c++) {
        const date = firstDate.addDays(r * 7 + c);
        row.push({
          date,
          items: itemMap.get(date.tick) ?? [],
        });
      }
      result.push(row);
    }

    return result;
  });

  return (
    <table
      data-calendar
      class={twMerge(
        clsx(
          "w-full border-separate border-spacing-0 border-b border-r",
          border.default,
          "overflow-hidden rounded",
        ),
        local.class,
      )}
      {...rest}
    >
      <thead>
        <tr>
          <For each={weekHeaders()}>
            {(header) => (
              <th
                class={clsx(
                  "border-l border-t",
                  border.default,
                  pad.default,
                  bg.muted,
                  "text-center text-sm font-bold",
                )}
              >
                {header}
              </th>
            )}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={dataTable()}>
          {(row) => (
            <tr>
              <For each={row}>
                {(cell) => (
                  <td
                    class={twMerge(
                      clsx("border-l border-t", border.default, "p-1 align-top"),
                      "[&.not-current]:bg-base-50 [&.not-current]:dark:bg-base-900",
                      cell.date.month !== yearMonth().month && "not-current",
                    )}
                  >
                    <div
                      class={twMerge(
                        "mb-1 text-sm",
                        text.muted,
                        cell.date.month !== yearMonth().month && "text-base-300 dark:text-base-600",
                      )}
                    >
                      {cell.date.day}
                    </div>
                    <div class={clsx("flex flex-col", gap.default)}>
                      <For each={cell.items}>
                        {(entry) => local.renderItem(entry.item, entry.index)}
                      </For>
                    </div>
                  </td>
                )}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

export const Calendar = CalendarBase;
