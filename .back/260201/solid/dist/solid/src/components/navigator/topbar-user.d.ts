import "@simplysm/core-common";
import { type JSX, type ParentComponent } from "solid-js";
/**
 * TopbarUser 메뉴 아이템 타입
 */
export interface TopbarUserMenuItem {
    title: string;
    onClick: () => void;
}
/**
 * TopbarUser 컴포넌트의 props
 *
 * @property menus - 사용자 메뉴 배열
 * @property children - 트리거 버튼에 표시할 내용 (사용자 이름 등)
 */
export interface TopbarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
    menus: TopbarUserMenuItem[];
    children?: JSX.Element;
}
/**
 * 탑바 사용자 메뉴 컴포넌트
 *
 * 사용자 이름 등을 클릭하면 드롭다운으로 메뉴가 표시된다.
 * 로그아웃, 프로필 등의 메뉴를 제공할 때 사용한다.
 *
 * @example
 * ```tsx
 * const userMenus = [
 *   { title: "프로필", onClick: () => navigate("/profile") },
 *   { title: "로그아웃", onClick: handleLogout },
 * ];
 *
 * <TopbarUser menus={userMenus}>홍길동</TopbarUser>
 * ```
 */
export declare const TopbarUser: ParentComponent<TopbarUserProps>;
//# sourceMappingURL=topbar-user.d.ts.map