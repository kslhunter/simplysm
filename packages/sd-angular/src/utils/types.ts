import { InputSignal } from "@angular/core";
import { TUndefToOptional } from "@simplysm/sd-core-common";

export type TDirectiveInputSignals<T> = TUndefToOptional<{
  [P in keyof T as T[P] extends InputSignal<any> ? P : never]: T[P] extends InputSignal<any>
    ? ReturnType<T[P]>
    : never;
}>;
