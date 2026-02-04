import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const baseClass = clsx(
  "block",
  "bg-white dark:bg-gray-900",
  "rounded-lg",
  "shadow-md focus-within:shadow-lg hover:shadow-lg",
  "transition-shadow duration-300",
  "animate-card-in",
);

export const Card: ParentComponent<CardProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <div class={twMerge(baseClass, local.class)} {...rest}>
      {local.children}
    </div>
  );
};
