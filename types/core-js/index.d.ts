declare namespace Reflect {
  function apply(target: Function, thisArgument: any, argumentsList: ArrayLike<any>): any;

  function construct(target: Function, argumentsList: ArrayLike<any>): any;

  function defineProperty(target: any, propertyKey: PropertyKey, attributes: PropertyDescriptor): boolean;

  function deleteProperty(target: any, propertyKey: PropertyKey): boolean;

  function enumerate(target: any): IterableIterator<any>;

  function get(target: any, propertyKey: PropertyKey, receiver?: any): any;

  function getOwnPropertyDescriptor(target: any, propertyKey: PropertyKey): PropertyDescriptor;

  function getPrototypeOf(target: any): any;

  function has(target: any, propertyKey: string | symbol): boolean;

  function isExtensible(target: any): boolean;

  function ownKeys(target: any): PropertyKey[];

  function preventExtensions(target: any): boolean;

  function set(target: any, propertyKey: PropertyKey, value: any, receiver?: any): boolean;

  function setPrototypeOf(target: any, proto: any): boolean;

  function defineMetadata(metadataKey: any, metadataValue: any, target: Object, targetKey?: string | symbol): void;

  function deleteMetadata(metadataKey: any, target: Object, targetKey?: string | symbol): boolean;

  function getMetadata(metadataKey: any, target: Object, targetKey?: string | symbol): any;

  function getMetadataKeys(target: Object, targetKey?: string | symbol): any[];

  function getOwnMetadata(metadataKey: any, target: Object, targetKey?: string | symbol): any;

  function getOwnMetadataKeys(target: Object, targetKey?: string | symbol): any[];

  function hasMetadata(metadataKey: any, target: Object, targetKey?: string | symbol): boolean;

  function hasOwnMetadata(metadataKey: any, target: Object, targetKey?: string | symbol): boolean;

  function metadata(metadataKey: any, metadataValue: any): {
    (target: Function): void;
    (target: Object, targetKey: string | symbol): void;
  };
}
