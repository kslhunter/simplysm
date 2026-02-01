import { type JSX, type ParentComponent } from "solid-js";
import { type ButtonStyles } from "./button.css";
import "@simplysm/core-common";
/**
 * Button 컴포넌트의 props
 * @property theme - 버튼 테마 색상 (primary, secondary, success, warning, danger, info, gray, slate)
 * @property size - 버튼 크기 (xs, sm, base, lg, xl)
 * @property link - true일 경우 링크 스타일로 표시
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property disabled - 비활성화 상태
 */
export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyles {
}
/**
 * 다양한 테마와 크기를 지원하는 버튼 컴포넌트
 *
 * @example
 * ```tsx
 * <Button theme="primary" size="lg">클릭</Button>
 * <Button theme="danger" disabled>비활성화</Button>
 * ```
 */
export declare const Button: ParentComponent<ButtonProps>;
//# sourceMappingURL=button.d.ts.map