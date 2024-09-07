import { ChangeDetectorRef, inject, NgZone } from "@angular/core";
import { JsonConvert, ObjectUtil, Uuid } from "@simplysm/sd-core-common";
import { Observable } from "rxjs";

const CDR = Symbol();
const NG_ZONE = Symbol();
const PREPARED = Symbol();
const CONFIG = Symbol();

const initFn = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.initFnInfos.push({ fn, outside: false });
};
initFn.outside = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.initFnInfos.push({ fn, outside: true });
};

const checkFn = (comp: any, checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void) => {
  const config = prepare(comp);
  config.checkFnInfos.push({ checkDataFn, fn, outside: false, getter: false });
};
checkFn.outside = (comp: any, checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void) => {
  const config = prepare(comp);
  config.checkFnInfos.push({ checkDataFn, fn, outside: false, getter: false });
};

const sdInit = initFn as {
  (comp: any, fn: () => void): void;
  outside: {
    (comp: any, fn: () => void): void;
  };
};

const sdDestroy = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.destroyFns.push(fn);
};

const sdCheck = checkFn as {
  (comp: any, checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void): void;
  outside: {
    (comp: any, checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void): void;
  };
};

// function sdGetter<F extends (...args: any[]) => any>(comp: any, fn: F): TSdGetter<F>;
function sdGetter<F extends (...args: any[]) => any>(
  comp: any,
  checkDataFn: () => TCheckData | Promise<TCheckData>,
  fn: F,
): TSdGetter<F> /*;
function sdGetter<F extends (...args: any[]) => any>(
  comp: any,
  arg1: F | (() => TCheckData | Promise<TCheckData>),
  arg2?: F,
): TSdGetter<F>*/ {
  // const checkDataFn = arg2 ? arg1 : () => ({});
  // const fn = arg2 ? arg2 : arg1;

  const config = prepare(comp);
  const checkFnInfo = { checkDataFn, fn, outside: false, getter: true };
  config.checkFnInfos.push(checkFnInfo);

  const getter = (...params: Parameters<F>) => {
    const paramJson = JsonConvert.stringify(params);

    const map = config.resultMap.getOrCreate(checkFnInfo, new Map());
    if (map.has(paramJson)) {
      return map.get(paramJson);
    } else {
      const r = fn(params);
      map.set(paramJson, r);
      return r;
    }
  };

  getter.getCheckDataAsync = async (fnName: string) => {
    const result: TCheckData = {
      [fnName]: [getter],
    };

    const checkData = await checkDataFn();
    for (const key of Object.keys(checkData)) {
      result[`${fnName}.${key}`] = checkData[key];
    }
    return result;
  };

  return getter as any;
}

function toSdGetter<T>(comp: any, ob: Observable<T>, opt?: { initialValue?: T }): TSdGetter<() => T | undefined> {
  let result: T | undefined = opt?.initialValue;

  const getter = sdGetter(
    comp,
    () => ({
      [Uuid.new().toString()]: [result],
    }),
    () => result,
  );

  void ob.forEach((r) => {
    result = r;
  });

  return getter;
}

export { sdInit, sdCheck, sdDestroy, sdGetter, toSdGetter };

