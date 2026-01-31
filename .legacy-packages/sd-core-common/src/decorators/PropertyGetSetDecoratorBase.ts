import type { TPropertyDecoratorReturn } from "./TPropertyDecoratorReturn";

const symbol = "sd-type-validate";

/**
 * 속성의 GET/SET 을 Interupt 하여 사용하는 Decorator를 위한 기본 함수
 *
 * @template O 클래스 타입
 * @template K 클래스내 속성명
 */
export function PropertyGetSetDecoratorBase<O extends object, K extends keyof O>(
  arg: IPropertyGetSetDecoratorBaseParam<O, K>,
): TPropertyDecoratorReturn<O, K> {
  return function (target: O, propertyName: K, inputDescriptor?: PropertyDescriptor): void {
    const prevDescriptor = inputDescriptor ?? Object.getOwnPropertyDescriptor(target, propertyName);
    const prevGetter = prevDescriptor?.get;
    const prevSetter = prevDescriptor?.set;

    Reflect.defineMetadata(symbol, target[propertyName], target, propertyName as string);

    const getter = function (this: O): O[K] {
      const value =
        prevGetter !== undefined
          ? prevGetter.bind(this)()
          : Reflect.getMetadata(symbol, this, propertyName as string);

      if (arg.get !== undefined) {
        arg.get(this, propertyName, value);
      }

      return value;
    };

    const setter = function (this: O, value: O[K]): void {
      const prevValue =
        prevGetter !== undefined
          ? prevGetter.bind(this)()
          : Reflect.getMetadata(symbol, this, propertyName as string);

      let realValue = value;
      if (arg.beforeSet !== undefined) {
        const beforeSetResult = arg.beforeSet(this, propertyName, prevValue, realValue);
        if (beforeSetResult !== undefined) {
          realValue = beforeSetResult;
        }
      }

      if (prevSetter !== undefined) {
        prevSetter.bind(this)(realValue);
      } else {
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
        configurable: true,
      });
    }
  };
}

/**
 * {@link PropertyGetSetDecoratorBase} 의 Parameter
 *
 * @template O 클래스 타입
 * @template K 클래스내 속성명
 *
 */
export interface IPropertyGetSetDecoratorBaseParam<O extends object, K extends keyof O> {
  /**
   * 값이 설정 되기 전에 수행할 함수
   *
   * @param target 객체
   * @param propertyName  속성명
   * @param oldValue SET 이전값
   * @param newValue SET 이후값
   */
  beforeSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => O[K] | undefined;

  /**
   * 값이 설정 된 직후, 수행할 함수
   *
   * @param target 객체
   * @param propertyName  속성명
   * @param oldValue SET 이전값
   * @param newValue SET 이후값
   */
  afterSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => void;

  /**
   * 누군가 GET 을 시도할때, GET 되기 전, 수행할 함수
   *
   * @param target 객체
   * @param propertyName  속성명
   * @param value GET 처리될 현재 값
   */
  get?: (target: O, propertyName: K, value: O[K]) => void;
}
