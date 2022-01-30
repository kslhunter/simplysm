import { TValidateDef } from "../utils/ObjectUtil";
export declare function PropertyValidate(def: TValidateDef<any>, replacer?: (value: any) => any): (target: any, propertyName: string, inputDescriptor?: PropertyDescriptor) => void;
