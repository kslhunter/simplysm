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
    const data: any[] = orgResults.map((item) => {
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
      const grouping = (itemOrItems: any | any[], parentJoinKey: string, joinKeys: string[]): any | any[] => {
        const items = itemOrItems instanceof Array ? itemOrItems : [itemOrItems];
        const keys = Object.keys(Object.assign({}, ...items));

        const grouped: { key: any; resultRecord: Record<string, (any | any[])> }[] = [];
        const groupedMultiRecord: Record<string, any[] | undefined> = {};

        const keyObjKeys = keys.filter((key) => !joinKeys.some((joinKey) => key.startsWith(joinKey + ".")));
        for (const joinKey of joinKeys) {
          const valueObjKeys = keys.filter((key) => key.startsWith(joinKey + "."));

          for (const item of items) {
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

            if (option.joins![(parentJoinKey ? (parentJoinKey + ".") : "") + joinKey].isSingle) {
              if (!grouped.some((groupedItem) => (
                ObjectUtil.equal(groupedItem.key, keyObj)
                && Object.keys(groupedItem.resultRecord).some((k) => k === joinKey)
              ))) {
                const sameKeyGroupedItem = grouped.single((groupedItem) => ObjectUtil.equal(groupedItem.key, keyObj));
                if (sameKeyGroupedItem) {
                  sameKeyGroupedItem.resultRecord[joinKey] = valueObj;
                }
                else {
                  grouped.push({ key: keyObj, resultRecord: { [joinKey]: valueObj } });
                }
              }
            }
            else {
              const keyObjJson = JsonConvert.stringify(keyObj);
              const values = groupedMultiRecord[joinKey + "_" + keyObjJson];
              if (values !== undefined) {
                values.push(valueObj);
              }
              else {
                const valueArr = [valueObj];

                const sameKeyGroupedItem = grouped.single((groupedItem) => ObjectUtil.equal(groupedItem.key, keyObj));
                if (sameKeyGroupedItem) {
                  sameKeyGroupedItem.resultRecord[joinKey] = valueArr;
                }
                else {
                  grouped.push({ key: keyObj, resultRecord: { [joinKey]: valueArr } });
                }
                groupedMultiRecord[joinKey + "_" + JsonConvert.stringify(keyObj)] = valueArr;
              }
            }
          }
        }

        const result = grouped.map((groupedItem) => {
          const item = { ...groupedItem.key };
          for (const joinKey of Object.keys(groupedItem.resultRecord)) {
            if (groupedItem.resultRecord[joinKey] instanceof Array) {
              item[joinKey] = groupedItem.resultRecord[joinKey]
                .filter((item1: any) => Object.keys(item1).filter((key) => item1[key].length > 0).length > 0)
                .distinct();
            }
            else {
              item[joinKey] = groupedItem.resultRecord[joinKey];
            }
          }

          return item;
        });

        for (const item of result) {
          for (const joinKey of joinKeys) {
            const childJoinKeys = Object.keys(option.joins!).filter((item1) => (
              item1.startsWith(joinKey + ".")
              && item1.split(".").length === joinKey.split(".").length + 1
            ));
            if (childJoinKeys.length > 0) {
              item[joinKey] = grouping(item[joinKey], (parentJoinKey ? (parentJoinKey + ".") : "") + joinKey, childJoinKeys);
            }
          }
        }

        return itemOrItems instanceof Array ? result : result[0];
      };


      const rootJoinKeys = Object.keys(option.joins).filter((item) => !item.includes("."));
      if (rootJoinKeys.length > 0) {
        return grouping(data, "", rootJoinKeys) as T[];
      }
    }

    return data;
  }
}