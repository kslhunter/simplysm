import {SimpleChanges, Type} from "@angular/core";
import {Routes} from "@angular/router";
import {ArgumentsException} from "../../../sd-core/src/exceptions/ArgumentsException";
import {Logger} from "../../../sd-core/src/utils/Logger";
import {Wait} from "../../../sd-core/src/utils/Wait";
import {TypeValidateTypes} from "./types";

export class SimgularHelpers {
  private static _isDetectElementChangeEnable = true;

  public static getChromeVersion(): number | undefined {
    const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2], 10) : undefined;
  }

  public static detectElementChange(element: Element, callback: () => void, options?: {
    resize?: boolean;
    childList?: boolean;
  }): void {
    const logger = new Logger("@simplism/sd-angular", "SimgularHelpers");

    const currOptions = {
      resize: true,
      childList: true,
      ...options
    };

    let nowWait = false;
    const runCallbackAsync = async () => {
      if (nowWait) {
        return;
      }
      nowWait = true;

      await Wait.true(() => this._isDetectElementChangeEnable);

      callback();
      nowWait = false;
    };

    if (currOptions.childList) {
      new MutationObserver(async mutations => {
        if (mutations.every(item => item.target.nodeName === "#comment")) {
          return;
        }
        logger.log("detect: mutate: ", element);
        await runCallbackAsync();
      }).observe(element, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    if (currOptions.resize) {
      const chromeVersion = SimgularHelpers.getChromeVersion();
      if (chromeVersion! < 64) {
        logger.warn(`64버전 이하의 크롬 브라우저에서는 컨트롤의 위치가 깨질 수 있습니다. [현재버전:${chromeVersion}]`);
        $(window).on("resize", async () => {
          logger.log("detect: resize: ", element);
          await runCallbackAsync();
        });
      }
      else {
        new window["ResizeObserver"](async () => {
          logger.log("detect: resize: ", element);
          await runCallbackAsync();
        }).observe(element);
      }
    }
  }

  public static stopDetectElementChanges(): void {
    this._isDetectElementChangeEnable = false;
  }

  public static rerunDetectElementChanges(): void {
    this._isDetectElementChangeEnable = true;
  }

  public static getRouteDeclarations(routes: Routes): Type<any>[] {
    let result: Type<any>[] = [];
    for (const route of routes) {
      if (route.component) {
        result.push(route.component);
      }

      if (route.children) {
        result = result.concat(this.getRouteDeclarations(route.children));
      }
    }
    return result;
  }

  public static typeValidate(changes: SimpleChanges, checkers: {
    [key: string]: TypeValidateTypes | TypeValidateTypes[] | {
      type?: TypeValidateTypes | TypeValidateTypes[];
      required?: boolean;
      validator?(value: any): boolean;
    };
  }): void {
    for (const prop of Object.keys(checkers)) {
      if (!changes[prop]) {
        continue;
      }

      const check = (value1: any, opts: { type?: TypeValidateTypes[]; required?: boolean; validator?(value: any): boolean }) => {
        if (value1 == undefined) {
          if (opts.required) {
            throw new ArgumentsException({value: value1, required: opts.required});
          }
          return;
        }

        if (opts.type) {
          if (
            !opts.type.some(type =>
              type === value1.constructor ||
              (type === "SdThemeString" && ["primary", "warning", "danger", "info", "success"].includes(value1)) ||
              (type === "SdSizeString" && ["xxs", "xs", "sm", "lg", "xl", "xxl"].includes(value1))
            )
          ) {
            throw new ArgumentsException({prop, value: value1, type: opts.type});
          }
        }

        if (opts.validator) {
          if (!opts.validator(value1)) {
            throw new ArgumentsException({prop, value: value1, validator: opts.validator.bind(opts)});
          }
        }
      };

      const value = changes[prop].currentValue;

      if (checkers[prop] instanceof Array) {
        check(value, {
          type: checkers[prop]
        } as any);
      }
      else if (checkers[prop] instanceof Type || checkers[prop] === "SdThemeString" || checkers[prop] === "SdSizeString") {
        check(value, {
          type: [checkers[prop]]
        } as any);
      }
      else if (!((checkers[prop] as any).type instanceof Array)) {
        check(value, {
          ...(checkers[prop] as any),
          type: [(checkers[prop] as any).type]
        } as any);
      }
      else {
        check(value, checkers[prop] as any);
      }
    }
  }
}
