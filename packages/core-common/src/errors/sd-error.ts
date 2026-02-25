/**
 * Error class supporting Tree structure composition
 * Utilizes ES2024 cause property
 *
 * @example
 * // Wrap a cause error
 * try {
 *   await fetch(url);
 * } catch (err) {
 *   throw new SdError(err, "API call failed", "User load failed");
 * }
 * // Result message: "User load failed => API call failed => original error message"
 *
 * @example
 * // Create with message only
 * throw new SdError("invalid state", "processing not possible");
 * // Result message: "processing not possible => invalid state"
 */
export class SdError extends Error {
  override cause?: Error;

  /** Create by wrapping a cause error. Messages are joined in reverse order (upper message => lower message => cause message) */
  constructor(cause: Error, ...messages: string[]);
  /** Create with messages only. Messages are joined in reverse order (upper message => lower message) */
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

    // captureStackTrace available only on V8 engine (Node.js, Chrome)
    if ("captureStackTrace" in Error) {
      (Error.captureStackTrace as (targetObject: object, constructorOpt?: Function) => void)(
        this,
        new.target,
      );
    }

    // Add cause chain stack to current stack
    if (cause?.stack != null) {
      this.stack += `\n---- cause stack ----\n${cause.stack}`;
    }
  }
}