function prepare(comp: any): IInjectConfig {
  if (!Boolean(comp.constructor[PREPARED])) {
    comp.constructor[PREPARED] = true;

    const prevOnInit = comp.constructor.prototype.ngOnInit;
    comp.constructor.prototype.ngOnInit = async function (this: any) {
      await prevOnInit?.();

      const cdr = this[CDR] as ChangeDetectorRef;
      const ngZone = this[NG_ZONE] as NgZone;
      const config = this[CONFIG] as IInjectConfig;

      let changed = false;
      for (const initFnInfo of config.initFnInfos) {
        if (initFnInfo.outside) {
          ngZone.runOutsideAngular(() => {
            requestAnimationFrame(async () => {
              await initFnInfo.fn();
            });
          });
        } else {
          await initFnInfo.fn();
          changed = true;
        }
      }

      if (changed) {
        cdr.markForCheck();
      }
    };

    const prevOnDestroy = comp.constructor.prototype.ngOnDestroy;
    comp.constructor.prototype.ngOnDestroy = async function (this: any) {
      await prevOnDestroy?.();

      const cdr = this[CDR] as ChangeDetectorRef;
      const config = this[CONFIG] as IInjectConfig;

      if (config.destroyFns.length > 0) {
        for (const destroyFn of config.destroyFns) {
          await destroyFn();
        }
        cdr.markForCheck();
      }
    };

    const prevDoCheck = comp.constructor.prototype.ngDoCheck;
    comp.constructor.prototype.ngDoCheck = async function (this: any) {
      await prevDoCheck?.();

      const cdr = this[CDR] as ChangeDetectorRef;
      const ngZone = this[NG_ZONE] as NgZone;
      const config = this[CONFIG] as IInjectConfig;

      let useMarkForCheck = false;
      const changedData: Record<string, any> = {};
      for (const checkFnInfo of config.checkFnInfos) {
        let changed = false;

        const checkData = await checkFnInfo.checkDataFn();
        for (const checkKey of Object.keys(checkData)) {
          if (Object.keys(changedData).includes(checkKey)) {
            changed = true;
            continue;
          }

          const [checkVal, method] = checkData[checkKey];

          if (method === "all") {
            if (!ObjectUtil.equal(config.prevData[checkKey], checkVal)) {
              changedData[checkKey] = ObjectUtil.clone(checkVal);
              changed = true;
            }
          } else if (method == "one") {
            if (
              !ObjectUtil.equal(config.prevData[checkKey], checkVal, {
                onlyOneDepth: true,
              })
            ) {
              changedData[checkKey] = ObjectUtil.clone(checkVal, {
                onlyOneDepth: true,
              });
              changed = true;
            }
          } else {
            if (config.prevData[checkKey] !== checkVal) {
              changedData[checkKey] = checkVal;
              changed = true;
            }
          }
        }

        if (changed) {
          if (!checkFnInfo.getter) {
            if (checkFnInfo.outside) {
              ngZone.runOutsideAngular(() => {
                requestAnimationFrame(async () => {
                  await checkFnInfo.fn();
                });
              });
            } else {
              await checkFnInfo.fn();
              useMarkForCheck = true;
            }
          } else {
            config.resultMap.delete(checkFnInfo);
            useMarkForCheck = true;
          }
        }
      }

      Object.assign(config.prevData, changedData);

      if (useMarkForCheck) {
        cdr.markForCheck();
      }
    };
  }

  comp[CDR] = inject(ChangeDetectorRef);
  comp[NG_ZONE] = inject(NgZone);

  if (comp[CONFIG] == null) {
    const config: IInjectConfig = {
      initFnInfos: [],
      destroyFns: [],
      checkFnInfos: [],
      prevData: {},
      resultMap: new Map(),
    };
    comp[CONFIG] = config;
  }
  return comp[CONFIG] as IInjectConfig;
}

export type TSdGetter<F extends (...args: any[]) => any> = F & {
  // (...params: Parameters<F>): ReturnType<F>;

  getCheckDataAsync(fnName: string): Promise<TCheckData>;
};

interface ICheckFnInfo {
  checkDataFn: () => TCheckData | Promise<TCheckData>;
  fn: () => any | Promise<any>;
  outside: boolean;
  getter: boolean;
}

interface IInjectConfig {
  initFnInfos: {
    fn: () => void | Promise<void>;
    outside: boolean;
  }[];
  checkFnInfos: ICheckFnInfo[];
  destroyFns: (() => void | Promise<void>)[];
  prevData: Record<string, any>;
  resultMap: Map<ICheckFnInfo, Map<string, any>>;
}

type TCheckData = Record<string, [any, ("ref" | "one" | "all")?]>;
