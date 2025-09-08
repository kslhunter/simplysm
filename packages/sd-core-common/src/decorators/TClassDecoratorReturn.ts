import { Type } from "../types/type/Type";

/**
 * 클래스용 Decorator 함수의 Return 타입
 *
 * @template T 클래스 타입
 */
export type TClassDecoratorReturn<T> = (classType: Type<T>) => void;
