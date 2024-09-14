import React, { Context, useContext, useRef, useState } from "react";

type SdContext<T> = Context<T> & { createNew(): T };

export type SignalContextValue = {
  effects: Effect[];
  destroy(): void;
};

const _SignalContext = React.createContext(undefined as any) as SdContext<SignalContextValue>;
_SignalContext.createNew = () => {
  return {
    effects: [],
    destroy() {
      for (const eff of this.effects) {
        for (const sig of eff[EFFECT].usedSignals) {
          sig[Signal].usingEffects.remove((item) => item === eff);
        }
      }
      this.effects.clear();
    },
  };
};

export const SignalContext = _SignalContext;

const Signal = Symbol();
const EFFECT = Symbol();

interface SignalCreator<T> {
  (): Signal<T | undefined>;

  (initialValue: T): Signal<T>;
}

interface EffectCreator {
  (fn: () => void | Promise<void>): void;
}

interface Signal<T> {
  (): T;

  set(value: T): void;

  update(fn: (value: T) => T): void;

  [Signal]: {
    usingEffects: Effect[];
  };
}

interface Effect {
  (): Promise<void>;

  [EFFECT]: {
    dirty: boolean;
    usedSignals: Signal<any>[];
  };
}

function _signal<T>(initialValue: T): Signal<T> {
  const state = useState(initialValue);
  const stateRef = useRef(state);
  stateRef.current = state;

  const sigRef = useRef<Signal<T>>();
  if (sigRef.current) return sigRef.current;

  const sig = () => {
    registerToActiveEffect(sig);
    return stateRef.current[0];
  };

  sig.set = (value: T) => {
    if (stateRef.current[0] === value) return;
    stateRef.current[1](value);
    makeDirty(sig);
  };

  sig.update = (fn: (value: T) => T) => {
    const result = fn(stateRef.current[0]);
    if (stateRef.current[0] === result) return;
    stateRef.current[1](result);
    makeDirty(sig);
  };

  sig[Signal] = {
    usingEffects: [],
  };

  sigRef.current = sig;

  return sig;
}

export const signal = _signal as SignalCreator<any>;

function _effect(fn: () => void | Promise<void>) {
  const context = useContext(SignalContext);

  const effRef = useRef<Effect>();
  if (effRef.current) return;

  const eff = fn as Effect;
  eff[EFFECT] = {
    dirty: true,
    usedSignals: [],
  };

  effRef.current = eff;

  context.effects.push(eff);
}

export const effect = _effect as EffectCreator;

export async function runEffects(context: { effects: Effect[] }) {
  for (const eff of context.effects) {
    if (!eff[EFFECT].dirty) continue;
    startActiveEffect(eff);
    await eff();
    endActiveEffect(eff);
    eff[EFFECT].dirty = false;
  }
}

let _activeEffect: Effect | undefined;

function startActiveEffect(eff: Effect) {
  if (_activeEffect != null && _activeEffect !== eff) {
    throw new Error();
  }
  _activeEffect = eff;
}

function endActiveEffect(eff: Effect) {
  if (_activeEffect && eff !== _activeEffect) {
    throw new Error();
  }
  _activeEffect = undefined;
}

function registerToActiveEffect(sig: Signal<any>) {
  if (_activeEffect == null) return;
  sig[Signal].usingEffects.push(_activeEffect);
  _activeEffect[EFFECT].usedSignals.push(sig);
}

function makeDirty(sig: Signal<any>) {
  for (const eff of sig[Signal].usingEffects) {
    eff[EFFECT].dirty = true;
  }
}
