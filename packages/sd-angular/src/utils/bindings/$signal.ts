/* eslint-disable @typescript-eslint/no-restricted-imports */

import { signal, WritableSignal } from "@angular/core";
import { $mark } from "./utils/$mark";

export interface SdWritableSignal<T> extends WritableSignal<T> {
  $mark(): void;
}

export function $signal<T>(): SdWritableSignal<T | undefined>;
export function $signal<T>(initialValue: T): SdWritableSignal<T>;
export function $signal<T>(initialValue?: T): SdWritableSignal<T | undefined> {
  const sig = signal(initialValue) as SdWritableSignal<T | undefined>;
  sig.$mark = () => $mark(sig);
  return sig;
}


export function to$Signal<T>(sig: WritableSignal<T>): SdWritableSignal<T> {
  const result = sig as SdWritableSignal<T>;
  result.$mark = () => $mark(sig);
  return result;
}