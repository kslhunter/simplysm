import { DateTime } from "../types/DateTime";
import { DateOnly } from "../types/DateOnly";
import { Time } from "../types/Time";
import { Uuid } from "../types/Uuid";
import * as os from "os";
import { NeverEntryError } from "../errors/NeverEntryError";
export class ObjectUtil {
    static clone(source, options) {
        return ObjectUtil._clone(source, options);
    }
    static _clone(source, options, prevClones) {
        if (source == null) {
            return undefined;
        }
        if (source instanceof Array) {
            return source.map((item) => ObjectUtil._clone(item, options));
        }
        if (source instanceof Map) {
            return Array.from(source.keys()).toMap((key) => ObjectUtil._clone(key, options), (key) => ObjectUtil._clone(source.get(key), options));
        }
        if (source instanceof Date) {
            return new Date(source.getTime());
        }
        if (source instanceof DateTime) {
            return new DateTime(source.tick);
        }
        if (source instanceof DateOnly) {
            return new DateOnly(source.tick);
        }
        if (source instanceof Time) {
            return new Time(source.tick);
        }
        if (source instanceof Uuid) {
            return new Uuid(source.toString());
        }
        if (source instanceof Buffer) {
            return Buffer.from(source.buffer);
        }
        if (typeof source === "object") {
            const result = {};
            Object.setPrototypeOf(result, source.constructor.prototype);
            const currPrevClones = prevClones ?? [];
            currPrevClones.push({ source, clone: result });
            for (const key of Object.keys(source).filter((sourceKey) => options?.excludes?.includes(sourceKey) !== true)) {
                if (source[key] === undefined) {
                    result[key] = undefined;
                }
                else if (options?.useRefTypes?.includes(source[key].constructor) === true) {
                    result[key] = source[key];
                }
                else {
                    const matchedPrevClone = prevClones?.single((item) => item.source === source[key]);
                    if (matchedPrevClone !== undefined) {
                        result[key] = matchedPrevClone.clone;
                    }
                    else {
                        result[key] = ObjectUtil._clone(source[key], { useRefTypes: options?.useRefTypes }, currPrevClones);
                    }
                }
            }
            return result;
        }
        return source;
    }
    static merge(source, target, opt) {
        if (source === undefined) {
            return ObjectUtil.clone(target);
        }
        if (target === undefined) {
            return opt?.useDelTargetUndefined ? undefined : ObjectUtil.clone(source);
        }
        if (typeof target !== "object") {
            return target;
        }
        if (target instanceof Date
            || target instanceof DateTime
            || target instanceof DateOnly
            || target instanceof Time
            || target instanceof Uuid
            || target instanceof Buffer
            || (opt?.arrayProcess === "replace"
                && target instanceof Array)) {
            return ObjectUtil.clone(target);
        }
        if (typeof source !== typeof target) {
            throw new Error("병합하려고 하는 두 객체의 타입이 서로 다릅니다.");
        }
        if (source instanceof Map && target instanceof Map) {
            const result = ObjectUtil.clone(source);
            for (const key of target.keys()) {
                if (result.has(key)) {
                    result.set(key, ObjectUtil.merge(result.get(key), target.get(key)));
                }
                else {
                    result.set(key, target.get(key));
                }
            }
            return result;
        }
        if (opt?.arrayProcess === "concat" && source instanceof Array && target instanceof Array) {
            let result = source.concat(target).distinct();
            if (opt.useDelTargetUndefined) {
                result = result.filterExists();
            }
            return result;
        }
        const result = ObjectUtil.clone(source);
        for (const key of Object.keys(target)) {
            result[key] = ObjectUtil.merge(source[key], target[key], opt);
            if (opt?.useDelTargetUndefined && result[key] === undefined) {
                delete result[key];
            }
        }
        return result;
    }
    static merge3(source, origin, target, optionsObj) {
        let conflict = false;
        const result = ObjectUtil.clone(origin);
        for (const key of Object.keys(source).concat(Object.keys(target)).concat(Object.keys(origin))) {
            if (ObjectUtil.equal(source[key], result[key], optionsObj?.[key])) {
                result[key] = ObjectUtil.clone(target[key]);
            }
            else if (ObjectUtil.equal(target[key], result[key], optionsObj?.[key])) {
                result[key] = ObjectUtil.clone(source[key]);
            }
            else if (ObjectUtil.equal(source[key], target[key], optionsObj?.[key])) {
                result[key] = ObjectUtil.clone(source[key]);
            }
            else {
                conflict = true;
            }
        }
        return { conflict, result: result };
    }
    static pick(item, keys) {
        const result = {};
        for (const key of keys) {
            result[key] = item[key];
        }
        return result;
    }
    static pickByType(item, type) {
        const result = {};
        for (const key of Object.keys(result)) {
            const typeCast = type;
            if (typeCast === String && typeof item[key] === "string") {
                result[key] = item[key];
            }
            else if (typeCast === Number && typeof item[key] === "number") {
                result[key] = item[key];
            }
            else if (typeCast === Boolean && typeof item[key] === "boolean") {
                result[key] = item[key];
            }
            else if (typeCast === DateOnly && item[key] instanceof DateOnly) {
                result[key] = item[key];
            }
            else if (typeCast === DateTime && item[key] instanceof DateTime) {
                result[key] = item[key];
            }
            else if (typeCast === Time && item[key] instanceof Time) {
                result[key] = item[key];
            }
            else if (typeCast === Uuid && item[key] instanceof Uuid) {
                result[key] = item[key];
            }
            else if (typeCast === Buffer && item[key] instanceof Buffer) {
                result[key] = item[key];
            }
        }
        return result;
    }
    static equal(source, target, options) {
        if (source === target) {
            return true;
        }
        if (source instanceof Date && target instanceof Date) {
            return source.getTime() === target.getTime();
        }
        if ((source instanceof Time && target instanceof DateTime)
            || (source instanceof Time && target instanceof DateOnly)
            || (source instanceof Time && target instanceof Time)) {
            return source.tick === target.tick;
        }
        if (source instanceof Array && target instanceof Array) {
            if (source.length !== target.length) {
                return false;
            }
            if (options?.ignoreArrayIndex) {
                return source.every((sourceItem) => (target.some((targetItem) => (ObjectUtil.equal(targetItem, sourceItem, options)))));
            }
            else {
                for (let i = 0; i < source.length; i++) {
                    if (!ObjectUtil.equal(source[i], target[i], options)) {
                        return false;
                    }
                }
            }
            return true;
        }
        if (source instanceof Map && target instanceof Map) {
            const sourceKeys = Array.from(source.keys())
                .filter((key) => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && source[key] !== undefined);
            const targetKeys = Array.from(target.keys())
                .filter((key) => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && target[key] !== undefined);
            if (sourceKeys.length !== targetKeys.length) {
                return false;
            }
            for (const key of sourceKeys) {
                if (!ObjectUtil.equal(source.get(key), target.get(key), { ignoreArrayIndex: options?.ignoreArrayIndex })) {
                    return false;
                }
            }
            return true;
        }
        if (typeof source === "object" && typeof target === "object") {
            const sourceKeys = Object.keys(source)
                .filter((key) => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && source[key] !== undefined);
            const targetKeys = Object.keys(target)
                .filter((key) => (options?.keys === undefined || options.keys.includes(key)) && (!options?.excludes?.includes(key)) && target[key] !== undefined);
            if (sourceKeys.length !== targetKeys.length) {
                return false;
            }
            for (const key of sourceKeys) {
                if (!ObjectUtil.equal(source[key], target[key], { ignoreArrayIndex: options?.ignoreArrayIndex })) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    static validate(value, def) {
        let currDef;
        if (def instanceof Array) { //Type<T>[]
            currDef = {
                type: def
            };
        }
        else if (typeof def === "function") { //Type<T>
            currDef = {
                type: [def]
            };
        }
        else { //IValidateDef<T>
            currDef = {
                ...def,
                type: def.type !== undefined ? def.type instanceof Array ? def.type : [def.type] : undefined
            };
        }
        const invalidateDef = {};
        if (currDef.notnull && value === undefined) {
            invalidateDef.notnull = currDef.notnull;
        }
        if (!currDef.notnull && value === undefined) {
            return undefined;
        }
        if (currDef.type !== undefined
            && !currDef.type.some((type) => type === value?.constructor)) {
            invalidateDef.type = currDef.type;
        }
        if (Number.isNaN(value)) {
            invalidateDef.type = currDef.type;
        }
        let message;
        if (currDef.validator !== undefined) {
            const validatorResult = currDef.validator(value);
            if (validatorResult !== true) {
                invalidateDef.validator = currDef.validator;
                if (typeof validatorResult === "string") {
                    message = validatorResult;
                }
            }
        }
        if (currDef.includes !== undefined && !currDef.includes.includes(value)) {
            invalidateDef.includes = currDef.includes;
        }
        if (Object.keys(invalidateDef).length > 0) {
            return { value, invalidateDef, message };
        }
        return undefined;
    }
    static validateObject(obj, def) {
        const result = {};
        for (const defKey of Object.keys(def)) {
            const validateResult = ObjectUtil.validate(obj[defKey], def[defKey]);
            if (validateResult !== undefined) {
                result[defKey] = validateResult;
            }
        }
        return result;
    }
    static validateObjectWithThrow(displayName, obj, def) {
        const validateResult = ObjectUtil.validateObject(obj, def);
        if (Object.keys(validateResult).length > 0) {
            const errorMessages = [];
            const invalidateKeys = Object.keys(validateResult);
            for (const invalidateKey of invalidateKeys) {
                const itemDisplayName = def[invalidateKey].displayName;
                // noinspection PointlessBooleanExpressionJS
                if (def[invalidateKey].displayValue !== false) {
                    const itemValue = validateResult[invalidateKey].value;
                    if (typeof itemValue === "string"
                        || typeof itemValue === "number"
                        || typeof itemValue === "boolean"
                        || typeof itemValue === "undefined") {
                        errorMessages.push(`- '${itemDisplayName}': ` + itemValue);
                    }
                    else if (itemValue instanceof DateTime) {
                        errorMessages.push(`- '${itemDisplayName}': ` + itemValue.toFormatString("yyyy-MM-dd HH:mm:ss"));
                    }
                    else if (itemValue instanceof DateOnly) {
                        errorMessages.push(`- '${itemDisplayName}': ` + itemValue.toFormatString("yyyy-MM-dd"));
                    }
                    else {
                        errorMessages.push(`- '${itemDisplayName}'`);
                    }
                }
                else {
                    errorMessages.push(`- '${itemDisplayName}'`);
                }
            }
            throw new Error(`${displayName}중 잘못된 내용이 있습니다.` + os.EOL + errorMessages.join(os.EOL));
        }
    }
    static validateArray(arr, def) {
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const validateObjectResult = ObjectUtil.validateObject(item, typeof def === "function" ? def(item) : def);
            if (Object.keys(validateObjectResult).length > 0) {
                result.push({
                    index: i,
                    item,
                    result: validateObjectResult
                });
            }
        }
        return result;
    }
    static validateArrayWithThrow(displayName, arr, def) {
        const validateResults = ObjectUtil.validateArray(arr, def);
        if (validateResults.length > 0) {
            const errorMessages = [];
            for (const validateResult of validateResults) {
                const realDef = typeof def === "function" ? def(validateResult.item) : def;
                const invalidateKeys = Object.keys(validateResult.result);
                for (const invalidateKey of invalidateKeys) {
                    const itemDisplayName = realDef[invalidateKey].displayName;
                    // noinspection PointlessBooleanExpressionJS
                    if (realDef[invalidateKey].displayValue !== false) {
                        const itemValue = validateResult.result[invalidateKey].value;
                        if (typeof itemValue === "string"
                            || typeof itemValue === "number"
                            || typeof itemValue === "boolean"
                            || typeof itemValue === "undefined") {
                            errorMessages.push(`- ${validateResult.index + 1}번째 항목의 '${itemDisplayName}': ` + itemValue);
                        }
                        else if (itemValue instanceof DateTime) {
                            errorMessages.push(`- ${validateResult.index + 1}번째 항목의 '${itemDisplayName}': ` + itemValue.toFormatString("yyyy-MM-dd HH:mm:ss"));
                        }
                        else if (itemValue instanceof DateOnly) {
                            errorMessages.push(`- ${validateResult.index + 1}번째 항목의 '${itemDisplayName}': ` + itemValue.toFormatString("yyyy-MM-dd"));
                        }
                        else {
                            errorMessages.push(`- ${validateResult.index + 1}번째 항목의 '${itemDisplayName}'`);
                        }
                    }
                    else {
                        errorMessages.push(`- ${validateResult.index + 1}번째 항목의 '${itemDisplayName}'`);
                    }
                }
            }
            throw new Error(`${displayName}중 잘못된 내용이 있습니다.` + os.EOL + errorMessages.join(os.EOL));
        }
    }
    static getChainValueByDepth(obj, key, depth, optional) {
        let result = obj;
        for (let i = 0; i < depth; i++) {
            if (optional) {
                result = result?.[key];
            }
            else {
                result = result[key];
            }
        }
        return result;
    }
    static getChainValue(obj, chain, optional) {
        const split = chain.split(".");
        let result = obj;
        for (const splitItem of split) {
            if (optional && result === undefined) {
                result = undefined;
            }
            else {
                result = result[splitItem];
            }
        }
        return result;
    }
    static setChainValue(obj, chain, value) {
        const split = chain.split(".");
        let curr = obj;
        for (const splitItem of split.slice(0, -1)) {
            curr = curr[splitItem];
        }
        const last = split.last();
        if (last === undefined) {
            throw new NeverEntryError();
        }
        curr[last] = value;
    }
    static deleteChainValue(obj, chain) {
        const split = chain.split(".");
        let curr = obj;
        for (const splitItem of split.slice(0, -1)) {
            curr = curr[splitItem];
        }
        const last = split.last();
        if (last === undefined) {
            throw new NeverEntryError();
        }
        delete curr[last];
    }
    static clearUndefined(obj) {
        if (obj === undefined) {
            return obj;
        }
        for (const key of Object.keys(obj)) {
            if (obj[key] === undefined) {
                delete obj[key];
            }
        }
        return obj;
    }
    static clear(obj) {
        for (const key of Object.keys(obj)) {
            delete obj[key];
        }
        return obj;
    }
    static nullToUndefined(obj) {
        if (obj == null) {
            return undefined;
        }
        if (obj instanceof Date
            || obj instanceof DateTime
            || obj instanceof DateOnly
            || obj instanceof Time) {
            return obj;
        }
        if (obj instanceof Array) {
            for (let i = 0; i < obj.length; i++) {
                obj[i] = ObjectUtil.nullToUndefined(obj[i]);
            }
            return obj;
        }
        if (typeof obj === "object") {
            for (const key of Object.keys(obj)) {
                if (obj[key] == null) {
                    obj[key] = undefined;
                }
            }
            return obj;
        }
        return obj;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT2JqZWN0VXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9PYmplY3RVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDN0MsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNyQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRXpCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUc1RCxNQUFNLE9BQU8sVUFBVTtJQUtkLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBVyxFQUFFLE9BQW1EO1FBQ2xGLE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBVyxFQUFFLE9BQW1ELEVBQUUsVUFBMEM7UUFDaEksSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2xCLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBQ0QsSUFBSSxNQUFNLFlBQVksS0FBSyxFQUFFO1lBQzNCLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMvRDtRQUNELElBQUksTUFBTSxZQUFZLEdBQUcsRUFBRTtZQUN6QixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFB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