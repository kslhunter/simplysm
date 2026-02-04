import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  inset?: boolean;
  inline?: boolean;
}

const baseClass = clsx(
  "w-full",
  "border-separate",
  "border-spacing-0",
  "border-b border-r border-gray-300 dark:border-gray-600",
);

const insetClass = clsx("border-r-0", "border-b-0");
const inlineClass = clsx("w-auto");

export const Table: ParentComponent<TableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inset", "inline"]);

  const getClassName = () =>
    twMerge(
      baseClass,
      local.inset && insetClass,
      local.inline && inlineClass,
      local.class,
    );

  return (
    <table class={getClassName()} {...rest}>
      {local.children}
    </table>
  );
};
