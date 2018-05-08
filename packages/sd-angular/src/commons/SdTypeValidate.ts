import {Type} from "@angular/core";
import {ArgumentsException} from "@simplism/sd-core";

export const SdTypeValidate = (params?: SdTypeValidateType | SdTypeValidateType[] | { // tslint:disable-line:variable-name
  type?: SdTypeValidateType | SdTypeValidateType[];
  notnull?: boolean;

  validator?(value: any): boolean;
}) => (target: any, propertyKey: string, descriptor?: PropertyDescriptor) => {
  const prevSetter = descriptor && descriptor.set;

  const getter = function (this: any): any {
    return this[`__sd_${propertyKey}__`];
  };

  const setter = function (this: any, value: any): void {
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

    if (prevSetter) {
      prevSetter.bind(this)(value);
    }
    else {
      this[`__sd_${propertyKey}__`] = value;
    }
  };

  if (descriptor) {
    descriptor.set = setter;
  }
  else {
    if (delete target[propertyKey]) {
      Object.defineProperty(target, propertyKey, {
        get: getter,
        set: setter,
        enumerable: true,
        configurable: true
      });
    }
  }
};

export type SdTypeValidateType = Type<any> | "SdThemeString" | "SdSizeString";