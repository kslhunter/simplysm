import { ChangeDetectorRef, inject, NgZone } from "@angular/core";
import { JsonConvert, ObjectUtil } from "@simplysm/sd-core-common";
import { Observable } from "rxjs";

const CDR = Symbol();
const NG_ZONE = Symbol();
const PREPARED = Symbol();
const CONFIG = Symbol();

//-- destroy

const initFn = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.initFnInfos.push({ fn, outside: false });
};
initFn.outside = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.initFnInfos.push({ fn, outside: true });
};

const sdInit = initFn as {
  (comp: any, fn: () => void): void;
  outside: {
    (comp: any, fn: () => void): void;
  };
};

//-- destroy

const destroyFn = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.destroyFnInfos.push({ fn, outside: false });
};
destroyFn.outside = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.destroyFnInfos.push({ fn, outside: true });
};

const sdDestroy = destroyFn as {
  (comp: any, fn: () => void): void;
  outside: {
    (comp: any, fn: () => void): void;
  };
};

//-- viewInit

const viewInitFn = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.viewInitFnInfos.push({ fn, outside: false });
};
viewInitFn.outside = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.viewInitFnInfos.push({ fn, outside: true });
};

const sdViewInit = viewInitFn as {
  (comp: any, fn: () => void): void;
  outside: {
    (comp: any, fn: () => void): void;
  };
};

//-- viewChecked

const viewCheckedFn = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.viewCheckedFnInfos.push({ fn, outside: false });
};
viewCheckedFn.outside = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.viewCheckedFnInfos.push({ fn, outside: true });
};

const sdViewChecked = viewCheckedFn as {
  (comp: any, fn: () => void): void;
  outside: {
    (comp: any, fn: () => void): void;
  };
};

//-- contentInit

const contentInitFn = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.contentInitFnInfos.push({ fn, outside: false });
};
contentInitFn.outside = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.contentInitFnInfos.push({ fn, outside: true });
};

const sdContentInit = contentInitFn as {
  (comp: any, fn: () => void): void;
  outside: {
    (comp: any, fn: () => void): void;
  };
};

//-- contentChecked

const contentCheckedFn = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.contentCheckedFnInfos.push({ fn, outside: false });
};
contentCheckedFn.outside = (comp: any, fn: () => void) => {
  const config = prepare(comp);
  config.contentCheckedFnInfos.push({ fn, outside: true });
};

const sdContentChecked = contentCheckedFn as {
  (comp: any, fn: () => void): void;
  outside: {
    (comp: any, fn: () => void): void;
  };
};

//-- sdCanDeactivate
const sdCanDeactivate = (comp: any, fn: () => boolean) => {
  const config = prepare(comp);
  config.canDeactivateFns.push(fn);
};

//-- check

const checkFn = (comp: any, checkList: TCheckList, fn: () => void) => {
  const config = prepare(comp);
  config.checkFnInfos.push({ checkList, fn, outside: false, getter: false });
};
checkFn.outside = (comp: any, checkList: TCheckList, fn: () => void) => {
  const config = prepare(comp);
  config.checkFnInfos.push({ checkList, fn, outside: false, getter: false });
};

const sdCheck = checkFn as {
  (comp: any, checkList: TCheckList, fn: () => void): void;
  outside: {
    (comp: any, checkList: TCheckList, fn: () => void): void;
  };
};

//-- getter
function sdGetter<F extends (...args: any[]) => any>(comp: any, checkList: TCheckList, fn: F): TSdGetter<F> {
  const config = prepare(comp);
  const checkFnInfo = { checkList, fn, outside: false, getter: true };
  config.checkFnInfos.push(checkFnInfo);

  const getter = (...params: Parameters<F>) => {
    const paramJson = JsonConvert.stringify(params);

    const map = config.resultMap.getOrCreate(checkFnInfo, new Map());
    if (map.has(paramJson)) {
      return map.get(paramJson);
    } else {
      const r = fn(...params);
      map.set(paramJson, r);
      return r;
    }
  };

  getter.checkList = checkList;

  return getter as any;
}

