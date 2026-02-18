import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {}

const baseClass = clsx(
  "text-primary-600",
  "dark:text-primary-400",
  "hover:underline",
  "cursor-pointer",
);

export const Link: ParentComponent<LinkProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <a class={twMerge(baseClass, local.class)} {...rest}>
      {local.children}
    </a>
  );
};
