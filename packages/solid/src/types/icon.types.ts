import type { JSX } from "solid-js";
import type { IconProps } from "@tabler/icons-solidjs";

/** Tabler Icons 기반 아이콘 컴포넌트 타입 */
export type IconComponent = (props: IconProps) => JSX.Element;
