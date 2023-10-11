import {booleanAttribute} from "@angular/core";

export function coerceBoolean(value: boolean) {
  return booleanAttribute(value);
}