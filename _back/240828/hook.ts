import {ObjectUtil} from "@simplysm/sd-core-common";
import {ChangeDetectorRef, inject, NgZone} from "@angular/core";

export function hook(comp: any): ISdHook {
  const cdr = inject(ChangeDetectorRef);
  const ngZone = inject(NgZone);

  const initFnInfos: {
    fn: () => void | Promise<void>;
    outside: boolean;
  }[] = [];
  const checkFnInfos: {
    checkData: TCheckData;
    fn: () => void | Promise<void>;
    outside: boolean;
  }[] = [];

  const prevData: Record<string, any> = {};

  const prevNgOnInitFn = comp.ngOnInit;
  comp.ngOnInit = async () => {
    let hasPromise = false;

    for (const initFnInfo of initFnInfos) {
      if (initFnInfo.outside) {
        ngZone.runOutsideAngular(() => {
          requestAnimationFrame(async () => {
            await initFnInfo.fn();
          });
        });
      }
      else {
        const promiseOrVoid = initFnInfo.fn();
        if (promiseOrVoid instanceof Promise) {
          await promiseOrVoid;
          hasPromise = true;
        }
      }
    }
    if (hasPromise) {
      cdr.markForCheck();
    }

    await prevNgOnInitFn?.();
  };

  const prevNgDoCheckFn = comp.ngDoCheck;
  comp.ngDoCheck = async function ngDoCheck() {
    const changedData: Record<string, any> = {};
    let hasPromise = false;

    for (const checkFnInfo of checkFnInfos) {
      for (const checkKey of Object.keys(checkFnInfo.checkData)) {
        if (Object.keys(changedData).includes(checkKey)) {
          continue;
        }

        const [checkVal, method] = checkFnInfo.checkData[checkKey];

        if (method === "all") {
          if (!ObjectUtil.equal(prevData[checkKey], checkVal)) {
            changedData[checkKey] = ObjectUtil.clone(checkVal);
          }
        }
        else if (method == "one") {
          if (!ObjectUtil.equal(prevData[checkKey], checkVal, {onlyOneDepth: true})) {
            changedData[checkKey] = ObjectUtil.clone(checkVal, {onlyOneDepth: true});
          }
        }
        else {
          if (prevData[checkKey] !== checkVal) {
            changedData[checkKey] = checkVal;
          }
        }
      }

      if (Object.keys(changedData).length > 0) {
        if (checkFnInfo.outside) {
          ngZone.runOutsideAngular(() => {
            requestAnimationFrame(async () => {
              await checkFnInfo.fn();
            });
          });
        }
        else {
          const promiseOrVoid = checkFnInfo.fn();
          if (promiseOrVoid instanceof Promise) {
            await promiseOrVoid;
            hasPromise = true;
          }
        }

        Object.assign(prevData, changedData);
      }
    }

    if (hasPromise) {
      cdr.markForCheck();
    }

    await prevNgDoCheckFn?.();
  };

  const init = (fn: () => void) => {
    initFnInfos.push({fn, outside: false});
  };
  init.outside = (fn: () => void) => {
    initFnInfos.push({fn, outside: true});
  };
  const check = (checkData: TCheckData, fn: () => void) => {
    checkFnInfos.push({checkData, fn, outside: false});
  };
  check.outside = (checkData: TCheckData, fn: () => void) => {
    checkFnInfos.push({checkData, fn, outside: false});
  };

  return {init, check};
}

interface ISdHook {
  init: {
    (fn: () => void): void;
    outside: {
      (fn: () => void): void;
    }
  },
  check: {
    (checkData: TCheckData, fn: () => void): void;
    outside: {
      (checkData: TCheckData, fn: () => void): void;
    }
  }
}


type TCheckData = Record<string, [any, ("ref" | "one" | "all")?]>;