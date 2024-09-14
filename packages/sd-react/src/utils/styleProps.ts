export type TStyleProps<T> = {
  [K in keyof T & string as `$${K}`]: T[K];
};

export function styleProps<T>(props: T): TStyleProps<T> {
  const r: any = {};
  for (const key in props) {
    r[`$${key}`] = props[key];
  }
  return r;
}
