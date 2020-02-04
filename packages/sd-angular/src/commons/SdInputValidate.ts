import {PropertyValidate, TValidateDef} from "@simplysm/sd-core-common";

export function SdInputValidate(def: TValidateDef<any>): (target: any, propertyName: string, inputDescriptor?: PropertyDescriptor) => void {
  return PropertyValidate(def, (v) => {
    const isForBoolean = (
      def === Boolean ||
      (def instanceof Array && def.includes(Boolean)) ||
      def["type"] === Boolean ||
      (def["type"] instanceof Array && def["type"].includes(Boolean))
    );

    if (isForBoolean && v === "") {
      return true;
    }

    const isForNumber = (
      def === Number ||
      def["type"] === Number
    );

    if (isForNumber && !Number.isNaN(Number(v))) {
      return Number(v);
    }

    if (v === null) {
      return undefined;
    }

    return v;
  });
}
