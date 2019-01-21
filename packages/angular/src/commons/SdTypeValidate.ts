import {ValidateDef} from "@simplysm/common";

const symbol = `sd-type-validate`;

// tslint:disable-next-line:variable-name
export function SdTypeValidate(params: ValidateDef): any {
  return (target: any, propertyKey: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    const prevSetter = descriptor ? descriptor.set : undefined;

    const getter = function (this: any): any {
      return core.Reflect.getMetadata(symbol, this, propertyKey);
    };

    const setter = function (this: any, value: any): void {
      const error = Object.validate(value, params);
      if (error) {
        throw new Error(`입력값이 잘못되었습니다: ${JSON.stringify({component: target.constructor.name, propertyKey, ...error})}`);
      }

      if (prevSetter) {
        prevSetter.bind(this)(value);
      }
      else {
        core.Reflect.defineMetadata(symbol, value, this, propertyKey);
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
}
