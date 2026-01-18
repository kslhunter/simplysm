/**
 * 오류의 Tree 구조 구성이 가능한 오류 클래스
 * ES2022 cause 속성 활용
 */
export class SdError extends Error {
  override cause?: Error;

  constructor(cause: Error, ...messages: string[]);
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

    if (typeof Error.captureStackTrace !== "undefined") {
      Error.captureStackTrace(this, new.target);
    }

    // cause 체인의 stack을 현재 stack에 추가
    if (cause?.stack != null) {
      this.stack += `\n---- cause stack ----\n${cause.stack}`;
    }
  }
}
