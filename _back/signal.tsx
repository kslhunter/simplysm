import React, { ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";

// type SdContext<T> = Context<T> & { createNew(): T };

/*type SignalContextValue = {
  effects: Effect[];
  destroy(): void;
};*/

/*class SignalContext {
  effects = signal<Effect[]>([]);

  constructor() {
    useEffect(() => {
      void runEffects(this.effects());
    });

    useEffect(() => {
      return () => {
        for (const eff of this.effects()) {
          for (const sig of eff[EFFECT].usedSignalSet) {
            sig[SIGNAL].usingEffectSet.delete(eff);
          }
        }
        this.effects.set([]);
      };
    }, []);
  }
};*/

/*const ctx = useContext(SignalContext);
if (ctx == null) {
  throw new Error(`'SignalProvider'를 찾을 수 없습니다.`);
}
return ctx;*/

// const { SignalProvider, useSignal, SignalConsumer } = context("Signal", SignalContext);

