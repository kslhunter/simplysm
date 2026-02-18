import { type Component, type JSX } from "solid-js";
import { type CollapseIconStyles } from "./collapse-icon.css";
import "@simplysm/core-common";
/**
 * CollapseIcon 컴포넌트의 props
 * @property icon - 표시할 아이콘 컴포넌트 (예: IconChevronDown)
 * @property open - 열림 상태
 * @property openRotate - 열림 상태일 때 회전 각도 (기본값: 90)
 */
export interface CollapseIconProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children">, CollapseIconStyles {
  icon: Component;
  openRotate?: number;
}
/**
 * 열림/닫힘 상태에 따라 아이콘을 회전시키는 컴포넌트
 *
 * 아코디언이나 트리 뷰에서 펼침 상태를 시각적으로 표현할 때 사용한다.
 *
 * @example
 * ```tsx
 * <CollapseIcon icon={IconChevronDown} open={isOpen()} />
 * <CollapseIcon icon={IconChevronRight} open={isOpen()} openRotate={90} />
 * ```
 */
export declare const CollapseIcon: Component<CollapseIconProps>;
//# sourceMappingURL=collapse-icon.d.ts.map
