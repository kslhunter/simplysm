export const omit = <T extends Record<string, any>, K extends keyof T & string>(props: T, keys: K[]): Omit<T, K> => {
  const result = { ...props };
  for (const key of keys) {
    delete result[key];
  }
  return result;
};
