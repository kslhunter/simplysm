// Why we use the yaml library:
// To represent nested object structures in a readable format.
// Tree structure is more clearly visible than JSON.stringify.
import YAML from "yaml";
import { SdError } from "./sd-error";

/**
 * Argument error
 *
 * An error thrown when invalid arguments are received.
 * Includes the argument object in YAML format in the message to facilitate debugging.
 *
 * @example
 * // Passing only the argument object
 * throw new ArgumentError({ userId: 123, name: null });
 * // Result message: "Invalid arguments.\n\nuserId: 123\nname: null"
 *
 * @example
 * // Passing a custom message and argument object
 * throw new ArgumentError("Invalid user", { userId: 123 });
 * // Result message: "Invalid user\n\nuserId: 123"
 */
export class ArgumentError extends SdError {
  /** Output argument object in YAML format with default message ("Invalid arguments.") */
  constructor(argObj: Record<string, unknown>);
  /** Output argument object in YAML format with a custom message */
  constructor(message: string, argObj: Record<string, unknown>);
  constructor(arg1: Record<string, unknown> | string, arg2?: Record<string, unknown>);
  constructor(arg1: Record<string, unknown> | string, arg2?: Record<string, unknown>) {
    const message = typeof arg1 === "string" ? arg1 : undefined;
    const argObj = typeof arg1 === "string" ? arg2 : arg1;

    if (argObj != null) {
      super((message ?? "Invalid arguments.") + "\n\n" + YAML.stringify(argObj));
    } else {
      super(message ?? "Invalid arguments.");
    }
    this.name = "ArgumentError";
  }
}
