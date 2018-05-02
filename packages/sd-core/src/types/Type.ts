export declare const Type: FunctionConstructor;

export interface Type<T> extends Function {
  new(...args: any[]): T;
}
