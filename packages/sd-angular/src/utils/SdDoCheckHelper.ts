import {ObjectUtil} from "@simplysm/sd-core-common";

export class SdDoCheckHelper {
  changeData: Record<string, any> = {};

  constructor(private _prevData: Record<string, any>) {

  }

  run<R extends void | Promise<void>>(checkData: Record<string, [any, ("one" | "all")?]>, cb: () => R): R | void {
    let changed = false;
    for (const checkKey of Object.keys(checkData)) {
      const [checkVal, method] = checkData[checkKey];
      if (Object.keys(this.changeData).includes(checkKey)) {
        changed = true;
        break;
      }

      if (method === "all") {
        if (!ObjectUtil.equal(this._prevData[checkKey], checkVal)) {
          this.changeData[checkKey] = ObjectUtil.clone(checkVal);
          changed = true;
          break;
        }
      }
      else if (method == "one") {
        if (!ObjectUtil.equal(this._prevData[checkKey], checkVal, {onlyOneDepth: true})) {
          this.changeData[checkKey] = ObjectUtil.clone(checkVal, {onlyOneDepth: true});
          changed = true;
          break;
        }
      }
      else {
        if (this._prevData[checkKey] !== checkVal) {
          this.changeData[checkKey] = checkVal;
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      return cb();
    }
  }
}