import { SdError } from "./sd-error";

/**
 * Not implemented error
 *
 * An error thrown when a feature that has not yet been implemented is called.
 * Used for abstract method stubs, branches planned for future implementation, etc.
 *
 * @example
 * // Before abstract method implementation
 * class BaseService {
 *   process(): void {
 *     throw new NotImplementedError("Implementation required in subclass");
 *   }
 * }
 *
 * @example
 * // Branch planned for future implementation
 * switch (type) {
 *   case "A": return handleA();
 *   case "B": throw new NotImplementedError(`Handling for type ${type}`);
 * }
 */
export class NotImplementedError extends SdError {
  /**
   * @param message Additional description message
   */
  constructor(message?: string) {
    super("Not implemented" + (message != null ? ": " + message : ""));
    this.name = "NotImplementedError";
  }
}
