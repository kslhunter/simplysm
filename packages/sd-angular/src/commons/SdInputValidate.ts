import {PropertyValidate, TValidateDef} from "@simplysm/sd-core-common";

export function SdInputValidate(def: TValidateDef<any>): (target: any, propertyName: string, inputDescriptor?: PropertyDescriptor) => void {
  const isForBoolean = (
    def === Boolean ||
    (def instanceof Array && def.includes(Boolean)) ||
    def["type"] === Boolean ||
    (def["type"] instanceof Array && def["type"].includes(Boolean))
  );

  return PropertyValidate(def, (v) => (isForBoolean && v === "") ? true : v);
}
