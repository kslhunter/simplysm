import { PropertyGetSetDecoratorBase } from "./PropertyGetSetDecoratorBase";
import { ObjectUtil } from "../utils/ObjectUtil";
// eslint-disable-next-line @typescript-eslint/naming-convention
export function PropertyValidate(def, replacer) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvcGVydHlWYWxpZGF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9kZWNvcmF0b3JzL1Byb3BlcnR5VmFsaWRhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBZ0IsTUFBTSxxQkFBcUIsQ0FBQztBQUUvRCxnRUFBZ0U7QUFDaEUsTUFBTSxVQUFVLGdCQUFnQixDQUFDLEdBQXNCLEVBQUUsUUFBOEI7SUFDckYsT0FBTywyQkFBMkIsQ0FBQztRQUNqQyxTQUFTLEVBQUUsQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUN4RCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQ25GLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDMUQsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO2dCQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNqRyxTQUFTLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJO29CQUNsQyxZQUFZO29CQUNaLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztvQkFDbEIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztpQkFDNUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNQO1lBRUQsT0FBTyxpQkFBaUIsQ0FBQztRQUMzQixDQUFDO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyJ9