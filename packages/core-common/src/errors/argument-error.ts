// yaml 라이브러리를 사용하는 이유:
// 중첩된 객체 구조를 읽기 쉬운 형식으로 표현하기 위함.
// JSON.stringify보다 트리 구조가 더 명확하게 보임.
import YAML from "yaml";
import { SdError } from "./sd-error";

/**
 * 인자 오류
 *
 * 유효하지 않은 인자를 전달받았을 때 발생하는 에러.
 * 디버깅을 용이하게 하기 위해 인자 객체를 YAML 형식으로 메시지에 포함한다.
 *
 * @example
 * // 인자 객체만 전달
 * throw new ArgumentError({ userId: 123, name: null });
 * // 결과 메시지: "잘못된 인자입니다.\n\nuserId: 123\nname: null"
 *
 * @example
 * // 커스텀 메시지와 인자 객체를 전달
 * throw new ArgumentError("잘못된 사용자", { userId: 123 });
 * // 결과 메시지: "잘못된 사용자\n\nuserId: 123"
 */
export class ArgumentError extends SdError {
  /** 기본 메시지("잘못된 인자입니다.")와 함께 인자 객체를 YAML 형식으로 출력 */
  constructor(argObj: Record<string, unknown>);
  /** 커스텀 메시지와 함께 인자 객체를 YAML 형식으로 출력 */
  constructor(message: string, argObj: Record<string, unknown>);
  constructor(arg1: Record<string, unknown> | string, arg2?: Record<string, unknown>);
  constructor(arg1: Record<string, unknown> | string, arg2?: Record<string, unknown>) {
    const message = typeof arg1 === "string" ? arg1 : undefined;
    const argObj = typeof arg1 === "string" ? arg2 : arg1;

    if (argObj != null) {
      super((message ?? "잘못된 인자입니다.") + "\n\n" + YAML.stringify(argObj));
    } else {
      super(message ?? "잘못된 인자입니다.");
    }
    this.name = "ArgumentError";
  }
}
