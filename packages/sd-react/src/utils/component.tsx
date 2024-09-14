import {
  createElement,
  ForwardedRef,
  forwardRef,
  memo, PropsWithoutRef,
  ReactHTML,
  ReactNode,
  useContext,
  useEffect,
  useRef
} from "react";
import { runEffects, SignalContext, SignalContextValue } from "./signal";

function component<P extends PropsWithoutRef<any>, K extends (keyof ReactHTML & keyof HTMLElementTagNameMap)>(
  name: string,
  fc: (props: P & ReturnType<ReactHTML[K]>["props"], fwdRef: ForwardedRef<HTMLElementTagNameMap[K]>) => ReactNode,
) {
  const resultFc = (props: P & ReturnType<ReactHTML[K]>["props"], fwdRef: ForwardedRef<HTMLElementTagNameMap[K]>): ReactNode => {
    const signalContextValueRef = useRef<SignalContextValue>();
    signalContextValueRef.current ??= SignalContext.createNew();

    useEffect(() => {
      return () => {
        signalContextValueRef.current!.destroy();
      };
    }, []);

    function tempFn(props1: P & ReturnType<ReactHTML[K]>["props"]) {
      const signalContext = useContext(SignalContext);
      useEffect(() => {
        void runEffects(signalContext);
      });
      return fc(props1, fwdRef);
    }

    tempFn.displayName = name + ".$compoment.tempFn";
    const tempComp = createElement(tempFn, props);

    return <SignalContext.Provider value={signalContextValueRef.current}>{tempComp}</SignalContext.Provider>;
  };
  resultFc.displayName = name + ".$compoment";

  return memo(forwardRef(resultFc));
}

export { component };
