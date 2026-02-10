import "@simplysm/core-common";
import { type Component, type JSX } from "solid-js";
import type { IconProps } from "@tabler/icons-solidjs";
/**
 * 사이드바 메뉴 아이템 타입
 *
 * @property title - 메뉴 표시 이름
 * @property path - 라우터 경로 또는 외부 URL (://포함 시 새 탭에서 열림)
 * @property icon - 메뉴 아이콘 컴포넌트 (@tabler/icons-solidjs)
 * @property children - 하위 메뉴 목록
 */
export interface SidebarMenuItem {
  title: string;
  path?: string;
  icon?: Component<IconProps>;
  children?: SidebarMenuItem[];
}
/**
 * SidebarMenu 컴포넌트의 props
 *
 * @property menus - 메뉴 아이템 목록
 * @property layout - 메뉴 레이아웃 (accordion: 아코디언, flat: 항상 펼침).
 *                    생략 시 메뉴 개수에 따라 자동 선택 (3개 이하: flat, 4개 이상: accordion)
 */
export interface SidebarMenuProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  menus: SidebarMenuItem[];
  layout?: "accordion" | "flat";
}
/**
 * 사이드바 메뉴 컴포넌트
 *
 * Sidebar 내부에서 네비게이션 메뉴를 표시한다.
 * 메뉴 선택은 현재 라우터 경로(`location.pathname`)와 메뉴의 `path`를 비교하여 자동으로 결정된다.
 *
 * @example
 * ```tsx
 * <SidebarMenu
 *   menus={[
 *     { title: "홈", path: "/", icon: IconHome },
 *     { title: "설정", children: [
 *       { title: "프로필", path: "/settings/profile" },
 *     ]},
 *   ]}
 * />
 * ```
 */
export declare const SidebarMenu: Component<SidebarMenuProps>;
//# sourceMappingURL=sidebar-menu.d.ts.map
