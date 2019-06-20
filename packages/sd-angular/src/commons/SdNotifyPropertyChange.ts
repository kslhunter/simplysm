const symbol = `sd-notify-property-change`;

export function SdNotifyPropertyChange(): any {
  // noinspection UnnecessaryLocalVariableJS
  const result: any = function (target: ISdNotifyPropertyChange, propertyKey: string, inputDescriptor: PropertyDescriptor | undefined): void {
    const descriptor = inputDescriptor || Object.getOwnPropertyDescriptor(target, propertyKey);
    const prevSetter = descriptor ? descriptor.set : undefined;

    const getter = function (this: any): any {
      return Reflect.getMetadata(symbol, this, propertyKey);
    };

    const setter = function (this: any, value: any): void {
      const oldValue = this[propertyKey];

      if (prevSetter) {
        prevSetter.bind(this)(value);
      }
      else {
        Reflect.defineMetadata(symbol, value, this, propertyKey);
      }

      this.sdOnPropertyChange(propertyKey, oldValue, value);
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

export interface ISdNotifyPropertyChange {
  sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void;
}
