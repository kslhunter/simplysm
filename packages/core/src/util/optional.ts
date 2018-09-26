export type ChainedRequired<T> = { [P in keyof T]-?: ChainedRequired<T[P]> };

export function optional<T, R>(obj: T, fn: (o: ChainedRequired<NonNullable<T>>) => R): R | undefined {
  try {
    return fn(obj as any);
  }
  catch (err) {
    if (err instanceof TypeError && err.message.includes("Cannot read property") && err.message.includes("of undefined")) {
      return undefined;
    }
    throw err;
  }
  /*const parsed: ILambdaParseResult = LambdaParser.parse(fn);
  const chains: string[] = parsed.returnContent.slice(parsed.params[0].length + 1).split(".");

  let cursor: any = obj;
  for (const chain of chains) {
    cursor = cursor === undefined ? undefined : cursor[chain];
  }

  return cursor;*/
}