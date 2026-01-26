import type { JSX } from "solid-js";

/**
 * 필드 컴포넌트의 공통 테마 타입
 */
export type FieldTheme =
  | "primary"
  | "secondary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "gray"
  | "slate";

/**
 * 필드 컴포넌트의 공통 크기 타입
 */
export type FieldSize = "sm" | "lg";

/**
 * 필드 컴포넌트의 공통 Props 타입
 *
 * @remarks
 * - `placeholder` - 플레이스홀더 텍스트
 * - `title` - 툴팁 텍스트
 * - `disabled` - 비활성화 상태 (회색 배경)
 * - `readonly` - 읽기 전용 상태 (편집 불가, 텍스트로 표시)
 * - `required` - 필수 입력 여부
 * - `size` - 크기 (sm, lg)
 * - `theme` - 테마 색상
 * - `inline` - 인라인 스타일
 * - `inset` - 부모 요소에 삽입되는 형태 (테두리 제거)
 * - `inputStyle` - input 요소 커스텀 스타일
 * - `inputClass` - input 요소 커스텀 클래스
 */
export interface BaseFieldProps {
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  size?: FieldSize;
  theme?: FieldTheme;
  inline?: boolean;
  inset?: boolean;
  inputStyle?: JSX.CSSProperties;
  inputClass?: string;
  class?: string;
}
