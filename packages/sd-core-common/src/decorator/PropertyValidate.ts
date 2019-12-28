import {PropertyGetSetDecoratorBase} from "./PropertyGetSetDecoratorBase";
import {ObjectUtil, TValidateDef} from "../util/ObjectUtil";

export function PropertyValidate(def: TValidateDef<any>): (target: any, propertyName: string, inputDescriptor?: PropertyDescriptor) => void {
  return PropertyGetSetDecoratorBase({
    beforeSet: (target, propertyName) => {
      const error = ObjectUtil.validate(target[propertyName], def);
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