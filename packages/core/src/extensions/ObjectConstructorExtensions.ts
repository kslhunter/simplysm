import {JsonConvert} from "../utils/JsonConvert";

declare global {
    interface ObjectConstructor {
        clone<T>(value: T): T;
    }
}

Object.clone = function (value: any): any {
    return JsonConvert.parse(JsonConvert.stringify(value));
};