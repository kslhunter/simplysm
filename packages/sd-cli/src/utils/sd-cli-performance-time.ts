export class SdCliPerformanceTimer {
  private _startingMap = new Map<string, number>();
  private _resultMap = new Map<string, number>();

  constructor(private _name: string) {}

  start(name: string) {
    this._startingMap.set(name, new Date().getTime());
  }

  end(name: string) {
    const val = this._startingMap.get(name);
    if (val == null) throw new Error();
    this._resultMap.set(name, new Date().getTime() - val);
    this._startingMap.delete(name);
  }

  run<R>(name: string, fn: () => R): R {
    const startTime = new Date().getTime();
    let res = fn();
    if (res instanceof Promise) {
      return res.then((realRes) => {
        const duration = new Date().getTime() - startTime;
        this._resultMap.update(name, (v) => (v ?? 0) + duration);
        return realRes;
      }) as R;
    }

    const duration = new Date().getTime() - startTime;
    this._resultMap.update(name, (v) => (v ?? 0) + duration);
    return res;
  }

  toString() {
    return `${this._name} 성능 보고서
------------------------------------
${Array.from(this._resultMap.entries())
  .map((en) => `${en[0]}: ${en[1].toLocaleString()}ms`)
  .join("\n")}
------------------------------------`;
  }
}
