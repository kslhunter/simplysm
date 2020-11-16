import { PropertyGetSetDecoratorBase } from "./PropertyGetSetDecoratorBase";
import { ObjectUtil, TValidateDef } from "../utils/ObjectUtil";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function PropertyValidate(def: TValidateDef<any>, replacer?: (value: any) => any): (target: any, propertyName: string, inputDescriptor?: PropertyDescriptor) => void {
  return PropertyGetSetDecoratorBase({
    beforeSet: (target, propertyName, prevValue, nextValue) => {
      const replacedNextValue = replacer !== undefined ? replacer(nextValue) : nextValue;
      const error = ObjectUtil.validate(replacedNextValue, def);
      if (error !== undefined) {
        throw new Error(`${error.message !== undefined ? error.message : "입력값이 잘못되었습니다"}: ${JSON.stringify({
          component: target.constructor.name,
          propertyName,
          value: error.value,
          errorKeys: Object.keys(error.invalidateDef)
        })}`);
      }

      return replacedNextValue;
    }
  });
}