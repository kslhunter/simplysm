import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: "sdCase" })
export class SdCasePipe implements PipeTransform {
  public transform<T, R>(value: T, ...args: ([T, R] | R)[]): R | undefined {
    for (const arg of args) {
      if (arg instanceof Array && value === arg[0]) {
        return arg[1];
      }
      if (!(arg instanceof Array)) {
        return arg as R;
      }
    }
    return undefined;
  }
}
