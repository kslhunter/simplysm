export function SdNotifyPropertyChange(): any {
  return (target: ISdNotifyPropertyChange, propertyKey: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    const prevSetter = descriptor && descriptor.set;

    const symbol = `sd-notify-property-change`;

    const getter = function (this: any): any {
      return core.Reflect.getMetadata(symbol, this, propertyKey);
    };

    const setter = function (this: any, value: any): void {
      const oldValue = this[propertyKey];

      if (prevSetter) {
        prevSetter.bind(this)(value);
      }
      else {
        core.Reflect.defineMetadata(symbol, value, this, propertyKey);
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
}

export interface ISdNotifyPropertyChange {
  sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void;
}
