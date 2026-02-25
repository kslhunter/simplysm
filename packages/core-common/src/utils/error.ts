/**
 * Utility to extract message from unknown type error.
 *
 * Returns the message property if it's an Error instance, otherwise returns String conversion.
 *
 * @param err - Unknown error from catch block
 * @returns Error message string
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
