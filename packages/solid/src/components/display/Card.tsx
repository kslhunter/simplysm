import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { bg } from "../../styles/base.styles";
import "./Card.animate.css";

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export const Card: ParentComponent<CardProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <div
      data-card
      class={twMerge(
        clsx("block", bg.surface, "animate-[fade-in_0.6s_ease-out_both] rounded-lg shadow transition-shadow duration-300 focus-within:shadow-md hover:shadow-md dark:shadow-black/20 dark:focus-within:shadow-black/30 dark:hover:shadow-black/30"),
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
};
