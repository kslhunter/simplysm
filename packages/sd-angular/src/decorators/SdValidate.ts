// tslint:disable:variable-name

import {Type} from "@angular/core";
import {ArgumentsException} from "../../../sd-core/src/exceptions/ArgumentsException";

export const SdValidate = (params?: PropertyValidator) => (target: any, propertyKey: string) => {
  const getter = function (this: any): any {
    if (!this) {
      return;
    }
    return this[`__sd_${propertyKey}__`];
  };
  const setter = function (this: any, value: any): void {
    if (!this) {
      return;
    }

    let config;
    if (params instanceof Array) {
      config = {type: params};
    }
    else if (params instanceof Type || params === "SdThemeString" || params === "SdSizeString") {
      config = {type: [params]};
    }
    else if (!((params as any).type instanceof Array)) {
      config = {
        ...(params as any),
        type: [(params as any).type]
      };
    }
    else {
      config = params;
    }

    if (value == undefined) {
      if (config.notnull) {
        throw new ArgumentsException({propertyKey, value, notnull: config.notnull});
      }
      this[`__sd_${propertyKey}__`] = value;
      return;
    }

    if (config.type) {
      if (
        !config.type.some((type: any) =>
          type === value.constructor ||
          (type === "SdThemeString" && ["primary", "warning", "danger", "info", "success"].includes(value)) ||
          (type === "SdSizeString" && ["xxs", "xs", "sm", "lg", "xl", "xxl"].includes(value))
        )
      ) {
        throw new ArgumentsException({propertyKey, value, type: config.type});
      }
    }

    if (config.validator) {
      if (!config.validator(value)) {
        throw new ArgumentsException({propertyKey, value, validator: config.validator});
      }
    }

    this[`__sd_${propertyKey}__`] = value;
  };

  setter(target[propertyKey]);

  if (delete target[propertyKey]) {
    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    });
  }
};

export const sdTypeValidate = (value: any, validator: PropertyValidator) => {
  let config;
  if (validator instanceof Array) {
    config = {type: validator};
  }
  else if (validator instanceof Type || validator === "SdThemeString" || validator === "SdSizeString") {
    config = {type: [validator]};
  }
  else if (!((validator as any).type instanceof Array)) {
    config = {
      ...(validator as any),
      type: [(validator as any).type]
    };
  }
  else {
    config = validator;
  }

  if (value == undefined) {
    if (config.notnull) {
      throw new ArgumentsException({value, notnull: config.notnull});
    }
    return;
  }

  if (config.type) {
    if (
      !config.type.some((type: any) =>
        type === value.constructor ||
        (type === "SdThemeString" && ["primary", "warning", "danger", "info", "success"].includes(value)) ||
        (type === "SdSizeString" && ["xxs", "xs", "sm", "lg", "xl", "xxl"].includes(value))
      )
    ) {
      throw new ArgumentsException({value, type: config.type});
    }
  }

  if (config.validator) {
    if (!config.validator(value)) {
      throw new ArgumentsException({value, validator: config.validator});
    }
  }
};

export type PropertyCheckerTypes = Type<any> | "SdThemeString" | "SdSizeString";
export type PropertyValidator = PropertyCheckerTypes | PropertyCheckerTypes[] | {
  type?: PropertyCheckerTypes | PropertyCheckerTypes[];
  notnull?: boolean;

  validator?(value: any): boolean;
};
