export function optional<R>(fn: () => R): R | undefined {
  try {
    return fn();
  }
  catch (err) {
    if (err instanceof TypeError && err.message.includes("Cannot read property") && (err.message.includes("of undefined") || err.message.includes("of null"))) {
      return undefined;
    }
    throw err;
  }
}
