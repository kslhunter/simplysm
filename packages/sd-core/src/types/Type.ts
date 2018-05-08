export declare const Type: FunctionConstructor;

export interface Type<T> extends Function { // tslint:disable-line:interface-name
  new(...args: any[]): T;
}
