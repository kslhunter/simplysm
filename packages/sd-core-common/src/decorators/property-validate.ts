import {PropertyGetSetDecoratorBase} from "./property-get-set.decorator-base";
import {ObjectUtils, TValidateDef} from "../utils/object.utils";
import {TPropertyDecoratorReturn} from "./decorator-return.types";

/**
 * 속성값이 설정될 때, 기대되는 값인지 확인 하는 Decorator
 *
 * @param def Validation 설정
 * @param replacer 체크하기전에 값을 변경하는 함수
 */
export function PropertyValidate(def: TValidateDef<any>, replacer?: TPropertyValidateReplacer): TPropertyDecoratorReturn<any> {
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

/**
 * 체크하기전에 값을 변경하는 함수
 *
 * @param value 입력값
 * @returns 출력값
 */
export type TPropertyValidateReplacer = (value: any) => any;
