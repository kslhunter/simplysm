import { type Component, type JSX } from "solid-js";
import { type TextFieldStyles } from "./text-field.css";
import "@simplysm/core-common";
/**
 * TextField 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property type - 입력 타입 (text, password, email)
 * @property format - 포맷 패턴 (예: "000-0000-0000")
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property inline - true일 경우 inline-block으로 표시
 */
export interface TextFieldProps
  extends
    Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size">,
    TextFieldStyles {
  value?: string | undefined;
  onChange?: (value: string | undefined) => void;
  type?: "text" | "password" | "email";
  format?: string;
}
/**
 * 텍스트 입력 필드 컴포넌트
 *
 * @example
 * ```tsx
 * const [text, setText] = createSignal<string | undefined>("hello");
 * <TextField value={text()} onChange={setText} />
 * <TextField value={text()} onChange={setText} type="password" />
 * <TextField value={text()} onChange={setText} format="000-0000-0000" />
 * ```
 */
export declare const TextField: Component<TextFieldProps>;
//# sourceMappingURL=text-field.d.ts.map
