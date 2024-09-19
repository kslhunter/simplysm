import React, { createElement, ForwardedRef, forwardRef, memo, PropsWithoutRef, ReactHTML, ReactNode } from "react";
import { SignalProvider } from "./signal";

export function component<
  P extends PropsWithoutRef<any>,
  K extends keyof ReactHTML & keyof HTMLElementTagNameMap
>(
  name: string,
  fn: (props: P & ReturnType<ReactHTML[K]>["props"], fwdRef: ForwardedRef<HTMLElementTagNameMap[K]>) => ReactNode
) {
  fn["displayName"] ??= name;

  const resultFc = (
    props: P & ReturnType<ReactHTML[K]>["props"],
    fwdRef: ForwardedRef<HTMLElementTagNameMap[K]>
  ) => {
    const tempFn = () => (
      <>{fn(props, fwdRef)}</>
    );
    tempFn["displayName"] ??= name + ".wrap.tempFn";

    return (
      <SignalProvider>
        {createElement(tempFn)}
      </SignalProvider>
    );
  };
  resultFc.displayName = name + ".wrap";

  return memo(forwardRef(resultFc));
}