import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  inset?: boolean;
}

const baseClass = clsx(
  "w-auto",
  "border-separate border-spacing-0",
  "border-b border-r border-base-300 dark:border-base-600",
  "rounded",
  "overflow-hidden",
  // th
  "[&_th]:border-l [&_th]:border-t [&_th]:border-base-300 [&_th]:dark:border-base-600",
  "[&_th]:px-2 [&_th]:py-1",
  "[&_th]:bg-base-100 [&_th]:text-left [&_th]:font-bold",
  "[&_th]:dark:bg-base-800",
  // td
  "[&_td]:border-l [&_td]:border-t [&_td]:border-base-300 [&_td]:dark:border-base-600",
  "[&_td]:px-2 [&_td]:py-1",
);

const insetClass = clsx(
  "border-b-0 border-r-0",
  "[&>*>tr>*:first-child]:border-l-0",
  "[&>*:first-child>tr:first-child>*]:border-t-0",
  "rounded-none",
  "overflow-auto",
);

export const Table: ParentComponent<TableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inset"]);

  const getClassName = () => twMerge(baseClass, local.inset && insetClass, local.class);

  return (
    <table data-table class={getClassName()} {...rest}>
      {local.children}
    </table>
  );
};
