export function optional<R extends any>(fn: () => R): R | undefined {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .catch((err: Error) => {
          if (err instanceof TypeError && err.message.includes("Cannot read property") && (err.message.includes("of undefined") || err.message.includes("of null"))) {
            return;
          }
          throw err;
        });
    }
    else {
      return result;
    }
  }
  catch (err) {
    if (err instanceof TypeError && err.message.includes("Cannot read property") && (err.message.includes("of undefined") || err.message.includes("of null"))) {
      return undefined;
    }
    throw err;
  }
}
