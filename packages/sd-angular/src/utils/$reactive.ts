import { Signal, signal, WritableSignal } from "@angular/core";
import {
  producerAccessed,
  producerIncrementEpoch,
  producerNotifyConsumers,
  producerUpdatesAllowed,
  ReactiveNode,
  runPostSignalSetFn,
  SIGNAL,
  SignalNode,
} from "@angular/core/primitives/signals";
import { isObservable, Observable } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";

export function $toReactive<T>(obs: Observable<T>): { value: T };
export function $toReactive<T>(sig: WritableSignal<T>): { value: T };
export function $toReactive<T>(sig: Signal<T>): { readonly value: T };
export function $toReactive<T>(arg: Observable<T> | Signal<T> | WritableSignal<T>): { value: T } {
  let sig: WritableSignal<any> | Signal<any>;

  if (isObservable(arg)) {
    sig = toSignal(arg);
  } else {
    sig = arg;
  }
  const node = sig[SIGNAL] as ReactiveNode;

  /*function mark() {
    if (!producerUpdatesAllowed()) {
      throw new Error();
    }
    reactiveValueChange(node);
  }*/

  if ("set" in sig) {
    return {
      get value(): T {
        const val = sig();
        return reactiveObject(val, node);
      },
      set value(val: T) {
        sig.set(val);
      },
    };
  } else {
    return {
      get value(): T {
        const val = sig();
        return reactiveObject(val, node);
      },
    };
  }
}

export function $reactive<T>(): { value: T | undefined };
export function $reactive<T>(initialValue: T): { value: T };
export function $reactive<T>(initialValue?: T): { value: T | undefined } {
  const sig = signal(initialValue);

  const node = sig[SIGNAL] as SignalNode<T>;

  /*function mark() {
    if (!producerUpdatesAllowed()) {
      throw new Error();
    }
    reactiveValueChange(node);
  }*/

  /*sig.set = (newValue: T) => {
    signalSetFn(node, isObject(newValue) ? reactiveObject(newValue, mark) : newValue);
  };
  sig.update = (updateFn: (value: T) => T) => {
    const newValue = updateFn(node.value);
    signalSetFn(node, isObject(newValue) ? reactiveObject(newValue, mark) : newValue);
  };*/

  return {
    get value(): T | undefined {
      const val = sig();
      return reactiveObject(val, node);
    },
    set value(val: T | undefined) {
      sig.set(val);
    },
  };
}

const IS_PROXY = Symbol();

function reactiveObject<T>(obj: T, node: ReactiveNode): T {
  if (obj != null && obj[IS_PROXY] === true) {
    return obj;
  }

  if (!isObject(obj)) {
    return obj;
  }

  if (obj instanceof Node) {
    return obj;
  }

  return new Proxy(obj, {
    get(target: object, p: string | symbol, receiver: any): any {
      if (p === IS_PROXY) {
        return true;
      }

      if (target instanceof Array) {
        const arrInstruments = getArrInstruments(target, node);
        if (p in arrInstruments) {
          return (...args: unknown[]) => {
            return arrInstruments[p](...args);
          };
        }
      }

      if (target instanceof Map) {
        const mapInstruments = getMapInstruments(target, node);
        if (p in mapInstruments) {
          return (...args: unknown[]) => {
            return mapInstruments[p](...args);
          };
        }
      }

      if (target instanceof Date) {
        const dateInstruments = getDateInstruments(target, node);
        if (p in dateInstruments) {
          return (...args: unknown[]) => {
            return dateInstruments[p](...args);
          };
        }
      }

      producerAccessed(node);
      const res = Reflect.get(target, p, receiver);
      return reactiveObject(res, node);
    },
    set(target: object, p: string | symbol, newValue: any, receiver: any): boolean {
      const result = Reflect.set(target, p, newValue, receiver);
      reactiveValueChange(node);
      return result;
    },
    deleteProperty(target: object, p: string | symbol): boolean {
      const result = Reflect.deleteProperty(target, p);
      reactiveValueChange(node);
      return result;
    },
  }) as T;
}

function isObject(val: any): val is object {
  return typeof val === "object";
}

function reactiveValueChange(node: ReactiveNode) {
  if (!producerUpdatesAllowed()) {
    throw new Error();
  }

  node.version++;
  producerIncrementEpoch();
  producerNotifyConsumers(node);
  runPostSignalSetFn();
}

function getArrInstruments(target: any, node: ReactiveNode) {
  return {
    every(...args: unknown[]) {
      return target.every(...args);
    },
    filter(...args: unknown[]) {
      const res = target.filter(...args);
      return res.map((item) => reactiveObject(item, node));
    },
    find(...args: unknown[]) {
      const res = target.find(...args);
      return reactiveObject(res, node);
    },
    findIndex(...args: unknown[]) {
      return target.findIndex(...args);
    },
    findLast(...args: unknown[]) {
      const res = target.findLast(...args);
      return reactiveObject(res, node);
    },
    findLastIndex(...args: unknown[]) {
      return target.findLastIndex(...args);
    },
    includes(...args: unknown[]) {
      return target.includes(...args);
    },
    indexOf(...args: unknown[]) {
      return target.indexOf(...args);
    },
    some(...args: unknown[]) {
      return target.some(...args);
    },
  };
}

function getMapInstruments(target: any, node: ReactiveNode) {
  return {
    get(...args: unknown[]) {
      const res = target.get(...args);
      return reactiveObject(res, node);
    },
    set(...args: unknown[]) {
      const res = target.set(...args);
      reactiveValueChange(node);
      return reactiveObject(res, node);
    },
  };
}

function getDateInstruments(target: any, node: ReactiveNode) {
  return {
    getFullYear(...args: unknown[]) {
      return target.getFullYear(...args);
    },
    getMonth(...args: unknown[]) {
      return target.getMonth(...args);
    },
    getDate(...args: unknown[]) {
      return target.getDate(...args);
    },
    getHours(...args: unknown[]) {
      return target.getHours(...args);
    },
    getMinutes(...args: unknown[]) {
      return target.getMinutes(...args);
    },
    getSeconds(...args: unknown[]) {
      return target.getSeconds(...args);
    },
    getMilliseconds(...args: unknown[]) {
      return target.getMilliseconds(...args);
    },
    getTime(...args: unknown[]) {
      return target.getTime(...args);
    },
    getDay(...args: unknown[]) {
      return target.getDay(...args);
    },
    getTimezoneOffset(...args: unknown[]) {
      return target.getTimezoneOffset(...args);
    },
  };
}
