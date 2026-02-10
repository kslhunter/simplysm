import "@simplysm/core-common";
import { type JSX, type ParentComponent } from "solid-js";
/**
 * SidebarUser 컴포넌트의 props
 *
 * @property name - 사용자 이름
 * @property description - 사용자 설명 (역할, 이메일 등)
 * @property menus - 사용자 메뉴 목록 (클릭 시 실행할 콜백 포함)
 */
export interface SidebarUserProps extends JSX.HTMLAttributes<HTMLDivElement> {
  name: string;
  description?: string;
  menus?: {
    title: string;
    onClick: () => void;
  }[];
}
/**
 * 사이드바 하단의 사용자 정보 컴포넌트
 *
 * 사용자 아이콘, 이름, 설명을 표시하며 클릭 시 사용자 메뉴를 펼친다.
 *
 * @example
 * ```tsx
 * <SidebarUser
 *   name="홍길동"
 *   description="관리자"
 *   menus={[
 *     { title: "프로필", onClick: () => navigate("/profile") },
 *     { title: "로그아웃", onClick: logout },
 *   ]}
 * />
 * ```
 */
export declare const SidebarUser: ParentComponent<SidebarUserProps>;
//# sourceMappingURL=sidebar-user.d.ts.map
