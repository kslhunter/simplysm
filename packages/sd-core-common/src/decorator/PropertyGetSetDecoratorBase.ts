export function PropertyGetSetDecoratorBase<O, K extends keyof O>(arg: {
  beforeSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => ((() => O[K]) | void);
  afterSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => void;
  get?: (target: O, propertyName: K, value: O[K]) => void;
}): (target: O, propertyName: K, inputDescriptor?: PropertyDescriptor) => void {
  return function (target: O, propertyName: K, inputDescriptor?: PropertyDescriptor): void {
    const prevDescriptor = inputDescriptor ?? Object.getOwnPropertyDescriptor(target, propertyName);
    const prevGetter = prevDescriptor?.get;
    const prevSetter = prevDescriptor?.set;

    let _val = target[propertyName];

    const getter = function (this: O): O[K] {
      const value = prevGetter ? prevGetter.bind(this)() : _val;

      if (arg.get) {
        arg.get(this, propertyName, value);
      }

      return value;
    };

    const setter = function (this: O, value: O[K]): void {
      const prevValue = prevGetter ? prevGetter.bind(this)() : _val;

      let realValue = value;
      if (arg.beforeSet) {
        const beforeSetResult = arg.beforeSet(this, propertyName, prevValue, realValue);
        if (beforeSetResult) {
          realValue = beforeSetResult();
        }
      }

      if (prevSetter) {
        prevSetter.bind(this)(realValue);
      }
      else {
        _val = realValue;
      }

      if (arg.afterSet) {
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
}