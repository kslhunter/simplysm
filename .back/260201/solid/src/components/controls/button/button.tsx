import { type JSX, type ParentComponent, splitProps } from "solid-js";
import { button, type ButtonStyles } from "./button.css";
import { ripple } from "../../../directives/ripple";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";

void ripple;

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyles {}

export const Button: ParentComponent<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [...button.variants(), "children"]);

  return (
    <button
      use:ripple
      {...rest}
      class={[button(objPick(local, button.variants())), rest.class].filter(Boolean).join(" ")}
    >
      {local.children}
    </button>
  );
};
