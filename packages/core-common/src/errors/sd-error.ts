/**
 * 트리 구조 조합을 지원하는 에러 클래스
 * ES2024 cause 속성을 활용
 */
export class SdError extends Error {
  override cause?: Error;

  /** 원인 에러를 감싸서 생성. 메시지는 역순으로 결합됨 (상위 메시지 => 하위 메시지 => 원인 메시지) */
  constructor(cause: Error, ...messages: string[]);
  /** 메시지만으로 생성. 메시지는 역순으로 결합됨 (상위 메시지 => 하위 메시지) */
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

    // captureStackTrace는 V8 엔진(Node.js, Chrome)에서만 사용 가능
    if ("captureStackTrace" in Error) {
      (Error as unknown as Record<string, Function>)["captureStackTrace"](this, new.target);
    }

    // 원인 체인 stack을 현재 stack에 추가
    if (cause?.stack != null) {
      this.stack += `\n---- cause stack ----\n${cause.stack}`;
    }
  }
}
