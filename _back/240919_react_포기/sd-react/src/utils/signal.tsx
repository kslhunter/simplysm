import React, { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useMemo } from "react";
import { TreeMap } from "@simplysm/sd-core-common";

export const SIGNAL = Symbol();

export interface ISignal {
  [SIGNAL]: {
    usingEffectSet: Set<Effect>
  };
}

export class PropSignal<T> implements ISignal {
  #usingEffectSet = new Set<Effect>();
  #value: T;

  constructor(initialValue: T) {
    this.#value = initialValue;
    this.forceUpdate();
  }

  get value() {
    if (_activeEffect != null) {
      this.#usingEffectSet.add(_activeEffect);
      _activeEffect[EFFECT].usedSignalSet.add(this);
    }
    return this.#value;
  }

  set(value: T) {
    if (this.#value === value) return;
    this.#value = value;
    this.forceUpdate();
  }

  forceUpdate() {
    for (const eff of [...this.#usingEffectSet]) {
      eff[EFFECT].dirty = true;
    }
    for (const eff of [...this.#usingEffectSet]) {
      if (!eff[EFFECT].isForComputed) {
        void eff[EFFECT].run();
      }
    }
  }

  [SIGNAL] = {
    usingEffectSet: this.#usingEffectSet
  };
}

export interface IReadonlySignal<T> {
  get value(): T;
}

export class Signal<T> implements ISignal {
  #usingEffectSet = new Set<Effect>();
  #value: T;
  #forceUpdateRef?: MutableRefObject<() => void>;

  constructor(initialValue: T, forceUpdateRef?: MutableRefObject<() => void>) {
    this.#value = initialValue;
    this.#forceUpdateRef = forceUpdateRef;
    this.forceUpdate();
  }

  get value() {
    if (_activeEffect != null) {
      this.#usingEffectSet.add(_activeEffect);
      _activeEffect[EFFECT].usedSignalSet.add(this);
    }
    return this.#value;
  }

  set(value: T) {
    if (this.#value === value) return;
    this.#value = value;
    this.forceUpdate();
  }

  update(fn: (value: T) => T) {
    const value = fn(this.#value);
    this.set(value);
  }

  forceUpdate() {
    this.#forceUpdateRef?.current();
    for (const eff of [...this.#usingEffectSet]) {
      eff[EFFECT].dirty = true;
    }
    for (const eff of [...this.#usingEffectSet]) {
      if (!eff[EFFECT].isForComputed) {
        void eff[EFFECT].run();
      }
    }
  }

  [SIGNAL] = {
    usingEffectSet: this.#usingEffectSet
  };
}

export function signal<T>(): Signal<T | undefined>
export function signal<T>(initialValue: T, rootForceUpdateRef?: MutableRefObject<() => void>): Signal<T>;
export function signal<T>(initialValue: undefined, rootForceUpdateRef?: MutableRefObject<() => void>): Signal<T | undefined>;
export function signal<T>(initialValue?: T, rootForceUpdateRef?: MutableRefObject<() => void>): Signal<any> {
  return runWithRootForceUpdateRef(
    rootForceUpdateRef,
    (forceUpdateRef) => {
      return new Signal(initialValue, forceUpdateRef);
    }
  );
}

export const EFFECT = Symbol();

export class Effect {
  #usedSignalSet = new Set<ISignal>();
  #fn: () => void | Promise<void>;

  constructor(fn: () => void | Promise<void>) {
    this.#fn = fn;
  }

  async #run() {
    await waitEffectRunning();
    /*await Wait.until(() => {
      if (_effectRunning) {
        return false;
      }
      else {
        _effectRunning = true;
        return true;
      }
    });*/

    if (!this[EFFECT].dirty) {
      _effectRunning = false;
      return;
    }
    this[EFFECT].dirty = false;

    for (const prevSig of [...this.#usedSignalSet]) {
      prevSig[SIGNAL].usingEffectSet.delete(this);
    }
    this.#usedSignalSet.clear();

    if (_activeEffect != null) {
      throw new Error();
    }
    _activeEffect = this;

    await this.#fn();

    if (_activeEffect !== this) {
      throw new Error();
    }
    _activeEffect = undefined;

    _effectRunning = false;
  }

  [EFFECT] = {
    isForComputed: false,
    dirty: true,
    usedSignalSet: this.#usedSignalSet,
    run: () => this.#run()
  };
}

export function effect(fn: () => void | Promise<void>, rootForceUpdateRef?: MutableRefObject<() => void>) {
  return runWithRootForceUpdateRef(
    rootForceUpdateRef,
    () => {
      const eff = new Effect(fn);
      void eff[EFFECT].run();
    }
  );
}

export class ComputedSignal<T> {
  #sig: Signal<T>;
  #eff: Effect;

  constructor(fn: () => T | Promise<T>, initialValue: T, forceUpdateRef?: MutableRefObject<() => void>) {
    this.#sig = new Signal(initialValue, forceUpdateRef);

    this.#eff = new Effect(async () => {
      this.#sig.set(await fn());
    });
    this.#eff[EFFECT].isForComputed = true;
  }

  get value() {
    void this.#eff[EFFECT].run();
    return this.#sig.value;
  }
}

export function computed<R>(fn: () => Promise<R>): ComputedSignal<R | undefined>;
export function computed<R>(fn: () => R): ComputedSignal<R>;
export function computed<R>(fn: () => R, initialValue: undefined, rootForceUpdateRef?: MutableRefObject<() => void>): ComputedSignal<R>;
export function computed<R>(fn: () => Promise<R>, initialValue: R, rootForceUpdateRef?: MutableRefObject<() => void>): ComputedSignal<R>;
export function computed<R>(fn: () => Promise<R>, initialValue: undefined, rootForceUpdateRef?: MutableRefObject<() => void>): ComputedSignal<R | undefined>;
export function computed<R>(fn: () => R | Promise<R>, initialValue?: R, rootForceUpdateRef?: MutableRefObject<() => void>): ComputedSignal<R | undefined> {
  return runWithRootForceUpdateRef(
    rootForceUpdateRef,
    (forceUpdateRef) => {
      return new ComputedSignal(fn, initialValue, forceUpdateRef);
    }
  );
}

export function getter<P extends any[], R>(fn: (...params: P) => Promise<R>): (...params: P) => R | undefined;
export function getter<P extends any[], R>(fn: (...params: P) => R): (...params: P) => R;
export function getter<P extends any[], R>(fn: (...params: P) => Promise<R>, initialValue: R, rootForceUpdateRef?: MutableRefObject<() => void>): (...params: P) => R;
export function getter<P extends any[], R>(fn: (...params: P) => Promise<R>, initialValue: undefined, rootForceUpdateRef?: MutableRefObject<() => void>): (...params: P) => R | undefined;
export function getter<P extends any[], R>(fn: (...params: P) => R | Promise<R>, initialValue?: R, rootForceUpdateRef?: MutableRefObject<() => void>): (...params: P) => R | undefined {
  return runWithRootForceUpdateRef(
    rootForceUpdateRef,
    (forceUpdateRef) => {
      const computedMap = new TreeMap<ComputedSignal<R | undefined>>();
      return (...params: P): R | undefined => {
        const sig = computedMap.getOrCreate(params, new ComputedSignal(() => fn(...params), initialValue, forceUpdateRef));
        return sig.value;
      };
    }
  );
}

export function callback<F extends (...args: any[]) => any>(fn: F): F {
  return useCallback(fn, []);
}

export function once<R>(fn: () => R): void {
  return useEffect(() => {
    fn();
  }, []);
}

let _activeEffect: Effect | undefined;
let _effectRunning = false;

async function waitEffectRunning() {
  while (_effectRunning) {
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  }
  _effectRunning = true;
}

export function toSignal<S>(state: [S, Dispatch<SetStateAction<S>>?]): IReadonlySignal<S> {
  const sig = signal(state[0]);
  sig.set(state[0]);
  return sig as IReadonlySignal<S>;
}

export function useForceUpdateRef(): MutableRefObject<() => void> | undefined {
  // const forceUpdate = useReducer((x) => x + 1, 0)[1];
  // const forceUpdateRef = useRef(forceUpdate);
  // forceUpdateRef.current = forceUpdate;
  // return forceUpdateRef;
  return undefined;
}

// interface IDispatcher {
//   useRef: typeof React.useRef;
//   useCallback: typeof React.useCallback;
//   useReducer: typeof React.useReducer;
//   useSyncExternalStore: typeof React.useSyncExternalStore;
//   useEffect: typeof React.useEffect;
//   useImperativeHandle: typeof React.useImperativeHandle;
// }

function runWithRootForceUpdateRef<R>(rootForceUpdateRef: MutableRefObject<() => void> | undefined, fn: (forceUpdateRef?: MutableRefObject<() => void>) => R): R {
  const dp = React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"].ReactCurrentDispatcher.current ?? undefined;
  if (dp != null && !/Invalid/.test(dp.useCallback.toString())) {
    // const forceUpdate = useReducer((x) => x + 1, 0)[1];
    // const forceUpdateRef = useRef(forceUpdate);
    // forceUpdateRef.current = forceUpdate;
    return useMemo(() => fn(), []);
  }
  else {
    return fn();
  }

  /*if (rootDispatcher) {
    const currentDispatcher: IDispatcher | undefined = React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"].ReactCurrentDispatcher.current ?? undefined;

    if (currentDispatcher && rootDispatcher === currentDispatcher) {
      // const forceUpdate = useReducer((x) => x + 1, 0)[1];
      // const forceUpdateRef = useRef(forceUpdate);
      // forceUpdateRef.current = forceUpdate;
      return useMemo(() => fn(rootDispatcher.forceUpdateRef), []);
    }
    else {
      // const forceUpdate = rootDispatcher.useReducer((x) => x + 1, 0)[1];
      // const forceUpdateRef = rootDispatcher.useRef(forceUpdate);
      // forceUpdateRef.current = forceUpdate;
      return fn(rootDispatcher.forceUpdateRef);
    }
  }
  else {
    const forceUpdate = useReducer((x) => x + 1, 0)[1];
    const forceUpdateRef = useRef(forceUpdate);
    forceUpdateRef.current = forceUpdate;
    return useMemo(() => fn(forceUpdateRef), []);
  }*/
}

/*
let currentDispatcher: any;
Object.defineProperty(React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"].ReactCurrentDispatcher, "current", {
  get() {
    return currentDispatcher;
  },
  set(v: any) {
    if (v != null) React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"].lastDispatcher = v;
    currentDispatcher = v;
  }
});

let currentOwner: any;
Object.defineProperty(React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"].ReactCurrentOwner, "current", {
  get() {
    return currentOwner;
  },
  set(v: any) {
    if (v != null) React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"].lastOwner = v;
    currentOwner = v;
  }
});*/