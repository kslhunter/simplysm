import { type JSX, mergeProps, splitProps } from "solid-js";
import { twJoin } from "tailwind-merge";
import { IconChevronDown } from "@tabler/icons-solidjs";
import type { IconComponent } from "../types/icon.types";

export interface SdCollapseIconProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 열림 상태 */
  open?: boolean;
  /** 열림 시 회전 각도 (기본값: 90) */
  openRotate?: number;
  /** 커스텀 아이콘 컴포넌트 */
  icon?: IconComponent;
}

/**
 * 아코디언 접기/펼치기 아이콘 컴포넌트
 *
 * @remarks
 * `open` prop에 따라 회전 애니메이션을 제공한다.
 * 기본 아이콘은 `IconChevronDown`이며, `icon` prop으로 커스텀 가능하다.
 */
export function SdCollapseIcon(props: SdCollapseIconProps) {
  const merged = mergeProps({ open: false, openRotate: 90, icon: IconChevronDown }, props);
  const [local, rest] = splitProps(merged, ["open", "openRotate", "icon", "class"]);

  const transform = (): string => {
    return local.open ? `rotate(${local.openRotate}deg)` : "";
  };

  return (
    <span
      class={twJoin(
        "inline-block",
        "[&>svg]:block",
        local.open ? "transition-transform duration-100 ease-out" : `
          transition-transform duration-100 ease-in
        `,
        local.class,
      )}
      data-sd-open={local.open}
      style={{ transform: transform() }}
      {...rest}
    >
      {local.icon({ size: "1lh" })}
    </span>
  );
}
