export function optional<R>(fn: () => R): R | undefined {
  try {
    return fn();
  }
  catch (err) {
    if (err instanceof TypeError && err.message.includes("Cannot read property") && err.message.includes("of undefined")) {
      return undefined;
    }
    throw err;
  }
}
