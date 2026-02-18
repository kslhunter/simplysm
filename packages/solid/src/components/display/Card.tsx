import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const baseClass = clsx(
  "block",
  "bg-white dark:bg-base-800",
  "rounded-lg",
  "shadow focus-within:shadow-md hover:shadow-md",
  "dark:shadow-black/20 dark:focus-within:shadow-black/30 dark:hover:shadow-black/30",
  "transition-shadow duration-300",
  "animate-fade-in",
);

export const Card: ParentComponent<CardProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <div data-card class={twMerge(baseClass, local.class)} {...rest}>
      {local.children}
    </div>
  );
};
