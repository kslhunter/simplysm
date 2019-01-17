import {ISdStyleObject} from "./commons";

export class SdStyleBuilder {
  public constructor(private _css: string = "") {
  }

  public select(selectors: string[], cb: ((builder: SdStyleBuilder) => SdStyleBuilder)): SdStyleBuilder {
    const childCss = cb(new SdStyleBuilder()).css;

    const result = new SdStyleBuilder(this._css);
    result._css += `${selectors.join(",")}{${childCss}}`;
    return result;
  }

  public style(obj: ISdStyleObject): SdStyleBuilder {
    const result = new SdStyleBuilder(this._css);
    result._css += Object.keys(obj)
      .map(key => `${key}:${obj[key]};`)
      .join("");
    return result;
  }

  public keyFrame(name: string, obj: { [key: string]: ISdStyleObject }): SdStyleBuilder {
    const result = new SdStyleBuilder(this._css);
    result._css += `@keyframes ${name}{`;
    for (const key of Object.keys(obj)) {
      result._css += `${key}{`;
      for (const key1 of Object.keys(obj[key])) {
        result._css += `${key1}:${obj[key][key1]};`;
      }
      result._css += "}";
    }
    result._css += "}";
    return result;
  }

  public forEach<T>(arr: T[], cb: (o: SdStyleBuilder, item: T) => SdStyleBuilder): SdStyleBuilder {
    let result = new SdStyleBuilder(this._css);
    for (const item of arr) {
      result = cb(result, item);
    }
    return result;
  }

  public if(b: boolean, cb: (o: SdStyleBuilder) => SdStyleBuilder): SdStyleBuilder {
    let result = new SdStyleBuilder(this._css);
    if (b) {
      result = cb(result);
    }
    return result;
  }

  public get css(): string {
    return this._css;
  }
}
