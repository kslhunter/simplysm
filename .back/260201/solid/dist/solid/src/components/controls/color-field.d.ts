import { type Component, type JSX } from "solid-js";
import { type ColorFieldStyles } from "./color-field.css";
import "@simplysm/core-common";
/**
 * ColorField 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property inline - true일 경우 inline-block으로 표시
 */
export interface ColorFieldProps
  extends
    Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size">,
    ColorFieldStyles {
  value?: string | undefined;
  onChange?: (value: string | undefined) => void;
}
/**
 * 색상 선택 필드 컴포넌트
 *
 * @example
 * ```tsx
 * const [color, setColor] = createSignal<string | undefined>("#ff0000");
 * <ColorField value={color()} onChange={setColor} />
 * ```
 */
export declare const ColorField: Component<ColorFieldProps>;
//# sourceMappingURL=color-field.d.ts.map
