export class SdCliPerformanceTimer {
  #startingMap = new Map<string, { time: number; cpu: NodeJS.CpuUsage }>();
  #resultMap = new Map<string, { time: number; cpu: number }>();

  constructor(private readonly _name: string) {
  }

  start(name: string) {
    this.#startingMap.set(name, {
      time: new Date().getTime(),
      cpu: process.cpuUsage(),
    });
  }

  end(name: string) {
    const start = this.#startingMap.get(name);
    if (start == null) throw new Error(`No start record for '${name}'`);

    const time = new Date().getTime() - start.time;
    const cpuUsage = process.cpuUsage(start.cpu);
    const cpu = (cpuUsage.user + cpuUsage.system) / 1000; // μs -> ms

    this.#resultMap.set(name, { time, cpu });
    this.#startingMap.delete(name);
  }

  run<R>(name: string, fn: () => R): R {
    const startTime = new Date().getTime();
    const startCpu = process.cpuUsage();

    const finish = (res: R, start: number) => {
      const duration = new Date().getTime() - start;
      const cpu = (process.cpuUsage(startCpu).user + process.cpuUsage(startCpu).system) / 1000;

      const prev = this.#resultMap.get(name);
      this.#resultMap.set(name, {
        time: (prev?.time ?? 0) + duration,
        cpu: (prev?.cpu ?? 0) + cpu,
      });

      return res;
    };

    const res = fn();
    if (res instanceof Promise) {
      return res.then(realRes => finish(realRes, startTime)) as R;
    }

    return finish(res, startTime);
  }

  toString() {
    return `${this._name} 성능 보고서
------------------------------------
${Array.from(this.#resultMap.entries())
      .map(([key, val]) =>
        `${key}: ${val.time.toLocaleString()}ms (${val.cpu.toLocaleString()}ms CPU)`,
      )
      .join("\n")}
------------------------------------`;
  }
}
