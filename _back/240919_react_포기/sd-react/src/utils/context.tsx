import React, { ReactElement, ReactNode, useContext } from "react";

export function context<N extends string, F extends () => (object & ISdRenderContext)>(
  name: N,
  initialFn: F
): {
  [P in `use${N}`]: F;
} & {
  [P in `${N}Provider`]: (props: { children?: ReactNode }) => ReactElement;
} & {
  [P in `${N}Consumer`]: React.Consumer<ReturnType<F>>;
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
    [`${name}Provider`]: (props: { children?: ReactNode }) => {
      // console.log(React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"].ReactCurrentOwner.current);

      console.log("[start] load", name + "Provider");

      const instance = initialFn();

      console.log("[end] load", name + "Provider");
      return (
        <Context.Provider value={instance}>
          {instance.render ? instance.render({ children: props.children }) : props.children}
        </Context.Provider>
      );
    },
    [`${name}Consumer`]: Context.Consumer
  } as any;
}

export interface ISdRenderContext {
  render?: (props: { children?: ReactNode }) => ReactNode;
}