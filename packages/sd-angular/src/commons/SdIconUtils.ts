import {
  FaSymbol,
  FlipProp,
  IconLookup,
  IconPrefix,
  IconProp,
  PullProp,
  RotateProp,
  SizeProp,
  Styles,
  Transform
} from "@fortawesome/fontawesome-svg-core";

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
  // noinspection UnnecessaryLocalVariableJS
  const result = [
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

  return result;
}

export function isIconLookup(i: IconProp): i is IconLookup {
  // noinspection UnnecessaryLocalVariableJS
  const result = !!(i as IconLookup).prefix && !!(i as IconLookup).iconName;
  return result;
}

export function sdIconNormalizeIconSpec(iconSpec: IconProp | undefined, defaultPrefix: IconPrefix = "fas"): IconLookup | undefined {
  if (!iconSpec) {
    return undefined;
  }

  if (isIconLookup(iconSpec)) {
    return iconSpec;
  }

  if (Array.isArray(iconSpec) && iconSpec.length === 2) {
    return {prefix: iconSpec[0], iconName: iconSpec[1]};
  }

  if (typeof iconSpec === "string") {
    return {prefix: defaultPrefix, iconName: iconSpec};
  }
}

export function objectWithKey<T>(key: string, value: T): { [id: string]: T } {
  // noinspection UnnecessaryLocalVariableJS
  const result = (Array.isArray(value) && value.length > 0) || (!Array.isArray(value) && value) ? {[key]: value} : {};
  return result;
}
