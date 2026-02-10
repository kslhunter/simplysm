import "@simplysm/core-common";
import { type Component, type JSX } from "solid-js";
import type { IconProps } from "@tabler/icons-solidjs";
/**
 * 메뉴 아이템 타입
 *
 * @property title - 메뉴 표시 이름
 * @property path - 라우터 경로 (없으면 클릭 불가)
 * @property url - 외부 URL (새 탭에서 열림)
 * @property icon - 메뉴 아이콘 컴포넌트
 * @property children - 중첩 메뉴
 */
export interface TopbarMenuItem {
  title: string;
  path?: string;
  url?: string;
  icon?: Component<IconProps>;
  children?: TopbarMenuItem[];
}
/**
 * TopbarMenu 컴포넌트의 props
 *
 * @property menus - 1단계 메뉴 배열 (각 메뉴가 드롭다운 트리거)
 * @property isSelectedFn - 메뉴 선택 상태 판별 함수 (기본값: 현재 경로와 path 비교)
 */
export interface TopbarMenuProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  menus: TopbarMenuItem[];
  isSelectedFn?: (menu: TopbarMenuItem) => boolean;
}
/**
 * 탑바 드롭다운 메뉴 컴포넌트
 *
 * 1단계 메뉴는 상단바에 버튼으로 표시되고,
 * 각 버튼을 클릭하면 드롭다운으로 하위 메뉴가 표시된다.
 * 무제한 중첩을 지원한다.
 *
 * @example
 * ```tsx
 * const menus: TopbarMenuItem[] = [
 *   {
 *     title: "관리",
 *     children: [
 *       { title: "사용자 관리", path: "/admin/users" },
 *       { title: "설정", path: "/admin/settings" },
 *     ],
 *   },
 * ];
 *
 * <TopbarMenu menus={menus} />
 * ```
 */
export declare const TopbarMenu: Component<TopbarMenuProps>;
//# sourceMappingURL=topbar-menu.d.ts.map
