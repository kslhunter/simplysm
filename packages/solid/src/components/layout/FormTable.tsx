import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface FormTableProps extends JSX.HTMLAttributes<HTMLTableElement> {}

const baseClass = clsx(
  "border-separate",
  "border-spacing-0",
);

export const FormTable: ParentComponent<FormTableProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <table class={twMerge(baseClass, local.class)} {...rest}>
      {local.children}
    </table>
  );
};
