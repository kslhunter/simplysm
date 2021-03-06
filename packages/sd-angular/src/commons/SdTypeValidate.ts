import {ValidateDef} from "@simplysm/sd-core";

const symbol = `sd-type-validate`;

export function SdTypeValidate(params: ValidateDef): any {
  // noinspection UnnecessaryLocalVariableJS
  const result: any = function (target: any, propertyKey: string, inputDescriptor: PropertyDescriptor | undefined): void {
    const descriptor = inputDescriptor || Object.getOwnPropertyDescriptor(target, propertyKey);
    const prevSetter = descriptor ? descriptor.set : undefined;

    const getter = function (this: any): any {
      return Reflect.getMetadata(symbol, this, propertyKey);
    };

    const setter = function (this: any, value: any): void {
      let realValue = value;
      if (
        (
          params === Boolean ||
          (params instanceof Array && params.includes(Boolean)) ||
          params["type"] === Boolean ||
          (params["type"] instanceof Array && params["type"].includes(Boolean))
        ) &&
        realValue === ""
      ) {
        realValue = true;
      }

      const error = Object.validate(realValue, params);
      if (error) {
        throw new Error(`입력값이 잘못되었습니다: ${JSON.stringify({component: target.constructor.name, propertyKey, ...error})}`);
      }

      if (prevSetter) {
        prevSetter.bind(this)(realValue);
      }
      else {
        Reflect.defineMetadata(symbol, realValue, this, propertyKey);
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
  return result;
}
