import {
  FaSymbol,
  FlipProp,
  IconLookup,
  IconName,
  IconPrefix,
  IconProp,
  PullProp,
  RotateProp,
  SizeProp,
  Styles,
  Transform
} from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/pro-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/pro-regular-svg-icons";
import { fal } from "@fortawesome/pro-light-svg-icons";
import { fad } from "@fortawesome/pro-duotone-svg-icons";
import { SdServiceEventBase } from "@simplysm/sd-service-common";

export type TSdIconName = IconName;
export type TSdIconPrefix = IconPrefix;

export interface ISdIconProps {
  mask?: IconProp;
  className?: string;
  spin?: boolean;
  pulse?: boolean;
  border?: boolean;
  fixedWidth?: boolean;
  listItem?: boolean;
  counter?: boolean;
  inverse?: boolean;
  flip?: FlipProp;
  size?: SizeProp;
  pull?: PullProp;
  rotate?: RotateProp;
  transform?: string | Transform;
  symbol?: FaSymbol;
  style?: Styles;
}

export function sdIconClassList(props: ISdIconProps): string[] {
  return [
    props.spin ? "fa-spin" : undefined,
    props.pulse ? "fa-pulse" : undefined,
    props.fixedWidth ? "fa-fw" : undefined,
    props.border ? "fa-border" : undefined,
    props.listItem ? "fa-li" : undefined,
    props.inverse ? "fa-inverse" : undefined,
    props.counter ? "fa-layers-counter" : undefined,
    (props.flip === "horizontal" || props.flip === "both") ? "fa-flip-horizontal" : undefined,
    (props.flip === "vertical" || props.flip === "both") ? "fa-flip-vertical" : undefined,
    props.size !== undefined ? `fa-${props.size}` : undefined,
    props.rotate !== undefined ? `fa-rotate-${props.rotate}` : undefined,
    props.pull !== undefined ? `fa-pull-${props.pull}` : undefined
  ].filterExists();
}

export function isIconLookup(i: IconProp): i is IconLookup {
  return i["prefix"] !== undefined && i["iconName"] !== undefined;
}

export function sdIconNormalizeIconSpec(iconSpec: IconProp | undefined, defaultPrefix: IconPrefix = "fas"): IconLookup | undefined {
  if (iconSpec === undefined) {
    return undefined;
  }

  if (isIconLookup(iconSpec)) {
    return iconSpec;
  }

  if (Array.isArray(iconSpec)) {
    return { prefix: iconSpec[0], iconName: iconSpec[1] };
  }

  return { prefix: defaultPrefix, iconName: iconSpec };
}

export function objectWithKey<T>(key: string, value: T): Record<string, T> {
  // noinspection UnnecessaryLocalVariableJS
  const result = (Array.isArray(value) && value.length > 0) || (!Array.isArray(value) && value !== undefined) ? { [key]: value } : {};
  return result;
}

export function sdIconNameFn(item: any): any {
  // noinspection UnnecessaryLocalVariableJS
  const result: any = item.iconName;
  return result;
}

export const sdIconNames = Object.values(fas)
  .concat(Object.values(fab))
  .concat(Object.values(far))
  .concat(Object.values(fal))
  .concat(Object.values(fad))
  .map(sdIconNameFn)
  .distinct();

export type TSdTheme = "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";
export const sdThemes = ["primary", "secondary", "info", "success", "warning", "danger", "grey", "blue-grey"];

// INPUT: 구분, 변경키 목록
export class SdSharedDataChangeEvent extends SdServiceEventBase<string, (string | number)[] | undefined> {
}