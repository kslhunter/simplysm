import { type JSX, type ParentComponent } from "solid-js";
import { type CollapseStyles } from "./collapse.css";
/**
 * Collapse 컴포넌트의 props
 * @property open - 열림 상태
 */
export interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement>, CollapseStyles {
}
/**
 * 높이 애니메이션으로 콘텐츠를 펼치거나 접는 컴포넌트
 *
 * - 열림/닫힘 상태에 따라 높이를 조절하여 콘텐츠를 표시하거나 숨긴다
 * - 열릴 때 콘텐츠 높이에 맞추어 애니메이션을 적용한다
 * - 열린 상태에서 콘텐츠 크기가 변경되면 자동으로 높이를 동기화한다
 *
 * `class`와 `style` props는 내부 콘텐츠 영역에 적용되고,
 * 그 외 props는 최외곽 요소에 적용된다.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = createSignal(false);
 *
 * <button onClick={() => setIsOpen(!isOpen())}>토글</button>
 * <Collapse open={isOpen()}>
 *   <p>접을 수 있는 콘텐츠</p>
 * </Collapse>
 * ```
 */
export declare const Collapse: ParentComponent<CollapseProps>;
//# sourceMappingURL=collapse.d.ts.map