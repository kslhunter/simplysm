import { TFlatType, Type } from "../types/Type";
import { WrappedType } from "../types/WrappedType";
import { UnwrappedType } from "../types/UnwrappedType";
export declare class ObjectUtil {
    static clone<T>(source: T): T;
    static clone<T>(source: T, options: {
        useRefTypes?: Type<any>[];
    }): T;
    static clone<T, X extends keyof T>(source: T, options: {
        excludes: X[];
        useRefTypes?: Type<any>[];
    }): Omit<T, X>;
    static clone<T, X extends keyof T>(source: T[], options: {
        excludes: X[];
        useRefTypes?: Type<any>[];
    }): Omit<T, X>[];
    private static _clone;
    static merge<T, P>(source: T, target: P, opt?: {
        arrayProcess?: "replace" | "concat";
        useDelTargetUndefined?: boolean;
    }): (T & P);
    static merge3<S extends Record<string, TFlatType>, O extends Record<string, TFlatType>, T extends Record<string, TFlatType>>(source: S, origin: O, target: T, optionsObj?: Record<string, {
        keys?: string[];
        excludes?: string[];
        ignoreArrayIndex?: boolean;
    }>): {
        conflict: boolean;
        result: O & S & T;
    };
    static pick<T extends Record<string, any>, K extends keyof T>(item: T, keys: K[]): Pick<T, K>;
    static pickByType<T extends Record<string, any>, A extends TFlatType>(item: T, type: Type<A>): {
        [K in keyof T]: WrappedType<T[K]> extends WrappedType<A> ? T[K] : never;
    };
    static equal(source: any, target: any, options?: {
        keys?: string[];
        excludes?: string[];
        ignoreArrayIndex?: boolean;
    }): boolean;
    static validate<T>(value: T, def: TValidateDef<T>): IValidateResult<T> | undefined;
    static validateObject<T>(obj: T, def: TValidateObjectDef<T>): TValidateObjectResult<T>;
    static validateObjectWithThrow<T>(displayName: string, obj: T, def: TValidateObjectDefWithName<T>): void;
    static validateArray<T>(arr: T[], def: ((item: T) => TValidateObjectDef<T>) | TValidateObjectDef<T>): IValidateArrayResult<T>[];
    static validateArrayWithThrow<T>(displayName: string, arr: T[], def: ((item: T) => TValidateObjectDefWithName<T>) | TValidateObjectDefWithName<T>): void;
    static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number, optional: true): T[K] | undefined;
    static getChainValueByDepth<T, K extends keyof T>(obj: T, key: K, depth: number): T[K];
    static getChainValue(obj: any, chain: string, optional: true): any | undefined;
    static getChainValue(obj: any, chain: string): any;
    static setChainValue(obj: any, chain: string, value: any): void;
    static deleteChainValue(obj: any, chain: string): void;
    static clearUndefined<T>(obj: T): T;
    static clear<T>(obj: T): {};
    static nullToUndefined<T>(obj: T): T | undefined;
}
export declare type TValidateDef<T> = Type<WrappedType<T>> | Type<WrappedType<T>>[] | IValidateDef<T>;
export interface IValidateDef<T> {
    type?: Type<WrappedType<T>> | Type<WrappedType<T>>[];
    notnull?: boolean;
    includes?: T[];
    displayValue?: boolean;
    validator?: (value: UnwrappedType<NonNullable<T>>) => boolean | string;
}
export interface IValidateResult<T> {
    value: T;
    invalidateDef: IValidateDef<T> & {
        type?: Type<WrappedType<T>>[];
    };
    message?: string;
}
declare type TValidateObjectDef<T> = {
    [K in keyof T]?: TValidateDef<any>;
};
declare type TValidateObjectResult<T> = {
    [K in keyof T]?: IValidateResult<any>;
};
export interface IValidateDefWithName<T> extends IValidateDef<T> {
    displayName: string;
}
declare type TValidateObjectDefWithName<T> = {
    [K in keyof T]?: IValidateDefWithName<any>;
};
interface IValidateArrayResult<T> {
    index: number;
    item: T;
    result: TValidateObjectResult<T>;
}
export {};
