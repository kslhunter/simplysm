export class SdCliPerformanceTimer {
  #startingMap = new Map<string, number>();
  #resultMap = new Map<string, number>();

  constructor(private _name: string) {}

  start(name: string) {
    this.#startingMap.set(name, new Date().getTime());
  }

  end(name: string) {
    const val = this.#startingMap.get(name);
    if (val == null) throw new Error();
    this.#resultMap.set(name, new Date().getTime() - val);
    this.#startingMap.delete(name);
  }

  run<R>(name: string, fn: () => R): R {
    const startTime = new Date().getTime();
    let res = fn();
    if (res instanceof Promise) {
      return res.then((realRes) => {
        const duration = new Date().getTime() - startTime;
        this.#resultMap.update(name, (v) => (v ?? 0) + duration);
        return realRes;
      }) as R;
    }

    const duration = new Date().getTime() - startTime;
    this.#resultMap.update(name, (v) => (v ?? 0) + duration);
    return res;
  }

  toString() {
    return `${this._name} performance report
------------------------------------
${Array.from(this.#resultMap.entries())
  .map((en) => `${en[0]}: ${en[1].toLocaleString()}ms`)
  .join("\n")}
------------------------------------`;
  }
}
