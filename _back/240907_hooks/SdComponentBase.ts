import {
  AfterContentChecked,
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectorRef,
  Directive,
  DoCheck,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { sdGetter, TSdGetter } from "./hooks";
import { JsonConvert, ObjectUtil, Uuid } from "@simplysm/sd-core-common";
import { Observable } from "rxjs";

@Directive()
export class SdComponentBase
  implements OnInit, OnDestroy, AfterContentInit, AfterContentChecked, AfterViewInit, AfterViewChecked, DoCheck
{
  #ngZone = inject(NgZone);
  #cdr = inject(ChangeDetectorRef);

  #initFnInfos: IFnInfo[] = [];
  #checkFnInfos: ICheckFnInfo[] = [];
  #destroyFnInfos: IFnInfo[] = [];
  #viewInitFnInfos: IFnInfo[] = [];
  #viewCheckedFnInfos: IFnInfo[] = [];
  #contentInitFnInfos: IFnInfo[] = [];
  #contentCheckedFnInfos: IFnInfo[] = [];
  #prevData: Record<string, any> = {};
  #resultMap = new Map<ICheckFnInfo, Map<string, any>>();

  onCheck(checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void) {
    this.#checkFnInfos.push({ checkDataFn, fn, outside: false, getter: false });
  }

  onCheckOutside(checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void) {
    this.#checkFnInfos.push({ checkDataFn, fn, outside: true, getter: false });
  }

  getter<F extends (...args: any[]) => any>(fn: F): TSdGetter<F>;
  getter<F extends (...args: any[]) => any>(checkDataFn: () => TCheckData | Promise<TCheckData>, fn: F): TSdGetter<F>;
  getter<F extends (...args: any[]) => any>(
    arg1: F | (() => TCheckData | Promise<TCheckData>),
    arg2?: F,
  ): TSdGetter<F> {
    const checkDataFn = arg2 ? arg1 : () => ({});
    const fn = arg2 ? arg2 : arg1;

    const checkFnInfo = { checkDataFn, fn, outside: false, getter: true };
    this.#checkFnInfos.push(checkFnInfo);

    const getter = (...params: Parameters<F>) => {
      const paramJson = JsonConvert.stringify(params);

      const map = this.#resultMap.getOrCreate(checkFnInfo, new Map());
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

  toGetter<T>(ob: Observable<T>): TSdGetter<() => T | undefined>;
  toGetter<T>(ob: Observable<T>, opt: { initialValue: T }): TSdGetter<() => T>;
  toGetter<T>(ob: Observable<T>, opt?: { initialValue?: T }): TSdGetter<() => T | undefined> {
    let result: T | undefined = opt?.initialValue;

    const getter = sdGetter(
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

  async ngDoCheck() {
    let changed = false;
    for (const checkFnInfo of this.#checkFnInfos) {
      const changedData: Record<string, any> = {};

      const checkData = await checkFnInfo.checkDataFn();
      for (const checkKey of Object.keys(checkData)) {
        if (Object.keys(changedData).includes(checkKey)) {
          continue;
        }

        const [checkVal, method] = checkData[checkKey];

        if (method === "all") {
          if (!ObjectUtil.equal(this.#prevData[checkKey], checkVal)) {
            changedData[checkKey] = ObjectUtil.clone(checkVal);
          }
        } else if (method == "one") {
          if (
            !ObjectUtil.equal(this.#prevData[checkKey], checkVal, {
              onlyOneDepth: true,
            })
          ) {
            changedData[checkKey] = ObjectUtil.clone(checkVal, {
              onlyOneDepth: true,
            });
          }
        } else {
          if (this.#prevData[checkKey] !== checkVal) {
            changedData[checkKey] = checkVal;
          }
        }
      }

      if (Object.keys(changedData).length > 0) {
        if (!checkFnInfo.getter) {
          if (checkFnInfo.outside) {
            this.#ngZone.runOutsideAngular(() => {
              requestAnimationFrame(async () => {
                await checkFnInfo.fn();
              });
            });
          } else {
            await checkFnInfo.fn();
            changed = true;
          }
        } else {
          this.#resultMap.delete(checkFnInfo);
          changed = true;
        }

        Object.assign(this.#prevData, changedData);
      }
    }

    if (changed) {
      this.#cdr.markForCheck();
    }
  }

  onInit(fn: () => void) {
    this.#initFnInfos.push({ fn, outside: false });
  }

  onInitOutside(fn: () => void) {
    this.#initFnInfos.push({ fn, outside: true });
  }

  onDestroy(fn: () => void) {
    this.#destroyFnInfos.push({ fn, outside: false });
  }

  onDestroyOutside(fn: () => void) {
    this.#destroyFnInfos.push({ fn, outside: true });
  }

  onViewInit(fn: () => void) {
    this.#viewInitFnInfos.push({ fn, outside: false });
  }

  onViewInitOutside(fn: () => void) {
    this.#viewInitFnInfos.push({ fn, outside: true });
  }

  onViewChecked(fn: () => void) {
    this.#viewCheckedFnInfos.push({ fn, outside: false });
  }

  onViewCheckedOutside(fn: () => void) {
    this.#viewCheckedFnInfos.push({ fn, outside: true });
  }

  onContentInit(fn: () => void) {
    this.#contentInitFnInfos.push({ fn, outside: false });
  }

  onContentInitOutside(fn: () => void) {
    this.#contentInitFnInfos.push({ fn, outside: true });
  }

  onContentChecked(fn: () => void) {
    this.#contentCheckedFnInfos.push({ fn, outside: false });
  }

  onContentCheckedOutside(fn: () => void) {
    this.#contentCheckedFnInfos.push({ fn, outside: true });
  }

  async ngOnInit() {
    await this.#runFnInfos(this.#initFnInfos);
  }

  async ngOnDestroy() {
    await this.#runFnInfos(this.#destroyFnInfos);
  }

  async ngAfterViewInit() {
    await this.#runFnInfos(this.#viewInitFnInfos);
  }

  async ngAfterViewChecked() {
    await this.#runFnInfos(this.#viewCheckedFnInfos);
  }

  async ngAfterContentInit() {
    await this.#runFnInfos(this.#contentInitFnInfos);
  }

  async ngAfterContentChecked() {
    await this.#runFnInfos(this.#contentCheckedFnInfos);
  }

  async #runFnInfos(fnInfos: IFnInfo[]) {
    let changed = false;
    for (const fnInfo of fnInfos) {
      if (fnInfo.outside) {
        this.#ngZone.runOutsideAngular(() => {
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
      this.#cdr.markForCheck();
    }
  }
}

type TCheckData = Record<string, [any, ("ref" | "one" | "all")?]>;

interface ICheckFnInfo {
  checkDataFn: () => TCheckData | Promise<TCheckData>;
  fn: () => any | Promise<any>;
  outside: boolean;
  getter: boolean;
}

interface IFnInfo {
  fn: () => void | Promise<void>;
  outside: boolean;
}
