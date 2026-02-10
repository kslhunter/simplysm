import { type JSX, type ParentComponent } from "solid-js";
/**
 * List 컴포넌트의 props
 * @property inset - true일 경우 테두리 안쪽 여백 스타일 적용
 */
export interface ListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}
/**
 * ListItem들을 담는 컨테이너 컴포넌트
 *
 * 트리뷰 스타일 키보드 네비게이션 지원:
 * - `Space`: 현재 항목 토글
 * - `↑`/`↓`: 이전/다음 항목으로 포커스 이동
 * - `Home`/`End`: 첫 번째/마지막 항목으로 포커스 이동
 * - `→`: 닫혀있으면 열기, 열려있으면 첫 번째 자식으로 포커스
 * - `←`: 열려있으면 닫기, 닫혀있으면 부모로 포커스
 *
 * @example
 * ```tsx
 * <List>
 *   <ListItem>항목 1</ListItem>
 *   <ListItem>항목 2</ListItem>
 * </List>
 *
 * <List inset>
 *   <ListItem>인셋 스타일 항목</ListItem>
 * </List>
 * ```
 */
export declare const List: ParentComponent<ListProps>;
//# sourceMappingURL=list.d.ts.map
