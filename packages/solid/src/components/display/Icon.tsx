import { type Component, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { IconProps as TablerIconProps } from "@tabler/icons-solidjs";
import clsx from "clsx";

export interface IconProps extends Omit<TablerIconProps, "size"> {
  icon: Component<TablerIconProps>;
  size?: string | number;
}

export const Icon: Component<IconProps> = (props) => {
  const [local, rest] = splitProps(props, ["icon", "size"]);
  return (
    <Dynamic
      data-icon
      component={local.icon}
      size={local.size ?? "1.25em"}
      {...rest}
      class={clsx("inline", rest.class)}
    />
  );
};
