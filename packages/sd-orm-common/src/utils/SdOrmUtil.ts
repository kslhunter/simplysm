import { IQueryResultParseOption, TEntity, TEntityValue, TQueryValue } from "../commons";
import { DateOnly, DateTime, JsonConvert, Time, Type, Uuid } from "@simplysm/sd-core-common";
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
    const data: Record<string, any>[] = orgResults.map((item) => {
      const obj: Record<string, any> = {};
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
    const allJoinInfos = option?.joins ? Object.keys(option.joins).map((key) => ({
      key,
      isSingle: option.joins![key].isSingle
    })) : [];
    const rootJoinInfos = allJoinInfos.filter((item) => !item.key.includes("."));
    if (rootJoinInfos.length > 0) {
      const getObjKeyString = (sourceItem: Record<string, any>): string => {
        const result: string[] = [];
        for (const sourceItemKey of Object.keys(sourceItem).orderBy()) {
          const sourceItemValue = sourceItem[sourceItemKey];
          if (
            ["undefined", "boolean", "number", "string"].includes(typeof sourceItemValue)
            || sourceItemValue instanceof Number
            || sourceItemValue instanceof String
            || sourceItemValue instanceof Boolean
            || sourceItemValue instanceof DateOnly
            || sourceItemValue instanceof DateTime
            || sourceItemValue instanceof Time
            || sourceItemValue instanceof Uuid
            || sourceItemValue instanceof Buffer
          ) {
            result.push(sourceItemKey + ":" + JsonConvert.stringify(sourceItemValue));
          }
          else {
            result.push(sourceItemKey + ":" + getObjKeyString(sourceItemValue));
          }
        }
        return "(" + result.join("|") + ")";
      };

      const getKeyObj = (sourceItem: Record<string, any>, joinKeys: string[]): Record<string, any> => {
        const result: Record<string, any> = {};
        for (const sourceItemKey of Object.keys(sourceItem)) {
          if (joinKeys.some((joinKey) => sourceItemKey.startsWith(joinKey))) continue;
          result[sourceItemKey] = sourceItem[sourceItemKey];
        }
        return result;
      };

      const getObjOrUndefined = (sourceItem: Record<string, any> | undefined): Record<string, any> | undefined => {
        return sourceItem === undefined || Object.keys(sourceItem).every((key) => sourceItem[key] === undefined) ? undefined : sourceItem;
      };

      const joinToObj = (source: Record<string, any>[], joinKeys: string[]): Record<string, any>[] => {
        const result: Record<string, any>[] = [];
        for (const sourceItem of source) {
          const resultItem: Record<string, any> = {};
          for (const sourceItemKey of Object.keys(sourceItem)) {
            for (const joinKey of joinKeys) {
              if (sourceItemKey.startsWith(joinKey + ".")) {
                resultItem[joinKey] = resultItem[joinKey] ?? {};
                resultItem[joinKey][sourceItemKey.slice(joinKey.length + 1)] = sourceItem[sourceItemKey];
              }
              else {
                resultItem[sourceItemKey] = sourceItem[sourceItemKey];
              }
            }
          }
          result.push(resultItem);
        }

        return result;
      };

      const grouping = (source: Record<string, any>[], joinKeys: string[]): Record<string, any>[] => {
        const result = new Map<string, Record<string, any>>();
        for (const sourceItem of source) {
          const groupedKeyObj = getKeyObj(sourceItem, joinKeys);
          const groupedKey = getObjKeyString(groupedKeyObj);
          if (result.has(groupedKey)) {
            const groupedItem = result.get(groupedKey)!;
            for (const joinKey of joinKeys) {
              const sourceItemValue = getObjOrUndefined(sourceItem[joinKey]);
              if (sourceItemValue) {
                groupedItem[joinKey].push(sourceItemValue);
              }
            }
          }
          else {
            const newGroupedItem: Record<string, any> = { ...groupedKeyObj };
            for (const joinKey of joinKeys) {
              const sourceItemValue = getObjOrUndefined(sourceItem[joinKey]);
              newGroupedItem[joinKey] = sourceItemValue ? [sourceItemValue] : [];
            }
            result.set(groupedKey, newGroupedItem);
          }
        }

        for (const resultItem of result.values()) {
          for (const joinKey of joinKeys) {
            resultItem[joinKey].distinctThis();
          }
        }

        return Array.from(result.values());
      };

      const doing = (source: Record<string, any>[], joinInfos: { key: string; isSingle: boolean }[], parentKey?: string): Record<string, any>[] => {
        const joinKeys = joinInfos.map((item) => item.key);
        const result = grouping(joinToObj(source, joinKeys), joinKeys);
        for (const resultItem of result) {
          for (const joinInfo of joinInfos) {
            const fullJoinKey = (parentKey !== undefined ? parentKey + "." : "") + joinInfo.key;
            const childJoinInfos = allJoinInfos
              .filter((item) => item.key.startsWith(fullJoinKey + ".") && !item.key.slice(fullJoinKey.length + 1).includes("."))
              .map((item) => ({
                key: item.key.slice(fullJoinKey.length + 1),
                isSingle: item.isSingle
              }));
            const joinValue = resultItem[joinInfo.key];
            if (childJoinInfos.length > 0) {
              const childJoinValue = doing(joinValue, childJoinInfos);
              if (joinInfo.isSingle) {
                if (childJoinValue.length > 1) {
                  throw new Error("중복");
                }
                else {
                  resultItem[joinInfo.key] = childJoinValue[0];
                }
              }
              else {
                resultItem[joinInfo.key] = childJoinValue;
              }
            }
            else {
              if (joinInfo.isSingle) {
                if (joinValue.length > 1) {
                  throw new Error("중복");
                }
                else {
                  resultItem[joinInfo.key] = joinValue[0];
                }
              }
              else {
                resultItem[joinInfo.key] = joinValue;
              }
            }
          }
        }

        return result;
      };

      return doing(data, rootJoinInfos) as any[];
    }

    return data as any[];
  }
}
