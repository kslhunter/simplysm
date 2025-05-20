import { DateOnly, DateTime, JsonConvert, Time, Type, Uuid } from "@simplysm/sd-core-common";
import { IQueryResultParseOption } from "../db-context-executor.types";
import { QueryUnit } from "../query/query-unit";
import { TEntity, TEntityValue } from "../query/queryable.types";
import { TQueryValue } from "../types";

export class SdOrmUtils {
  static replaceString(str: string) {
    return str.replace(/'/g, "''").replace(/\\/g, "\\\\");
  }

  static canConvertToQueryValue(value: any): value is TEntityValue<TQueryValue> {
    return (
      ["undefined", "boolean", "number", "string"].includes(typeof value) ||
      value instanceof QueryUnit ||
      value instanceof Number ||
      value instanceof String ||
      value instanceof Boolean ||
      value instanceof DateOnly ||
      value instanceof DateTime ||
      value instanceof Time ||
      value instanceof Uuid ||
      value instanceof Buffer
    );
  }

  static getQueryValueType<T extends TQueryValue>(value: TEntityValue<T>): Type<T> | undefined {
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

  static getQueryValueFields<T>(
    entity: TEntity<T>,
    availableDepth?: number,
  ): TEntityValue<any>[] {
    if (availableDepth !== undefined && availableDepth < 1) return [];

    return Object.values(entity).mapMany((item: any) => {
      if (SdOrmUtils.canConvertToQueryValue(item)) {
        return [item];
      }

      return SdOrmUtils.getQueryValueFields(
        item,
        availableDepth !== undefined ? availableDepth - 1 : undefined,
      );
    });
  }

  /*
  orgResults[]                IQueryResultParseOption
       │                             │
       ▼                             ▼
타입 파싱 (Date, Number 등)         조인 구조 해석
       │                             │
       └────┐                 ┌──────┘
            ▼                 ▼
     JOIN Key 기반 그룹핑 & 중첩화 (grouping + joinToObj)
            ▼
   isSingle 분기 → 단일/배열 분기 처리
            ▼
     재귀적으로 트리 구조 재조립 (doing)
            ▼
     최종 객체 트리 배열 반환 (T[])
   */
  static parseQueryResult<T>(orgResults: any[], option?: IQueryResultParseOption): T[] {
    // 타입 파싱
    const parseValue = (value: any, type?: string) => {
      if (value == null) return undefined;
      switch (type) {
        case "DateTime":
          return DateTime.parse(value);
        case "DateOnly":
          return DateOnly.parse(value);
        case "Time":
          return Time.parse(value);
        case "Uuid":
          return new Uuid(value);
        case "Boolean":
          return Boolean(value);
        case "Number":
          return Number.parseFloat(value);
        default:
          return value;
      }
    };

    // DATA 추출 타입 변환
    const data: Record<string, any>[] = orgResults.map((item) => {
      const obj: Record<string, any> = {};
      for (const key of Object.keys(item)) {
        if (item[key] == null) {
          obj[key] = undefined;
          continue;
        }

        obj[key] = parseValue(item[key], option?.columns?.[key]?.dataType);
      }
      if (Object.values(obj).every(item1 => item1 == null)) return undefined;

      return obj;
    }).filterExists();

    // 조인 구조 해석
    const allJoinInfos = option?.joins
      ? Object.keys(option.joins).map((key) => ({ key, isSingle: option.joins![key].isSingle }))
      : [];
    const rootJoinInfos = allJoinInfos.filter((item) => !item.key.includes("."));

    const getObjKeyString = (sourceItem: Record<string, any>): string => {
      const result: string[] = [];
      for (const sourceItemKey of Object.keys(sourceItem).orderBy()) {
        const sourceItemValue = sourceItem[sourceItemKey];
        if (
          ["undefined", "boolean", "number", "string"].includes(typeof sourceItemValue) ||
          sourceItemValue instanceof Number ||
          sourceItemValue instanceof String ||
          sourceItemValue instanceof Boolean ||
          sourceItemValue instanceof DateOnly ||
          sourceItemValue instanceof DateTime ||
          sourceItemValue instanceof Time ||
          sourceItemValue instanceof Uuid ||
          sourceItemValue instanceof Buffer
        ) {
          result.push(sourceItemKey + ":" + JsonConvert.stringify(sourceItemValue));
        }
        else {
          result.push(sourceItemKey + ":" + getObjKeyString(sourceItemValue));
        }
      }
      return "(" + result.join("|") + ")";
    };

    const getKeyObj = (
      sourceItem: Record<string, any>,
      joinKeys: string[],
    ): Record<string, any> => {
      const result: Record<string, any> = {};
      for (const sourceItemKey of Object.keys(sourceItem)) {
        if (joinKeys.some((joinKey) => sourceItemKey === joinKey || sourceItemKey.startsWith(
          joinKey + ".")))
          continue;
        result[sourceItemKey] = sourceItem[sourceItemKey];
      }
      return result;
    };

    const getObjOrUndefined = (sourceItem: Record<string, any> | undefined): Record<string, any> | undefined => {
      return (
        sourceItem === undefined ||
        Object.keys(sourceItem).every((key) => sourceItem[key] == null)
      ) ? undefined : sourceItem;
    };

    const joinToObj = (
      source: Record<string, any>[],
      joinKeys: string[],
    ): Record<string, any>[] => {
      const result: Record<string, any>[] = [];
      for (const sourceItem of source) {
        const resultItem: Record<string, any> = {};
        for (const sourceItemKey of Object.keys(sourceItem)) {
          for (const joinKey of joinKeys) {
            if (sourceItemKey.startsWith(joinKey + ".")) {
              resultItem[joinKey] = resultItem[joinKey] ?? {};
              resultItem[joinKey][sourceItemKey.slice(joinKey.length
                + 1)] = sourceItem[sourceItemKey];
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

    const grouping = (
      source: Record<string, any>[],
      joinKeys: string[],
    ): Record<string, any>[] => {
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

    const doing = (
      source: Record<string, any>[],
      joinInfos: { key: string; isSingle: boolean; }[],
      parentKey?: string,
    ): Record<string, any>[] => {
      const joinKeys = joinInfos.map((item) => item.key);
      const result = grouping(joinToObj(source, joinKeys), joinKeys);
      const finalResult: Record<string, any>[] = [];

      for (const resultItem of result) {
        let splitItems: Record<string, any>[] = [resultItem];

        for (const joinInfo of joinInfos) {
          const fullJoinKey = parentKey != null ? `${parentKey}.${joinInfo.key}` : joinInfo.key;
          const childJoinInfos = allJoinInfos
            .filter((item) =>
              item.key.startsWith(fullJoinKey + ".") &&
              !item.key.slice(fullJoinKey.length + 1).includes("."),
            )
            .map((item) => ({
              key: item.key.slice(fullJoinKey.length + 1),
              isSingle: item.isSingle,
            }));

          const tempSplitItems: Record<string, any>[] = [];

          for (const item of splitItems) {
            const joinValue = item[joinInfo.key];

            if (childJoinInfos.length > 0) {
              const childJoinValue = doing(joinValue, childJoinInfos, fullJoinKey);
              if (joinInfo.isSingle) {
                for (const val of childJoinValue) {
                  tempSplitItems.push({ ...item, [joinInfo.key]: val });
                }
              }
              else {
                item[joinInfo.key] = childJoinValue;
                tempSplitItems.push(item);
              }
            }
            else {
              if (joinInfo.isSingle && Array.isArray(joinValue)) {
                if (joinValue.length === 0) {
                  tempSplitItems.push({ ...item, [joinInfo.key]: undefined });
                }
                else {
                  for (const val of joinValue) {
                    tempSplitItems.push({ ...item, [joinInfo.key]: val });
                  }
                }
              }
              else {
                // 그대로 유지
                tempSplitItems.push(item);
              }
            }
          }

          splitItems = tempSplitItems;
        }

        finalResult.push(...splitItems);
      }

      return finalResult;
    };

    if (rootJoinInfos.length > 0) {
      return doing(data, rootJoinInfos) as any[];
    }

    return data as any[];
  }
}
