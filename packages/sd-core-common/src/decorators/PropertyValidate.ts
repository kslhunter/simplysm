import {PropertyGetSetDecoratorBase} from "./PropertyGetSetDecoratorBase";
import {ObjectUtils, TValidateDef} from "../utils/ObjectUtils";

export function PropertyValidate(def: TValidateDef<any>, replacer?: (value: any) => any): (target: any, propertyName: string, inputDescriptor?: PropertyDescriptor) => void {
  return PropertyGetSetDecoratorBase({
    beforeSet: (target, propertyName, prevValue, nextValue) => {
      const replacedNextValue = replacer !== undefined ? replacer(nextValue) : nextValue;
      const error = ObjectUtils.validate(replacedNextValue, def);
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