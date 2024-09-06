import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  DoCheck,
  EventEmitter,
  inject,
  Injector,
  NgZone,
  OnInit,
  Output,
  ViewContainerRef,
  ViewEncapsulation,
  ViewRef,
} from "@angular/core";
import { JsonConvert, ObjectUtil } from "@simplysm/sd-core-common";

const initFn = (fn: () => void) => {
  const config = prepare();
  config.initFnInfos.push({ fn, outside: false });
};
initFn.outside = (fn: () => void) => {
  const config = prepare();
  config.initFnInfos.push({ fn, outside: true });
};

const checkFn = (checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void) => {
  const config = prepare();
  config.checkFnInfos.push({ checkDataFn, fn, outside: false, getter: false });
};
checkFn.outside = (checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void) => {
  const config = prepare();
  config.checkFnInfos.push({ checkDataFn, fn, outside: false, getter: false });
};

const sdInit = initFn as {
  (fn: () => void): void;
  outside: {
    (fn: () => void): void;
  };
};

const sdDestroy = (fn: () => void) => {
  const config = prepare();
  config.destroyFns.push(fn);
};

const sdCheck = checkFn as {
  (checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void): void;
  outside: {
    (checkDataFn: () => TCheckData | Promise<TCheckData>, fn: () => void): void;
  };
};

function sdGetter<F extends (...args: any[]) => any>(fn: F): TSdGetter<F>;
function sdGetter<F extends (...args: any[]) => any>(
  checkDataFn: () => TCheckData | Promise<TCheckData>,
  fn: F,
): TSdGetter<F>;
function sdGetter<F extends (...args: any[]) => any>(
  arg1: F | (() => TCheckData | Promise<TCheckData>),
  arg2?: F,
): TSdGetter<F> {
  const checkDataFn = arg2 ? arg1 : () => ({});
  const fn = arg2 ? arg2 : arg1;

  const config = prepare();
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

export { sdInit, sdCheck, sdDestroy, sdGetter };

function prepare(): IInjectConfig {
  const cdr = inject(ChangeDetectorRef);
  const ngZone = inject(NgZone);
  const vcr = inject(ViewContainerRef);
  const injector = inject(Injector);

  if (injector["__sd-checker.config__"] == null) {
    const config: IInjectConfig = (injector["__sd-checker.config__"] = {
      initFnInfos: [],
      destroyFns: [],
      checkFnInfos: [],
      prevData: {},
      resultMap: new Map(),
      compRef: vcr.createComponent(ChangeDetectionComponent, {
        injector: inject(Injector),
      }),
    });
    config.compRef.instance.init.subscribe(async () => {
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
    });
    (cdr as ViewRef).onDestroy(async () => {
      for (const _destroyFn of config.destroyFns) {
        await _destroyFn();
      }
    });
    config.compRef.instance.check.subscribe(async () => {
      let changed = false;
      for (const checkFnInfo of config.checkFnInfos) {
        const changedData: Record<string, any> = {};

        const checkData = await checkFnInfo.checkDataFn();
        for (const checkKey of Object.keys(checkData)) {
          if (Object.keys(changedData).includes(checkKey)) {
            continue;
          }

          const [checkVal, method] = checkData[checkKey];

          if (method === "all") {
            if (!ObjectUtil.equal(config.prevData[checkKey], checkVal)) {
              changedData[checkKey] = ObjectUtil.clone(checkVal);
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
            }
          } else {
            if (config.prevData[checkKey] !== checkVal) {
              changedData[checkKey] = checkVal;
            }
          }
        }

        if (Object.keys(changedData).length > 0) {
          if (!checkFnInfo.getter) {
            if (checkFnInfo.outside) {
              ngZone.runOutsideAngular(() => {
                requestAnimationFrame(async () => {
                  await checkFnInfo.fn();
                });
              });
            } else {
              await checkFnInfo.fn();
              changed = true;
            }
          } else {
            config.resultMap.delete(checkFnInfo);
            changed = true;
          }

          Object.assign(config.prevData, changedData);
        }
      }

      if (changed) {
        cdr.markForCheck();
      }
    });
  }

  return injector["__sd-checker.config__"] as IInjectConfig;
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
  compRef: ComponentRef<ChangeDetectionComponent>;
}

type TCheckData = Record<string, [any, ("ref" | "one" | "all")?]>;

@Component({
  selector: "__sd-change-detection__",
  changeDetection: ChangeDetectionStrategy.Default,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ``,
})
class ChangeDetectionComponent implements OnInit, DoCheck {
  @Output() init = new EventEmitter();
  @Output() check = new EventEmitter();

  ngOnInit() {
    this.init.emit();
  }

  ngDoCheck() {
    this.check.emit();
  }
}
