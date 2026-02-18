import { type Component, type JSX, type ParentComponent } from "solid-js";
import { type CheckboxStyles } from "./checkbox.css";
import "@simplysm/core-common";
import { type IconProps } from "@tabler/icons-solidjs";
/**
 * Checkbox 컴포넌트의 props
 * @property checked - 체크 상태 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property indeterminate - 부분 선택 상태 (기본값: false)
 * @property onChange - 체크 상태 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property icon - 체크 아이콘 (기본값: IconCheck)
 * @property indeterminateIcon - 부분 선택 아이콘 (기본값: IconMinus)
 * @property disabled - 비활성화 상태
 * @property theme - 테마 색상 (primary, secondary, success, warning, danger, info, gray, slate)
 * @property size - 크기 (xs, sm, lg, xl)
 * @property inline - 인라인 스타일 적용
 * @property inset - 인셋 스타일 적용
 */
export interface CheckboxProps
  extends Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, "onChange">, CheckboxStyles {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  icon?: Component<IconProps>;
  indeterminateIcon?: Component<IconProps>;
  disabled?: boolean;
}
/**
 * 체크박스 컴포넌트
 *
 * @example
 * ```tsx
 * <Checkbox checked={checked()} onChange={setChecked}>동의합니다</Checkbox>
 * <Checkbox theme="success" indeterminate>부분 선택</Checkbox>
 * ```
 */
export declare const Checkbox: ParentComponent<CheckboxProps>;
//# sourceMappingURL=checkbox.d.ts.map
