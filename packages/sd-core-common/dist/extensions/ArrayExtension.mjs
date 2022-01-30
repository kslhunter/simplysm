import { NeverEntryError } from "../errors/NeverEntryError";
import { ObjectUtil } from "../utils/ObjectUtil";
import { DateOnly } from "../types/DateOnly";
import { DateTime } from "../types/DateTime";
import { Time } from "../types/Time";
((prototype) => {
    prototype.single = function (predicate) {
        const arr = predicate !== undefined ? this.filter(predicate) : this;
        if (arr.length > 1) {
            throw new Error("복수의 결과물이 있습니다. (" + arr.length + "개)");
        }
        return arr[0];
    };
    prototype.first = function (predicate) {
        return predicate !== undefined ? this.find(predicate) : this[0];
    };
    prototype.filterAsync = async function (predicate) {
        const arr = [];
        for (let i = 0; i < this.length; i++) {
            if (await predicate(this[i], i)) {
                arr.push(this[i]);
            }
        }
        return arr;
    };
    prototype.last = function (predicate) {
        if (predicate !== undefined) {
            for (let i = this.length - 1; i >= 0; i--) {
                if (predicate(this[i], i)) {
                    return this[i];
                }
            }
            return undefined;
        }
        else {
            return this[this.length - 1];
        }
    };
    prototype.filterExists = function () {
        return this.filter((item) => item !== undefined);
    };
    prototype.ofType = function (type) {
        return this.filter((item) => item instanceof type || item?.constructor === type);
    };
    prototype.mapAsync = async function (selector) {
        return await Promise.all(this.map(selector));
    };
    prototype.mapMany = function (selector) {
        const arr = selector ? this.map(selector) : this;
        return arr.length > 0 ? arr.reduce((p, n) => (p ?? []).concat(n ?? [])) : arr;
    };
    prototype.mapManyAsync = async function (selector) {
        const arr = selector !== undefined ? await this.mapAsync(selector) : this;
        return arr.mapMany();
    };
    prototype.parallelAsync = async function (fn) {
        return await Promise.all(this.map(async (item, index) => await fn(item, index)));
    };
    prototype.groupBy = function (keySelector, valueSelector) {
        const result = [];
        for (let i = 0; i < this.length; i++) {
            const keyObj = keySelector(this[i], i);
            const valueObj = valueSelector !== undefined ? valueSelector(this[i], i) : this[i];
            const existsRecord = result.single((item) => ObjectUtil.equal(item.key, keyObj));
            if (existsRecord !== undefined) {
                existsRecord.values.push(valueObj);
            }
            else {
                result.push({ key: keyObj, values: [valueObj] });
            }
        }
        return result;
    };
    prototype.toMap = function (keySelector, valueSelector) {
        const result = new Map();
        for (let i = 0; i < this.length; i++) {
            const item = this[i];
            const keyObj = keySelector(item, i);
            const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;
            if (result.has(keyObj)) {
                throw new Error(`키가 중복되었습니다. (중복된키: ${JSON.stringify(keyObj)})`);
            }
            result.set(keyObj, valueObj);
        }
        return result;
    };
    prototype.toMapAsync = async function (keySelector, valueSelector) {
        const result = new Map();
        for (let i = 0; i < this.length; i++) {
            const item = this[i];
            const keyObj = await keySelector(item, i);
            const valueObj = valueSelector !== undefined ? await valueSelector(item, i) : item;
            if (result.has(keyObj)) {
                throw new Error(`키가 중복되었습니다. (중복된키: ${JSON.stringify(keyObj)})`);
            }
            result.set(keyObj, valueObj);
        }
        return result;
    };
    prototype.toObject = function (keySelector, valueSelector) {
        const result = {};
        for (let i = 0; i < this.length; i++) {
            const item = this[i];
            const key = keySelector(item, i);
            const valueObj = valueSelector !== undefined ? valueSelector(item, i) : item;
            if (result[key] !== undefined) {
                throw new Error(`키가 중복되었습니다. (중복된키: ${key})`);
            }
            result[key] = valueObj;
        }
        return result;
    };
    prototype.distinct = function (matchAddress) {
        const result = [];
        for (const item of this) {
            if (!result.some((item1) => (matchAddress === true ? item1 === item : ObjectUtil.equal(item1, item)))) {
                result.push(item);
            }
        }
        return result;
    };
    prototype.distinctThis = function (matchAddress) {
        const distinctArray = this.distinct(matchAddress);
        this.clear().push(...distinctArray);
    };
    prototype.orderBy = function (selector) {
        return this.concat().sort((p, n) => {
            const pn = selector !== undefined ? selector(n) : n;
            const pp = selector !== undefined ? selector(p) : p;
            const cpn = pn instanceof DateOnly ? pn.tick
                : pn instanceof DateTime ? pn.tick
                    : pn instanceof Time ? pn.tick
                        : pn;
            const cpp = pp instanceof DateOnly ? pp.tick
                : pp instanceof DateTime ? pp.tick
                    : pp instanceof Time ? pp.tick
                        : pp;
            if (cpn === cpp) {
                return 0;
            }
            else if (typeof cpn === "string" && typeof cpp === "string") {
                return cpp.localeCompare(cpn);
            }
            else if (typeof cpn === "number" && typeof cpp === "number") {
                return (cpn > cpp ? -1 : cpn < cpp ? 1 : 0);
            }
            else if (typeof cpp === "undefined") {
                return -1;
            }
            else if (typeof cpn === "undefined") {
                return 1;
            }
            else {
                throw new Error("orderBy 는 string 이나 number 에 대해서만 사용할 수 있습니다.");
            }
        });
    };
    prototype.orderByDesc = function (selector) {
        return this.concat().sort((p, n) => {
            const pn = selector !== undefined ? selector(n) : n;
            const pp = selector !== undefined ? selector(p) : p;
            const cpn = pn instanceof DateOnly ? pn.tick
                : pn instanceof DateTime ? pn.tick
                    : pn instanceof Time ? pn.tick
                        : pn;
            const cpp = pp instanceof DateOnly ? pp.tick
                : pp instanceof DateTime ? pp.tick
                    : pp instanceof Time ? pp.tick
                        : pp;
            if (cpn === cpp) {
                return 0;
            }
            else if (typeof cpn === "string" && typeof cpp === "string") {
                return cpn.localeCompare(cpp);
            }
            else if (typeof cpn === "number" && typeof cpp === "number") {
                return (cpn < cpp ? -1 : cpn > cpp ? 1 : 0);
            }
            else if (typeof cpp === "undefined") {
                return 1;
            }
            else if (typeof cpn === "undefined") {
                return -1;
            }
            else {
                throw new Error("orderBy 는 string 이나 number 에 대해서만 사용할 수 있습니다.");
            }
        });
    };
    prototype.diffs = function (target, options) {
        const result = [];
        const uncheckedTarget = [].concat(target); // source 비교시, 수정으로 판단되거나 변경사항이 없는것으로 판단된 target 은 제외시킴
        for (const sourceItem of this) {
            //target 에 동일한 항목이 없을 때
            const sameTarget = uncheckedTarget.single((targetItem) => (ObjectUtil.equal(targetItem, sourceItem, options?.excludes !== undefined ? { excludes: options.excludes } : undefined)));
            if (sameTarget === undefined) {
                //키 설정시
                if (options?.keys !== undefined) {
                    //target 에 동일한 항목은 아니지만, key 가 같은게 있는 경우: source => target 수정된 항목
                    const sameKeyTargetItem = uncheckedTarget.single((targetItem) => ObjectUtil.equal(targetItem, sourceItem, { keys: options.keys }));
                    if (sameKeyTargetItem !== undefined) {
                        result.push({ source: sourceItem, target: sameKeyTargetItem });
                        uncheckedTarget.remove(sameKeyTargetItem);
                        continue;
                    }
                }
                //기타: source 에서 삭제된 항목
                result.push({ source: sourceItem, target: undefined });
            }
            else {
                uncheckedTarget.remove(sameTarget);
            }
        }
        for (const uncheckedTargetItem of uncheckedTarget) {
            //target 에 추가된 항목
            result.push({ source: undefined, target: uncheckedTargetItem });
        }
        return result;
    };
    prototype.oneWayDiffs = function (orgItems, key, options) {
        const orgItemMap = orgItems instanceof Map ? orgItems : orgItems.toMap((orgItem) => orgItem[key]);
        const includeSame = options?.includeSame ?? false;
        const diffs = [];
        for (const item of this) {
            if (item[key] === undefined) {
                diffs.push({ type: "create", item });
                continue;
            }
            const orgItem = orgItemMap.get(item[key]);
            if (!orgItem) {
                diffs.push({ type: "create", item });
                continue;
            }
            if (ObjectUtil.equal(orgItem, item, { excludes: options?.excludes })) {
                if (includeSame) {
                    diffs.push({ type: "same", item, orgItem });
                }
                continue;
            }
            diffs.push({ type: "update", item, orgItem });
        }
        return diffs;
    };
    prototype.merge = function (target, options) {
        const diffs = this.diffs(target, options);
        const result = ObjectUtil.clone(this);
        for (const diff of diffs) {
            // 변경시
            if (diff.source !== undefined && diff.target !== undefined) {
                const resultSourceItem = result.single((item) => ObjectUtil.equal(item, diff.source));
                if (resultSourceItem === undefined) {
                    throw new NeverEntryError();
                }
                result[result.indexOf(resultSourceItem)] = ObjectUtil.merge(diff.source, diff.target);
            }
            // 추가시
            else if (diff.target !== undefined) {
                result.push(diff.target);
            }
        }
        return result;
    };
    prototype.sum = function (selector) {
        let result = 0;
        for (let i = 0; i < this.length; i++) {
            const item = selector !== undefined ? selector(this[i], i) : this[i];
            if (typeof item !== "number") {
                throw new Error("sum 은 number 에 대해서만 사용할 수 있습니다.");
            }
            result += item;
        }
        return result;
    };
    prototype.min = function (selector) {
        let result;
        for (let i = 0; i < this.length; i++) {
            const item = selector !== undefined ? selector(this[i], i) : this[i];
            if (typeof item !== "number" && typeof item !== "string") {
                throw new Error("min 은 number/string 에 대해서만 사용할 수 있습니다.");
            }
            if (result === undefined || result > item) {
                result = item;
            }
        }
        return result;
    };
    prototype.max = function (selector) {
        let result;
        for (let i = 0; i < this.length; i++) {
            const item = selector !== undefined ? selector(this[i], i) : this[i];
            if (typeof item !== "number" && typeof item !== "string") {
                throw new Error("max 은 number/string 에 대해서만 사용할 수 있습니다.");
            }
            if (result === undefined || result < item) {
                result = item;
            }
        }
        return result;
    };
    prototype.shuffle = function () {
        if (this.length <= 1) {
            return ObjectUtil.clone(this);
        }
        let result = this;
        while (true) {
            result = result.orderBy(() => Math.random());
            if (!ObjectUtil.equal(result, this)) {
                break;
            }
        }
        return result;
    };
    prototype.insert = function (index, ...items) {
        this.splice(index, 0, ...items);
        return this;
    };
    prototype.remove = function (itemOrSelector) {
        const removeItems = typeof itemOrSelector === "function" ? this.filter(itemOrSelector.bind(this)) : [itemOrSelector];
        for (const removeItem of removeItems) {
            while (this.includes(removeItem)) {
                this.splice(this.indexOf(removeItem), 1);
            }
        }
        return this;
    };
    prototype.clear = function () {
        return this.remove(() => true);
    };
})(Array.prototype);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXJyYXlFeHRlbnNpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5zaW9ucy9BcnJheUV4dGVuc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDN0MsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQTRJckMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO0lBQ2IsU0FBUyxDQUFDLE1BQU0sR0FBRyxVQUF3QixTQUErQztRQUN4RixNQUFNLEdBQUcsR0FBRyxTQUFTLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDcEUsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDekQ7UUFDRCxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUM7SUFFRixTQUFTLENBQUMsS0FBSyxHQUFHLFVBQXdCLFNBQStDO1FBQ3ZGLE9BQU8sU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQztJQUVGLFNBQVMsQ0FBQyxXQUFXLEdBQUcsS0FBSyxXQUF5QixTQUF1RDtRQUMz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