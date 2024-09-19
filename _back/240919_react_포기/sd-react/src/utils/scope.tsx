import { createContext, MutableRefObject, useContext, useMemo, useReducer, useRef } from "react";
import { ComputedSignal, Effect, Signal } from "./signal";

const NODE = Symbol();

export class Signal<T> {
  #usingEffectSet = new Set<Effect>();
  #value: T;

  constructor(initialValue: T, _forceUpdateRef: MutableRefObject<() => void>) {
    this.#value = initialValue;
    this.forceUpdate();
  }

  get value() {
    if (_activeEffect != null) {
      this.#usingEffectSet.add(_activeEffect);
      _activeEffect[NODE].usedSignalSet.add(this);
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
      eff[NODE].dirty = true;
    }
    for (const eff of [...this.#usingEffectSet]) {
      if (!eff[NODE].isForComputed) {
        eff[NODE].run();
      }
    }
  }
}

export class Scope {
  constructor(private _forceUpdateRef: MutableRefObject<() => void>) {
  }

  signal<T>(): Signal<T | undefined>;
  signal<T>(initialValue: T): Signal<T>;
  signal<T>(initialValue?: T): Signal<T | undefined> {
    return new Signal(initialValue, this._forceUpdateRef);
  }

  effect(fn: () => void) {
    const eff = new Effect(fn);
    eff[NODE].run();
  }

  computed<R>(fn: () => R): ComputedSignal<R> {
    return new ComputedSignal(fn, this._forceUpdateRef);
  }
}

const ScopeContext = createContext<Scope | undefined>(undefined);

// useScope를 두번해도 같은값이여야함.
export function useScope() {
  const ctx = useContext(ScopeContext);
  if (ctx == null) {
    throw new Error(`'ScopeProvider'를 찾을 수 없습니다.`);
  }
  return ctx;
}

export function ScopeProvider({ children }) {
  const forceUpdate = useReducer((x) => x + 1, 0)[1];
  const forceUpdateRef = useRef(forceUpdate);
  forceUpdateRef.current = forceUpdate;

  const scope = useMemo(() => new Scope(forceUpdateRef), []);

  return (
    <ScopeContext.Provider value={scope}>
      {children}
    </ScopeContext.Provider>
  );
}