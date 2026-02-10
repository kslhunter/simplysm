import { type Component, type JSX, type ParentComponent } from "solid-js";
import { type IconProps } from "@tabler/icons-solidjs";
import { type ListItemContentStyles } from "./list-item.css";
/**
 * ListItem 컴포넌트의 props
 *
 * @property open - 중첩 리스트의 열림 상태 (onOpenChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onOpenChange - 열림 상태 변경 콜백 (있으면 controlled 모드)
 * @property selectedIcon - 선택 표시 아이콘 컴포넌트
 * @property icon - 항목 앞에 표시할 아이콘 컴포넌트
 */
export interface ListItemProps extends JSX.HTMLAttributes<HTMLDivElement>, ListItemContentStyles {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedIcon?: Component<IconProps>;
  icon?: Component<IconProps>;
  children?: JSX.Element;
}
/**
 * 리스트 아이템 컴포넌트
 *
 * 중첩 리스트를 children으로 포함하면 아코디언 동작을 지원한다.
 * controlled 모드로 사용하려면 open과 onOpenChange를 함께 제공한다.
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <ListItem>단순 항목</ListItem>
 *
 * // 선택 상태
 * <ListItem selected>선택된 항목</ListItem>
 *
 * // 선택 아이콘
 * <ListItem selectedIcon={IconCheck} selected>아이콘 선택</ListItem>
 *
 * // 중첩 리스트 (아코디언)
 * <ListItem>
 *   폴더
 *   <List>
 *     <ListItem>파일</ListItem>
 *   </List>
 * </ListItem>
 * ```
 */
export declare const ListItem: ParentComponent<ListItemProps>;
//# sourceMappingURL=list-item.d.ts.map
