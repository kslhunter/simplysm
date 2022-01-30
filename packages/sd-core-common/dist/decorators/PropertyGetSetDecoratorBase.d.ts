export declare function PropertyGetSetDecoratorBase<O extends object, K extends keyof O>(arg: {
    beforeSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => (O[K] | undefined);
    afterSet?: (target: O, propertyName: K, oldValue: O[K], newValue: O[K]) => void;
    get?: (target: O, propertyName: K, value: O[K]) => void;
}): (target: O, propertyName: K, inputDescriptor?: PropertyDescriptor) => void;
