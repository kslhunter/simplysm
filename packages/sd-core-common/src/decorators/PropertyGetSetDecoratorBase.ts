const symbol = "sd-type-validate";

export const PropertyGetSetDecoratorBase = function <O extends object, K extends keyof O>(arg: {
  beforeSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => (O[K] | undefined);
  afterSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => void;
  get?: (target: O, propertyName: K, value: O[K]) => void;
}): (target: O, propertyName: K, inputDescriptor?: PropertyDescriptor) => void {
  return function (target: O, propertyName: K, inputDescriptor?: PropertyDescriptor): void {
    const prevDescriptor = inputDescriptor ?? Object.getOwnPropertyDescriptor(target, propertyName);
    const prevGetter = prevDescriptor?.get;
    const prevSetter = prevDescriptor?.set;

    Reflect.defineMetadata(symbol, target[propertyName], target, propertyName as string);

    const getter = function (this: O): O[K] {
      const value = prevGetter !== undefined ?
        prevGetter.bind(this)() :
        Reflect.getMetadata(symbol, this, propertyName as string);

      if (arg.get !== undefined) {
        arg.get(this, propertyName, value);
      }

      return value;
    };

    const setter = function (this: O, value: O[K]): void {
      const prevValue = prevGetter !== undefined ?
        prevGetter.bind(this)() :
        Reflect.getMetadata(symbol, this, propertyName as string);

      let realValue = value;
      if (arg.beforeSet !== undefined) {
        const beforeSetResult = arg.beforeSet(this, propertyName, prevValue, realValue);
        if (beforeSetResult !== undefined) {
          realValue = beforeSetResult;
        }
      }

      if (prevSetter !== undefined) {
        prevSetter.bind(this)(realValue);
      }
      else {
        Reflect.defineMetadata(symbol, realValue, this, propertyName as string);
      }

      if (arg.afterSet !== undefined) {
        arg.afterSet(this, propertyName, prevValue, realValue);
      }
    };

    if (delete target[propertyName]) {
      Object.defineProperty(target, propertyName, {
        get: getter,
        set: setter,
        enumerable: true,
        configurable: true
      });
    }
  };
};
