import {PropertyGetSetDecoratorBase} from "./PropertyGetSetDecoratorBase";
import {ObjectUtil, TValidateDef} from "../util/ObjectUtil";

export function PropertyValidate(def: TValidateDef<any>): (target: any, propertyName: string, inputDescriptor?: PropertyDescriptor) => void {
  return PropertyGetSetDecoratorBase({
    beforeSet: (target, propertyName, prevValue, nextValue) => {
      const error = ObjectUtil.validate(nextValue, def);
      if (error) {
        throw new Error(`입력값이 잘못되었습니다: ${JSON.stringify({
          component: target.constructor.name,
          propertyName,
          value: error.value,
          errorKeys: Object.keys(error.invalidateDef)
        })}`);
      }
    }
  });
}
