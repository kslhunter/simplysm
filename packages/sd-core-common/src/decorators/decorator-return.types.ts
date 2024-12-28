import { Type } from "../types/type";

/**
 * 속성용 Decorator 함수의 Return 타입
 *
 * @template T 포함된 클래스 타입
 * @template N 속성명 (string)
 */
export type TPropertyDecoratorReturn<T, N = string> = (
  target: T,
  propertyName: N,
  inputDescriptor?: PropertyDescriptor,
) => void;

/**
 * 클래스용 Decorator 함수의 Return 타입
 *
 * @template T 클래스 타입
 */
export type TClassDecoratorReturn<T> = (classType: Type<T>) => void;
