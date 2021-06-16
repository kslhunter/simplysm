import { IQueryResultParseOption, TEntity, TEntityValue, TQueryValue } from "../commons";
import { DateOnly, DateTime, JsonConvert, ObjectUtil, Time, Type, Uuid } from "@simplysm/sd-core-common";
import { QueryUnit } from "../QueryUnit";

export class SdOrmUtil {
  public static canConvertToQueryValue(value: any): value is TEntityValue<TQueryValue> {
    return ["undefined", "boolean", "number", "string"].includes(typeof value)
      || value instanceof QueryUnit
      || value instanceof Number
      || value instanceof String
      || value instanceof Boolean
      || value instanceof DateOnly
      || value instanceof DateTime
      || value instanceof Time
      || value instanceof Uuid
      || value instanceof Buffer;
  }

  public static getQueryValueType<T extends TQueryValue>(value: TEntityValue<T>): Type<T> | undefined {
    if (value instanceof QueryUnit) {
      return value.type as any;
    }
    else if (value instanceof Number || typeof value === "number") {
      return Number as any;
    }
    else if (value instanceof String || typeof value === "string") {
      return String as any;
    }
    else if (value instanceof Boolean || typeof value === "boolean") {
      return Boolean as any;
    }
    else if (value instanceof DateOnly) {
      return DateOnly as any;
    }
    else if (value instanceof DateTime) {
      return DateTime as any;
    }
    else if (value instanceof Time) {
      return Time as any;
    }
    else if (value instanceof Uuid) {
      return Uuid as any;
    }
    else if (value instanceof Buffer) {
      return Buffer as any;
    }
    else if (value === undefined) {
      return undefined;
    }
    else {
      throw new Error(`QueryValue 를 추출할 수 있는 타입이 아닙니다: ${JSON.stringify(value)}`);
    }
  }

  public static getQueryValueFields<T>(entity: TEntity<T>, availableDepth?: number): TEntityValue<any>[] {
    if (availableDepth !== undefined && availableDepth < 1) return [];

    return Object.values(entity).mapMany((item: any) => {
      if (SdOrmUtil.canConvertToQueryValue(item)) {
        return [item];
      }

      return SdOrmUtil.getQueryValueFields(item, availableDepth !== undefined ? availableDepth - 1 : undefined);
    });
  }

  public static parseQueryResult<T>(orgResults: any[], option?: IQueryResultParseOption): T[] {
    // 타입 변환
    let result: any[] = orgResults.map((item) => {
      const obj: any = {};
      for (const key of Object.keys(item)) {
        if (item[key] == null) {
          obj[key] = undefined;
        }
        else if (option?.columns?.[key]?.dataType === "DateTime") {
          obj[key] = DateTime.parse(item[key]);
        }
        else if (option?.columns?.[key]?.dataType === "DateOnly") {
          obj[key] = DateOnly.parse(item[key]);
        }
        else if (option?.columns?.[key]?.dataType === "Time") {
          obj[key] = Time.parse(item[key]);
        }
        else if (option?.columns?.[key]?.dataType === "Uuid") {
          obj[key] = new Uuid(item[key]);
        }
        else if (option?.columns?.[key]?.dataType === "Boolean") {
          obj[key] = Boolean(item[key]);
        }
        else if (option?.columns?.[key]?.dataType === "Number") {
          obj[key] = Number.parseFloat(item[key]);
        }
        else {
          obj[key] = item[key];
        }
      }
      if (Object.keys(obj).length === 0) return undefined;

      return obj;
    }).filterExists();

    // JOIN 에 따른 데이터 구조 설정
    if (option?.joins && Object.keys(option.joins).length > 0) {
      const joinKeys = Object.keys(option.joins).orderByDesc((key) => key.length);
      for (const joinKey of joinKeys) {
        const grouped: { key: any; values: any | any[] }[] = [];
        const groupedMultiRecord: Record<string, any[] | undefined> = {};

        const resultKeys = Object.keys(Object.assign({}, ...result));
        const keyObjKeys = resultKeys.filter((key) => !key.startsWith(joinKey + "."));
        const valueObjKeys = resultKeys.filter((key) => key.startsWith(joinKey + "."));

        for (const item of result) {
          const keyObj = {};
          for (const keyObjKey of keyObjKeys) {
            if (item[keyObjKey] !== undefined) {
              keyObj[keyObjKey] = item[keyObjKey];
            }
          }

          const valueObj: any = {};
          for (const valueObjKey of valueObjKeys) {
            if (item[valueObjKey] !== undefined) {
              valueObj[valueObjKey.slice(joinKey.length + 1)] = item[valueObjKey];
            }
          }

          if (option.joins[joinKey].isSingle) {
            if (!grouped.some((groupedItem) => ObjectUtil.equal(groupedItem.key, keyObj))) {
              grouped.push({ key: keyObj, values: valueObj });
            }
          }
          else {
            const keyObjJson = JsonConvert.stringify(keyObj);
            const values = groupedMultiRecord[keyObjJson];
            if (values !== undefined) {
              values.push(valueObj);
            }
            else {
              const valueArr = [valueObj];
              grouped.push({ key: keyObj, values: valueArr });
              groupedMultiRecord[JsonConvert.stringify(keyObj)] = valueArr;
            }
          }
        }

        result = grouped.map((groupedItem) => {
          if (groupedItem.values instanceof Array) {
            return {
              ...groupedItem.key,
              [joinKey]: groupedItem.values
                .filter((item1) => (
                  Object.keys(item1)
                    .filter((key) => !(item1[key] instanceof Array) || item1[key].length > 0)
                    .length > 0
                ))
            };
          }
          else {
            return {
              ...groupedItem.key,
              ...Object.keys(groupedItem.values).length > 0 ? {
                [joinKey]: groupedItem.values
              } : {}
            };
          }
        });
      }
    }

    return result;
  }
}