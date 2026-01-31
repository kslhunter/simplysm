import { type JSX, type ParentComponent, splitProps } from "solid-js";
import { type ButtonStyles, button } from "./button.css";
import { ripple } from "../../directives/ripple";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";

// 디렉티브 등록 (TypeScript unused import 경고 방지)
void ripple;

/**
 * Button 컴포넌트의 props
 * @property theme - 버튼 테마 색상 (primary, secondary, success, warning, danger, info, gray, slate)
 * @property size - 버튼 크기 (xs, sm, base, lg, xl)
 * @property link - true일 경우 링크 스타일로 표시
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property disabled - 비활성화 상태
 */
export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyles {}

/**
 * 다양한 테마와 크기를 지원하는 버튼 컴포넌트
 *
 * @example
 * ```tsx
 * <Button theme="primary" size="lg">클릭</Button>
 * <Button theme="danger" disabled>비활성화</Button>
 * ```
 */
export const Button: ParentComponent<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [...button.variants(), "class", "children"]);

  return (
    <button
      use:ripple
      {...rest}
      class={[button(objPick(local, button.variants())), local.class].filterExists().join(" ")}
    >
      {local.children}
    </button>
  );
};
