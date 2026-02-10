import { SdError } from "./sd-error";
/**
 * 인수 오류
 *
 * 잘못된 인수를 받았을 때 발생시키는 에러이다.
 * 인수 객체를 YAML 형식으로 메시지에 포함하여 디버깅을 용이하게 한다.
 *
 * @example
 * // 인수 객체만 전달
 * throw new ArgumentError({ userId: 123, name: null });
 * // 결과 메시지: "인수가 잘못되었습니다.\n\nuserId: 123\nname: null"
 *
 * @example
 * // 커스텀 메시지와 인수 객체 전달
 * throw new ArgumentError("유효하지 않은 사용자", { userId: 123 });
 * // 결과 메시지: "유효하지 않은 사용자\n\nuserId: 123"
 */
export declare class ArgumentError extends SdError {
  /** 기본 메시지("인수가 잘못되었습니다.")와 함께 인수 객체를 YAML 형식으로 출력 */
  constructor(argObj: Record<string, unknown>);
  /** 커스텀 메시지와 함께 인수 객체를 YAML 형식으로 출력 */
  constructor(message: string, argObj: Record<string, unknown>);
  constructor(arg1: Record<string, unknown> | string, arg2?: Record<string, unknown>);
}
//# sourceMappingURL=argument-error.d.ts.map