//-- to getter

function toSdGetter<T>(comp: any, ob: Observable<T>, opt?: { initialValue?: T }): TSdGetter<() => T | undefined> {
  let result: T | undefined = opt?.initialValue;

  const getter = sdGetter(comp, [() => [result]], () => result);

  void ob.forEach((r) => {
    result = r;
  });

  return getter;
}

export {
  sdInit,
  sdDestroy,
  sdViewInit,
  sdViewChecked,
  sdContentInit,
  sdContentChecked,
  sdCheck,
  sdGetter,
  toSdGetter,
  sdCanDeactivate,
};

function prepare(comp: any): IInjectConfig {
  if (!Boolean(comp.constructor[PREPARED])) {
    comp.constructor[PREPARED] = true;

    async function run(shelf: any, fnInfos: IFnInfo[]) {
      const cdr = shelf[CDR] as ChangeDetectorRef;
      const ngZone = shelf[NG_ZONE] as NgZone;

      let changed = false;
      for (const fnInfo of fnInfos) {
        if (fnInfo.outside) {
          ngZone.runOutsideAngular(() => {
            requestAnimationFrame(async () => {
              await fnInfo.fn();
            });
          });
        } else {
          await fnInfo.fn();
          changed = true;
        }
      }

      if (changed) {
        cdr.markForCheck();
      }
    }

    const prevOnInit = comp.constructor.prototype.ngOnInit;
    comp.constructor.prototype.ngOnInit = async function (this: any) {
      await prevOnInit?.bind(this);

      const config = this[CONFIG] as IInjectConfig;
      await run(this, config.initFnInfos);
    };

    const prevOnDestroy = comp.constructor.prototype.ngOnDestroy;
    comp.constructor.prototype.ngOnDestroy = async function (this: any) {
      await prevOnDestroy?.bind(this);

      const config = this[CONFIG] as IInjectConfig;
      await run(this, config.destroyFnInfos);
    };

    const prevAfterViewInit = comp.constructor.prototype.ngAfterViewInit;
    comp.constructor.prototype.ngAfterViewInit = async function (this: any) {
      await prevAfterViewInit?.bind(this);

      const config = this[CONFIG] as IInjectConfig;
      await run(this, config.viewInitFnInfos);
    };

    const prevAfterViewChecked = comp.constructor.prototype.ngAfterViewChecked;
    comp.constructor.prototype.ngAfterViewChecked = async function (this: any) {
      await prevAfterViewChecked?.bind(this);

      const config = this[CONFIG] as IInjectConfig;
      await run(this, config.viewCheckedFnInfos);
    };

    const prevAfterContentInit = comp.constructor.prototype.ngAfterContentInit;
    comp.constructor.prototype.ngAfterContentInit = async function (this: any) {
      await prevAfterContentInit?.bind(this);

      const config = this[CONFIG] as IInjectConfig;
      await run(this, config.contentInitFnInfos);
    };

    const prevAfterContentChecked = comp.constructor.prototype.ngAfterContentChecked;
    comp.constructor.prototype.ngAfterContentChecked = async function (this: any) {
      await prevAfterContentChecked?.bind(this);

      const config = this[CONFIG] as IInjectConfig;
      await run(this, config.contentCheckedFnInfos);
    };

    const prevCanDeactivate = comp.constructor.prototype.sdCanDeactivate;
    comp.constructor.prototype.sdCanDeactivate = function (this: any) {
      let result = prevCanDeactivate?.bind(this) ?? true;

      const config = this[CONFIG] as IInjectConfig;
      for (const fn of config.canDeactivateFns) {
        if (!fn()) {
          result = false;
          break;
        }
      }
      return result;
    };

    function getCheckDataFromList(checkList: TCheckList, keyPrefix?: string): TCheckData {
      const result: TCheckData = {};

      for (const checkListItem of checkList) {
        const key = checkListItem.toString();
        const checkOne = checkListItem();
        result[(Boolean(keyPrefix) ? keyPrefix + "." : "") + key] = checkOne;

        if (checkOne[0]?.checkList instanceof Array) {
          const additionalCheckList = checkOne[0].checkList;
          const flatCheckData = getCheckDataFromList(additionalCheckList, key);
          Object.assign(result, flatCheckData);
        }
      }

      return result;
    }

    const prevDoCheck = comp.constructor.prototype.ngDoCheck;
    comp.constructor.prototype.ngDoCheck = async function (this: any) {
      await prevDoCheck?.bind(this);
      // console.log(comp.constructor.name, "doCheck");

      const cdr = this[CDR] as ChangeDetectorRef;
      const ngZone = this[NG_ZONE] as NgZone;
      const config = this[CONFIG] as IInjectConfig;

      let useMarkForCheck = false;
      const changedData: Record<string, any> = {};
      for (const checkFnInfo of config.checkFnInfos) {
        let changed = false;

        const checkData = getCheckDataFromList(checkFnInfo.checkList);
        for (const checkKey of Object.keys(checkData)) {
          if (Object.keys(changedData).includes(checkKey)) {
            changed = true;
            continue;
          }

          const [checkVal, method] = checkData[checkKey];

          // changed데이터가 이미 있는건 어차피 prevData랑 조회안하므로 바로바로 prevData에 값 넣기
          // 바깥쪽에서 넣으려고 하면, 동일 로직이 여러번 돌아버릴 수 있음
          if (method === "all") {
            if (!ObjectUtil.equal(config.prevData[checkKey], checkVal)) {
              config.prevData[checkKey] = changedData[checkKey] = ObjectUtil.clone(checkVal);
              changed = true;
            }
          } else if (method == "one") {
            if (
              !ObjectUtil.equal(config.prevData[checkKey], checkVal, {
                onlyOneDepth: true,
              })
            ) {
              config.prevData[checkKey] = changedData[checkKey] = ObjectUtil.clone(checkVal, {
                onlyOneDepth: true,
              });
              changed = true;
            }
          } else {
            if (config.prevData[checkKey] !== checkVal) {
              config.prevData[checkKey] = changedData[checkKey] = checkVal;
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
      checkFnInfos: [],
      destroyFnInfos: [],
      viewInitFnInfos: [],
      viewCheckedFnInfos: [],
      contentInitFnInfos: [],
      contentCheckedFnInfos: [],
      canDeactivateFns: [],
      prevData: {},
      resultMap: new Map(),
    };
    comp[CONFIG] = config;
  }
  return comp[CONFIG] as IInjectConfig;
}

export type TSdGetter<F extends (...args: any[]) => any> = F & {
  // (...params: Parameters<F>): ReturnType<F>;

  getCheckData(): TCheckList;
};

interface IFnInfo {
  fn: () => void | Promise<void>;
  outside: boolean;
}

interface ICheckFnInfo {
  checkList: TCheckList;
  fn: () => any | Promise<any>;
  outside: boolean;
  getter: boolean;
}

interface IInjectConfig {
  initFnInfos: IFnInfo[];
  checkFnInfos: ICheckFnInfo[];
  destroyFnInfos: IFnInfo[];
  viewInitFnInfos: IFnInfo[];
  viewCheckedFnInfos: IFnInfo[];
  contentInitFnInfos: IFnInfo[];
  contentCheckedFnInfos: IFnInfo[];
  canDeactivateFns: (() => boolean)[];
  prevData: Record<string, any>;
  resultMap: Map<ICheckFnInfo, Map<string, any>>;
}

type TCheckList = (() => [any, ("ref" | "one" | "all")?])[];
type TCheckData = Record<string, [any, ("ref" | "one" | "all")?]>;
