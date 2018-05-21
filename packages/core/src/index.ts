import "./extensions/ArrayExtensions";
import "./extensions/ObjectConstructorExtensions";

export * from "./extensions/ObjectConstructorExtensions";

export * from "./exceptions/Exception";
export * from "./exceptions/InvalidArgumentsException";
export * from "./exceptions/NotImplementedException";

export * from "./types/DateOnly";
export * from "./types/DateTime";
export * from "./types/Time";
export * from "./types/Type";
export * from "./types/Uuid";

export * from "./utils/JsonConvert";
export * from "./utils/LambdaParser";
export * from "./utils/Logger";
export * from "./utils/Wait";

export type Diff<T extends string, U extends string> = ({[P in T]: P } & {[P in U]: never } & { [x: string]: never })[T];
export type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;