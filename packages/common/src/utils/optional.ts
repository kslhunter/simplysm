export function optional<T, R>(obj: T, fn: (o: NonNullable<T>) => R): R | undefined {
  try {
    return fn(obj as any);
  }
  catch (err) {
    if (err instanceof TypeError && err.message.includes("Cannot read property") && err.message.includes("of undefined")) {
      return undefined;
    }
    throw err;
  }
}
