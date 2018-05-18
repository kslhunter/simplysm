export declare const Type: FunctionConstructor;

// tslint:disable-next-line:interface-name
export interface Type<T> extends Function {
  new(...args: any[]): T;
}
