import React, { ReactElement, ReactNode, useContext, useRef } from "react";

function context<N extends string, T>(
  name: N
): {
  [P in `use${N}`]: () => T;
} & {
  [P in `${N}Provider`]: React.Provider<T>;
} & {
  [P in `${N}Consumer`]: React.Consumer<T>;
};
function context<N extends string, T>(
  name: N,
  initial: () => T
): {
  [P in `use${N}`]: () => T;
} & {
  [P in `${N}Provider`]: (props: { children?: ReactNode; value?: T }) => ReactElement;
} & {
  [P in `${N}Consumer`]: React.Consumer<T>;
};

function context<N extends string, T, IP>(
  name: N,
  initial: (props: IP) => T
): {
  [P in `use${N}`]: () => T;
} & {
  [P in `${N}Provider`]: (props: { children?: ReactNode; value: IP }) => ReactElement;
} & {
  [P in `${N}Consumer`]: React.Consumer<T>;
};

function context(name: string, initial?: (prop?: any) => any): any {
  const Context = React.createContext<any | undefined>(undefined);

  return {
    [`use${name}`]: () => {
      const ctx = useContext(Context);
      if (ctx == null) {
        throw new Error(`'${name}Provider'를 찾을 수 없습니다.`);
      }
      return ctx;
    },
    [`${name}Provider`]: initial
      ? ({ children, value }) => {
        const valRef = useRef<any>();
        if (valRef.current == null) {
          valRef.current = initial(value);
        }

        return <Context.Provider value={valRef.current}>{children}</Context.Provider>;
      }
      : Context.Provider,
    [`${name}Consumer`]: Context.Consumer
  };
}

export { context };
