import { createMemo, For, type JSX, splitProps } from "solid-js";
import { DateOnly } from "@simplysm/core-common";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";

export interface CalendarProps<TValue> extends Omit<JSX.HTMLAttributes<HTMLTableElement>, "children"> {
  items: TValue[];
  getItemDate: (item: TValue, index: number) => DateOnly;
  renderItem: (item: TValue, index: number) => JSX.Element;
  yearMonth?: DateOnly;
  onYearMonthChange?: (value: DateOnly) => void;
  weekStartDay?: number;
  minDaysInFirstWeek?: number;
}

const WEEKS = ["일", "월", "화", "수", "목", "금", "토"];

const baseClass = clsx(
  "w-full",
  "border-separate border-spacing-0",
  "border-b border-r border-base-300",
  "dark:border-base-600",
  "overflow-hidden rounded",
  // th
  "[&_th]:border-l [&_th]:border-t [&_th]:border-base-300 [&_th]:dark:border-base-600",
  "[&_th]:px-2 [&_th]:py-1",
  "[&_th]:bg-base-100 [&_th]:text-center [&_th]:text-sm [&_th]:font-semibold",
  "[&_th]:dark:bg-base-800",
  // td
  "[&_td]:border-l [&_td]:border-t [&_td]:border-base-300 [&_td]:dark:border-base-600",
  "[&_td]:p-1 [&_td]:align-top",
);

const notCurrentClass = clsx("[&.not-current]:bg-base-50", "[&.not-current]:dark:bg-base-900");

const dayClass = clsx("mb-1 text-sm text-base-500", "dark:text-base-400");

const notCurrentDayClass = clsx("text-base-300", "dark:text-base-600");

const contentClass = clsx("flex flex-col gap-1");

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

  const weekHeaders = createMemo(() => {
    const start = weekStartDay();
    return Array.from({ length: 7 }, (_, i) => WEEKS[(start + i) % 7]);
  });

  const dataTable = createMemo(() => {
    const ym = yearMonth();
    const items = local.items;
    const getDate = local.getItemDate;

    // 아이템을 날짜별로 그룹핑 (O(N))
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

  const getClassName = () => twMerge(baseClass, local.class);

  return (
    <table data-calendar class={getClassName()} {...rest}>
      <thead>
        <tr>
          <For each={weekHeaders()}>{(header) => <th>{header}</th>}</For>
        </tr>
      </thead>
      <tbody>
        <For each={dataTable()}>
          {(row) => (
            <tr>
              <For each={row}>
                {(cell) => (
                  <td class={twMerge(notCurrentClass, cell.date.month !== yearMonth().month && "not-current")}>
                    <div
                      class={cell.date.month !== yearMonth().month ? twMerge(dayClass, notCurrentDayClass) : dayClass}
                    >
                      {cell.date.day}
                    </div>
                    <div class={contentClass}>
                      <For each={cell.items}>{(entry) => local.renderItem(entry.item, entry.index)}</For>
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
