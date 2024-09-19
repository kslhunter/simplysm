import { ForwardedRef, forwardRef, memo, PropsWithoutRef, ReactHTML, ReactNode, RefAttributes, useMemo } from "react";
import { PropSignal } from "./signal";

export type THtmlTags = keyof ReactHTML & keyof HTMLElementTagNameMap;

export type TProps<P extends PropsWithoutRef<any>, K extends THtmlTags> = Readonly<P & ReturnType<ReactHTML[K]>["props"] & RefAttributes<HTMLElementTagNameMap[K]>>;

export type TFwdRef<K extends THtmlTags> = ForwardedRef<HTMLElementTagNameMap[K]>;

export function component<F extends (props: TProps<any, any>, fwdRef: TFwdRef<any>) => ReactNode>(name: string, fn: F): F {
  console.log("[start] draw", name);

  const tempFn = (props: any, fwdRef: ForwardedRef<any>) => {
    const newProps = useMemo(() => ({} as any), []);
    for (const key of Object.keys(props)) {
      if (!(key in newProps)) {
        const sig = new PropSignal(props[key]);

        Object.defineProperty(newProps, key, {
          get() {
            return sig.value;
          },
          set(v: any) {
            sig.set(v);
          },
          enumerable: true,
          configurable: false
        });
      }
      newProps[key] = props[key];
    }

    return fn(newProps, fwdRef);
  };
  tempFn["displayName"] = name;

  console.log("[end] draw", name);
  return memo(forwardRef(tempFn)) as any;
}