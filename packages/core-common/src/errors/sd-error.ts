/**
 * 오류의 Tree 구조 구성이 가능한 오류 클래스
 * ES2024 cause 속성 활용
 *
 * @example
 * // 원인 에러를 감싸서 생성
 * try {
 *   await fetch(url);
 * } catch (err) {
 *   throw new SdError(err, "API 호출 실패", "사용자 로드 실패");
 * }
 * // 결과 메시지: "사용자 로드 실패 => API 호출 실패 => 원본 에러 메시지"
 *
 * @example
 * // 메시지만으로 생성
 * throw new SdError("잘못된 상태", "처리 불가");
 * // 결과 메시지: "처리 불가 => 잘못된 상태"
 */
export class SdError extends Error {
  override cause?: Error;

  /** 원인 에러를 감싸서 생성. 메시지는 역순으로 연결됨 (상위 메시지 => 하위 메시지 => 원인 메시지) */
  constructor(cause: Error, ...messages: string[]);
  /** 메시지만으로 생성. 메시지는 역순으로 연결됨 (상위 메시지 => 하위 메시지) */
  constructor(...messages: string[]);
  constructor(arg1?: unknown, ...messages: string[]);
  constructor(arg1?: unknown, ...messages: string[]) {
    const arg1Message =
      arg1 instanceof Error
        ? arg1.message
        : typeof arg1 === "string"
          ? arg1
          : arg1 != null
            ? String(arg1)
            : undefined;

    const fullMessage = [arg1Message, ...messages]
      .filter((m) => m != null)
      .reverse()
      .join(" => ");

    const cause = arg1 instanceof Error ? arg1 : undefined;

    super(fullMessage, { cause });

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "SdError";

    // V8 엔진(Node.js, Chrome)에서만 사용 가능한 captureStackTrace
    if ("captureStackTrace" in Error) {
      (Error.captureStackTrace as (targetObject: object, constructorOpt?: Function) => void)(
        this,
        new.target,
      );
    }

    // cause 체인의 stack을 현재 stack에 추가
    if (cause?.stack != null) {
      this.stack += `\n---- cause stack ----\n${cause.stack}`;
    }
  }
}
