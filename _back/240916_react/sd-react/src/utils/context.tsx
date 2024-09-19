import React, { createElement, ReactElement, ReactNode, useContext } from "react";
import { mem, SignalProvider } from "./signal";
import { Type } from "@simplysm/sd-core-common";

function context<N extends string, T>(name: N, initialFn: () => Type<T> & {
  template?: (children?: ReactNode) => ReactElement
}): {
  [P in `use${N}`]: () => Readonly<T>;
} & {
  [P in `${N}Provider`]: (props: { children?: ReactNode }) => ReactElement;
} & {
  [P in `${N}Consumer`]: React.Consumer<T>;
} {
  const Context = React.createContext<any | undefined>(undefined);

  return {
    [`use${name}`]: () => {
      const ctx = useContext(Context);
      if (ctx == null) {
        throw new Error(`'${name}Provider'를 찾을 수 없습니다.`);
      }
      return ctx;
    },
    [`${name}Provider`]: ({ children }) => {
      console.log("provider");

      const tempFn = (props: { children?: ReactNode }) => {
        console.log("provider.tempFn");
        const type = initialFn();
        const instance = mem(() => new type());

        return (
          <Context.Provider value={instance}>{type.template ? type.template(props.children) : props.children}</Context.Provider>
        );
      };
      tempFn["displayName"] ??= name + ".tempFn";

      return (
        <SignalProvider>
          {createElement(tempFn, {}, children)}
        </SignalProvider>
      );
    },
    [`${name}Consumer`]: Context.Consumer
  } as any;
}

export { context };