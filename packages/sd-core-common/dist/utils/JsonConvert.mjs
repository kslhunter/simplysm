import { DateTime } from "../types/DateTime";
import { DateOnly } from "../types/DateOnly";
import { Time } from "../types/Time";
import { Uuid } from "../types/Uuid";
import { ObjectUtil } from "./ObjectUtil";
export class JsonConvert {
    static stringify(obj, options) {
        const replacer = (key, value) => {
            const currValue = options?.replacer !== undefined ? options.replacer(key, value) : value;
            if (currValue instanceof Date) {
                return { __type__: "Date", data: currValue.toISOString() };
            }
            if (currValue instanceof DateTime) {
                return { __type__: "DateTime", data: currValue.toString() };
            }
            else if (currValue instanceof DateOnly) {
                return { __type__: "DateOnly", data: currValue.toString() };
            }
            else if (currValue instanceof Time) {
                return { __type__: "Time", data: currValue.toString() };
            }
            else if (currValue instanceof Uuid) {
                return { __type__: "Uuid", data: currValue.toString() };
            }
            else if (currValue instanceof Error) {
                return {
                    __type__: "Error",
                    data: {
                        ...currValue,
                        message: currValue.message,
                        name: currValue.name,
                        stack: currValue.stack
                    }
                };
            }
            else if (currValue?.type === "Buffer" && options?.hideBuffer === true) {
                return { type: "Buffer", data: "__hidden__" };
            }
            return currValue;
        };
        const prevDateToJson = Date.prototype.toJSON;
        delete Date.prototype.toJSON;
        const result1 = JSON.stringify(replacer(undefined, obj), replacer, options?.space);
        Date.prototype.toJSON = prevDateToJson;
        return result1;
    }
    static parse(json) {
        return ObjectUtil.nullToUndefined(JSON.parse(json, (key, value) => {
            if (value != null) {
                if (typeof value === "object" && value.__type__ === "Date") {
                    return new Date(Date.parse(value.data));
                }
                else if (typeof value === "object" && value.__type__ === "DateTime") {
                    return DateTime.parse(value.data);
                }
                else if (typeof value === "object" && value.__type__ === "DateOnly") {
                    return DateOnly.parse(value.data);
                }
                else if (typeof value === "object" && value.__type__ === "Time") {
                    return Time.parse(value.data);
                }
                else if (typeof value === "object" && value.__type__ === "Uuid") {
                    return new Uuid(value.data);
                }
                else if (typeof value === "object" && value.__type__ === "Error") {
                    const error = new Error(value.data.message);
                    Object.assign(error, value.data);
                    return error;
                }
                else if (typeof value === "object" && value.type === "Buffer") {
                    return Buffer.from(value.data);
                }
            }
            return value;
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSnNvbkNvbnZlcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvSnNvbkNvbnZlcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUUxQyxNQUFNLE9BQU8sV0FBVztJQUNmLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBUSxFQUNSLE9BSUM7UUFDdkIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUF1QixFQUFFLEtBQVUsRUFBTyxFQUFFO1lBQzVELE1BQU0sU0FBUyxHQUFHLE9BQU8sRUFBRSxRQUFRLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRXpGLElBQUksU0FBUyxZQUFZLElBQUksRUFBRTtnQkFDN0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO2FBQzVEO1lBQ0QsSUFBSSxTQUFTLFlBQVksUUFBUSxFQUFFO2dCQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7YUFDN0Q7aUJBQ0ksSUFBSSxTQUFTLFlBQVksUUFBUSxFQUFFO2dCQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7YUFDN0Q7aUJBQ0ksSUFBSSxTQUFTLFlBQVksSUFBSSxFQUFFO2dCQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7YUFDekQ7aUJBQ0ksSUFBSSxTQUFTLFlBQVksSUFBSSxFQUFFO2dCQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7YUFDekQ7aUJBQ0ksSUFBSSxTQUFTLFlBQVksS0FBSyxFQUFFO2dCQUNuQyxPQUFPO29CQUNMLFFBQVEsRUFBRSxPQUFPO29CQUNqQixJQUFJLEVBQUU7d0JBQ0osR0FBRyxTQUFTO3dCQUNaLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTzt3QkFDMUIsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJO3dCQUNwQixLQUFLLEVBQUUsU0FBUyxDQUFDLEtBQUs7cUJBQ3ZCO2lCQUNGLENBQUM7YUFDSDtpQkFDSSxJQUFJLFNBQVMsRUFBRSxJQUFJLEtBQUssUUFBUSxJQUFJLE9BQU8sRUFBRSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUNyRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUM7YUFDL0M7WUFDRCxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDLENBQUM7UUFFRixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUM3QyxPQUFRLElBQUksQ0FBQyxTQUFpQixDQUFDLE1BQU0sQ0FBQztRQUV0QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUM7UUFFdkMsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBWTtRQUM5QixPQUFPLFVBQVUsQ0FBQyxlQUFlLENBQy9CLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzlCLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtnQkFDakIsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsS0FBSyxNQUFNLEVBQUU7b0JBQzFELE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDekM7cUJBQ0ksSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsS0FBSyxVQUFVLEVBQUU7b0JBQ25FLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ25DO3FCQUNJLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssVUFBVSxFQUFFO29CQUNuRSxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNuQztxQkFDSSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLE1BQU0sRUFBRTtvQkFDL0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDL0I7cUJBQ0ksSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsS0FBSyxNQUFNLEVBQUU7b0JBQy9ELE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUM3QjtxQkFDSSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRTtvQkFDaEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNqQyxPQUFPLEtBQUssQ0FBQztpQkFDZDtxQkFDSSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtvQkFDN0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDaEM7YUFDRjtZQUVELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7Q0FDRiJ9