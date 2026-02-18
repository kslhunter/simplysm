import { type JSX, type ParentComponent } from "solid-js";
import { type RadioStyles } from "./radio.css";
import "@simplysm/core-common";
/**
 * Radio 컴포넌트의 props
 * @property checked - 선택 상태 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 선택 상태 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property disabled - 비활성화 상태
 * @property theme - 테마 색상 (primary, secondary, success, warning, danger, info, gray, slate)
 * @property size - 크기 (xs, sm, lg, xl)
 * @property inline - 인라인 스타일 적용
 * @property inset - 인셋 스타일 적용
 */
export interface RadioProps
  extends Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, "onChange">, RadioStyles {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}
/**
 * 라디오 버튼 컴포넌트
 *
 * Checkbox와 달리 indeterminate 상태를 지원하지 않습니다.
 * 라디오 버튼은 항상 선택(checked) 또는 미선택 상태만 가집니다.
 *
 * @example
 * ```tsx
 * <Radio checked={selected() === 'a'} onChange={() => setSelected('a')}>옵션 A</Radio>
 * <Radio checked={selected() === 'b'} onChange={() => setSelected('b')}>옵션 B</Radio>
 * ```
 */
export declare const Radio: ParentComponent<RadioProps>;
//# sourceMappingURL=radio.d.ts.map
