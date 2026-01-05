import { PropertyGetSetDecoratorBase } from "./PropertyGetSetDecoratorBase";
import type { TPropertyDecoratorReturn } from "./TPropertyDecoratorReturn";

/**
 * 속성에 설정하여, 동일 클래스의 {@link INotifyPropertyChange.onPropertyChange} 호출
 */
export function NotifyPropertyChange(): TPropertyDecoratorReturn<any> {
  return PropertyGetSetDecoratorBase({
    afterSet: (target, propertyName, oldValue, newValue) => {
      target.onPropertyChange(propertyName, oldValue, newValue);
    },
  });
}

/**
 * {@link NotifyPropertyChange}가 설정된 속성이 변경될때, 상속한 클래스의 {@link onPropertyChange} 호출
 */
export interface INotifyPropertyChange {
  /**
   * {@link NotifyPropertyChange}가 설정된 속성이 변경될때, 상속한 클래스의 {@link onPropertyChange} 호출
   *
   * @template K 속성명 타입
   *
   * @param propertyName 속성명
   * @param oldValue 변경 이전 값
   * @param newValue 변경 이후 값
   */
  onPropertyChange<K extends keyof this>(
    propertyName: K,
    oldValue: this[K],
    newValue: this[K],
  ): void;
}
