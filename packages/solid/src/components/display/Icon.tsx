import { type Component, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { IconProps as TablerIconProps } from "@tabler/icons-solidjs";

export interface IconProps extends Omit<TablerIconProps, "size"> {
  icon: Component<TablerIconProps>;
  size?: string | number;
}

export const Icon: Component<IconProps> = (props) => {
  const [local, rest] = splitProps(props, ["icon", "size"]);
  return <Dynamic component={local.icon} size={local.size ?? "1lh"} {...rest} />;
};
