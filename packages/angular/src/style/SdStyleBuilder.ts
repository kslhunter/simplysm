export class SdStyleBuilder {
  public constructor(private _css: string = "") {
  }

  public select(selectors: string[], cb: ((builder: SdStyleBuilder) => SdStyleBuilder)): SdStyleBuilder {
    // const selectors: string[] = selectorOrSelectors instanceof Array ? selectorOrSelectors : [selectorOrSelectors];
    // const subResult = typeof cb === "function" ? cb(new SdStyleBuilder()).css : new SdStyleBuilder().style(cb).css;
    const subResult = cb(new SdStyleBuilder()).css;

    const result = new SdStyleBuilder(this._css);
    result._css += `${selectors.join(", ")} {\n`;
    result._css += "\t" + subResult.replace(/\n/g, "\n\t") + "\n";
    result._css += `}\n`;
    return result;
  }

  public style(obj: { [key: string]: string }): SdStyleBuilder {
    const result = new SdStyleBuilder(this._css);
    result._css += Object.keys(obj).map(key => {
      return `${key}: ${obj[key]};\n`;
    }).join("");
    return result;
  }

  public keyFrame(name: string, obj: { [key: string]: { [key2: string]: string } }): SdStyleBuilder {
    const result = new SdStyleBuilder(this._css);
    result._css += `@keyframes ${name} {\n`;
    for (const key of Object.keys(obj)) {
      result._css += `\t${key} {\n`;
      for (const key1 of Object.keys(obj[key])) {
        result._css += `\t\t${key1}: ${obj[key][key1]};\n`;
      }
      result._css += "\t}\n";
    }
    result._css += "}\n";
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

  public join(s: SdStyleBuilder): SdStyleBuilder {
    const result = new SdStyleBuilder(this._css);
    result._css += s.css;
    return result;
  }

  public get css(): string {
    return this._css;
  }
}
