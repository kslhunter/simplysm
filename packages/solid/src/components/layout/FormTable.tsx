import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}

const baseClass = clsx(
  "border-separate border-spacing-0 border-0",
  // All cells: vertical center, right/bottom padding
  "[&_td]:align-middle [&_th]:align-middle",
  "[&_td]:pr-1.5 [&_th]:pr-1.5",
  "[&_td]:pb-1 [&_th]:pb-1",
  // Last cell in row: remove right padding
  "[&_tr>*:last-child]:pr-0",
  // Cells in last row: remove bottom padding
  "[&_tr:last-child>*]:pb-0",
  // th: right align, content width, prevent wrapping
  "[&_th]:w-0 [&_th]:whitespace-nowrap [&_th]:pl-1 [&_th]:text-right",
);

export const FormTable: ParentComponent<FormTableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <table data-form-table class={twMerge(baseClass, local.class)} {...rest}>
      {local.children}
    </table>
  );
};
