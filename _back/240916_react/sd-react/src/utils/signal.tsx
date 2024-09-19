import { Wait } from "@simplysm/sd-core-common";
import React, { ReactNode, useContext, useEffect, useMemo, useReducer, useState } from "react";

export interface ISignalContext {
  effects: readonly Effect[];

  addEffect(eff: Effect): void;

  forceUpdate(): void;
}

export const SignalContext = React.createContext<ISignalContext | undefined>(undefined);

export function useSignal() {
  const ctx = useContext(SignalContext);
  if (ctx == null) {
    throw new Error(`'SignalProvider'를 찾을 수 없습니다.`);
  }
  return ctx;
}

export function SignalProvider(props: { children?: ReactNode }) {
  const [forceUpdateVal, forceUpdate] = useReducer(x => x + 1, 0);
  const [effects, setEffects] = useState<Effect[]>([]);

  const ctx = useMemo<ISignalContext>(() => {
    return {
      get effects(): readonly Effect[] {
        return effects;
      },
      addEffect(eff: Effect): void {
        setEffects(v => [...v, eff]);
      },
      forceUpdate() {
        forceUpdate();
      }
    };
  }, [effects, forceUpdateVal]);

  useEffect(() => {
    void runEffects(ctx);
  });

  useEffect(() => {
    return () => {
      for (const eff of effects) {
        for (const sig of eff[EFFECT].usedSignalSet) {
          sig[SIGNAL].usingEffectSet.delete(eff);
        }
      }
      setEffects([]);
    };
  }, []);

  return (
    <SignalContext.Provider value={ctx}>
      {props.children}
    </SignalContext.Provider>
  );
}

export const SignalConsumer = SignalContext.Consumer as React.Consumer<ISignalContext>;

export const SIGNAL = Symbol();
export const EFFECT = Symbol();

export interface Signal<T> {
  readonly current: T;

  set(value: T): void;

  update(fn: (value: T) => T): void;

  mark(): void;

  [SIGNAL]: {
    usingEffectSet: Set<Effect>;
  };
}

export interface ReadonlySignal<T> {
  get current(): T;
}

export interface Effect {
  (): Promise<void>;

  [EFFECT]: {
    dirty: boolean;
    usedSignalSet: Set<Signal<any>>;
  };
}

let _activeEffect: Effect | undefined;

export function createSignal<T>(ctx: ISignalContext): Signal<T | undefined>;
export function createSignal<T>(ctx: ISignalContext, initialValue: T): Signal<T>;
export function createSignal<T>(ctx: ISignalContext, initialValue?: T): Signal<T | undefined> {
  let val = initialValue;

  return {
    get current() {
      if (_activeEffect != null) {
        this[SIGNAL].usingEffectSet.add(_activeEffect);
        _activeEffect[EFFECT].usedSignalSet.add(this);
      }
      return val;
    },
    set(value: any) {
      if (val === value) return;
      val = value;
      this.mark();
    },
    update(fn: (value: any) => any) {
      const value = fn(val);
      this.set(value);
    },
    mark() {
      for (const eff of this[SIGNAL].usingEffectSet) {
        eff[EFFECT].dirty = true;
      }
      ctx.forceUpdate();
    },
    [SIGNAL]: {
      usingEffectSet: new Set()
    }
  };
}

export function createEffect(ctx: ISignalContext, fn: () => void | Promise<void>) {
  const eff = fn as Effect;
  eff[EFFECT] = {
    dirty: true,
    usedSignalSet: new Set()
  };

  ctx.addEffect(eff);
}


export function createComputed<R>(ctx: ISignalContext, fn: () => Promise<R>): ReadonlySignal<R | undefined>;
export function createComputed<R>(ctx: ISignalContext, fn: () => R): ReadonlySignal<R>;
export function createComputed<R>(ctx: ISignalContext, fn: () => Promise<R>, initialValue: R): ReadonlySignal<R>;
export function createComputed<R>(ctx: ISignalContext, fn: () => R | Promise<R>, initialValue?: R): ReadonlySignal<R | undefined>;
export function createComputed<R>(ctx: ISignalContext, fn: () => R | Promise<R>, initialValue?: R): ReadonlySignal<R | undefined> {
  const sig = createSignal(ctx, initialValue);

  return {
    get current() {
      const res = fn();
      if (res instanceof Promise) {
        void res.then((r) => sig.set(r));
      }
      else {
        sig.set(res);
      }

      createEffect(ctx, async () => {
        sig.set(await fn());
      });

      return sig.current;
    }
  };
}

let _running = false;

export async function runEffects(ctx: ISignalContext) {
  await Wait.until(() => !_running);
  _running = true;

  for (const eff of ctx.effects) {
    if (!eff[EFFECT].dirty) continue;

    if (_activeEffect != null) {
      throw new Error();
    }
    _activeEffect = eff;

    await eff();

    if (_activeEffect !== eff) {
      throw new Error();
    }
    _activeEffect = undefined;

    eff[EFFECT].dirty = false;
  }

  _running = false;
}

export function signal<T>(): Signal<T | undefined>;
export function signal<T>(initialValue: T): Signal<T>;
export function signal(initialValue?: any): Signal<any> {
  const ctx = useSignal();

  return useMemo(() => createSignal(ctx, initialValue), []);
}

export function effect(fn: () => void | Promise<void>) {
  const ctx = useSignal();

  useEffect(() => {
    createEffect(ctx, fn);
  }, []);
}

export function once<R>(fn: () => R): void {
  return useEffect(() => {
    fn();
  }, []);
}

export function mem<R>(fn: () => R): R {
  return useMemo(() => fn(), []);
}

export function computed<R>(fn: () => Promise<R>): ReadonlySignal<R | undefined>;
export function computed<R>(fn: () => R): ReadonlySignal<R>;
export function computed<R>(fn: () => Promise<R>, initialValue: R): ReadonlySignal<R>;
export function computed<R>(fn: () => R | Promise<R>, initialValue?: R): ReadonlySignal<R | undefined> {
  const ctx = useSignal();
  return useMemo(() => createComputed(ctx, fn, initialValue), []);
}