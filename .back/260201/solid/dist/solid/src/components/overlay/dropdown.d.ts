import "@simplysm/core-common";
import { type JSX, type ParentComponent } from "solid-js";
/**
 * Dropdown 컴포넌트의 props
 *
 * @property open - 열림 상태 (onOpenChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onOpenChange - 열림 상태 변경 콜백 (있으면 controlled 모드)
 * @property disabled - 비활성화 상태
 */
export interface DropdownProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children: JSX.Element;
}
/**
 * 드롭다운 메뉴를 제공하는 컴포넌트
 *
 * 트리거 요소와 DropdownPopup을 children으로 받아
 * 클릭이나 키보드 조작으로 팝업을 열고 닫는다.
 *
 * - 중첩 사용 지원 (Menu 안에 서브메뉴 등)
 * - 뷰포트 기반 자동 포지셔닝
 * - 키보드 네비게이션 (ArrowDown, ArrowUp, Space, Escape)
 * - 모바일에서는 Bottom Sheet UI로 전환
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <Dropdown>
 *   <Button>메뉴</Button>
 *   <DropdownPopup>
 *     <List>
 *       <ListItem>옵션 1</ListItem>
 *       <ListItem>옵션 2</ListItem>
 *     </List>
 *   </DropdownPopup>
 * </Dropdown>
 *
 * // Controlled 모드
 * const [open, setOpen] = createSignal(false);
 * <Dropdown open={open()} onOpenChange={setOpen}>
 *   ...
 * </Dropdown>
 * ```
 */
export declare const Dropdown: ParentComponent<DropdownProps>;
//# sourceMappingURL=dropdown.d.ts.map
