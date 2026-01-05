import { DateOnly, DateTime, Time, Uuid, JsonConvert } from "@simplysm/sd-core-common";
import { IQueryResultParseOption } from "../query/query-def";

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

/**
 * 쿼리 결과를 파싱하여 중첩 객체 구조로 변환
 * 주기적으로 이벤트 루프에 양보하여 ping/pong 처리 가능
 */
export async function parseQueryResult<T>(
  orgResults: any[],
  option?: IQueryResultParseOption,
  yieldInterval = 50,
): Promise<T[]> {
  let processedCount = 0;
  const maybeYield = async () => {
    processedCount++;
    if (processedCount % yieldInterval === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  };

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
  const flatData = orgResults.flat();
  const data: Record<string, any>[] = [];
  for (const item of flatData) {
    const obj: Record<string, any> = {};
    for (const key of Object.keys(item)) {
      if (item[key] == null) {
        obj[key] = undefined;
        continue;
      }
      obj[key] = parseValue(item[key], option?.columns?.[key]?.dataType);
    }
    if (!Object.values(obj).every((item1) => item1 == null)) {
      data.push(obj);
    }
    await maybeYield();
  }

  // 조인 구조 해석
  const allJoinInfos = option?.joins
    ? Object.keys(option.joins).map((key) => ({ key, isSingle: option.joins![key].isSingle }))
    : [];
  const rootJoinInfos = allJoinInfos.filter((item) => !item.key.includes("."));

  const getObjKeyString = (sourceItem: Record<string, any>): string => {
    const result: string[] = [];
    for (const sourceItemKey of Object.keys(sourceItem).sort()) {
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
      } else {
        result.push(sourceItemKey + ":" + getObjKeyString(sourceItemValue));
      }
    }
    return "(" + result.join("|") + ")";
  };

  const getKeyObj = (sourceItem: Record<string, any>, joinKeys: string[]): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const sourceItemKey of Object.keys(sourceItem)) {
      if (
        joinKeys.some(
          (joinKey) => sourceItemKey === joinKey || sourceItemKey.startsWith(joinKey + "."),
        )
      )
        continue;
      result[sourceItemKey] = sourceItem[sourceItemKey];
    }
    return result;
  };

  const getObjOrUndefined = (
    sourceItem: Record<string, any> | undefined,
  ): Record<string, any> | undefined => {
    return sourceItem == null || Object.keys(sourceItem).every((key) => sourceItem[key] == null)
      ? undefined
      : sourceItem;
  };

  const joinToObj = (source: Record<string, any>[], joinKeys: string[]): Record<string, any>[] => {
    const result: Record<string, any>[] = [];
    for (const sourceItem of source) {
      const resultItem: Record<string, any> = {};
      for (const sourceItemKey of Object.keys(sourceItem)) {
        for (const joinKey of joinKeys) {
          if (sourceItemKey.startsWith(joinKey + ".")) {
            resultItem[joinKey] = resultItem[joinKey] ?? {};
            resultItem[joinKey][sourceItemKey.slice(joinKey.length + 1)] =
              sourceItem[sourceItemKey];
          } else {
            resultItem[sourceItemKey] = sourceItem[sourceItemKey];
          }
        }
      }
      result.push(resultItem);
    }
    return result;
  };

  const grouping = async (
    source: Record<string, any>[],
    joinKeys: string[],
  ): Promise<Record<string, any>[]> => {
    // groupedKey -> { keyObj, joinKey -> Map<itemKey, item> }
    const result = new Map<
      string,
      { keyObj: Record<string, any>; joinMaps: Map<string, Map<string, Record<string, any>>> }
    >();

    for (const sourceItem of source) {
      const groupedKeyObj = getKeyObj(sourceItem, joinKeys);
      const groupedKey = getObjKeyString(groupedKeyObj);

      let groupedData = result.get(groupedKey);
      if (!groupedData) {
        groupedData = {
          keyObj: groupedKeyObj,
          joinMaps: new Map(joinKeys.map((jk) => [jk, new Map()])),
        };
        result.set(groupedKey, groupedData);
      }

      for (const joinKey of joinKeys) {
        const sourceItemValue = getObjOrUndefined(sourceItem[joinKey]);
        if (sourceItemValue) {
          const itemKey = getObjKeyString(sourceItemValue);
          const joinMap = groupedData.joinMaps.get(joinKey)!;
          if (!joinMap.has(itemKey)) {
            joinMap.set(itemKey, sourceItemValue);
          }
        }
      }

      await maybeYield();
    }

    const resultArr: Record<string, any>[] = [];
    for (const groupedData of result.values()) {
      const item: Record<string, any> = { ...groupedData.keyObj };
      for (const joinKey of joinKeys) {
        item[joinKey] = Array.from(groupedData.joinMaps.get(joinKey)!.values());
      }
      resultArr.push(item);
    }

    return resultArr;
  };

  const doing = async (
    source: Record<string, any>[],
    joinInfos: { key: string; isSingle: boolean }[],
    parentKey?: string,
  ): Promise<Record<string, any>[]> => {
    if (source.length === 0) return [];

    const joinKeys = joinInfos.map((info) => info.key);
    const grouped = await grouping(joinToObj(source, joinKeys), joinKeys);

    const results: Record<string, any>[] = [];

    for (const groupedItem of grouped) {
      let workingSet: Record<string, any>[] = [{ ...groupedItem }];

      for (const joinInfo of joinInfos) {
        const fullJoinKey = parentKey != null ? `${parentKey}.${joinInfo.key}` : joinInfo.key;
        const rawJoinItems = groupedItem[joinInfo.key];

        const childJoinInfos = allJoinInfos
          .filter(
            (info) =>
              info.key.startsWith(fullJoinKey + ".") &&
              !info.key.slice(fullJoinKey.length + 1).includes("."),
          )
          .map((info) => ({
            key: info.key.slice(fullJoinKey.length + 1),
            isSingle: info.isSingle,
          }));

        let parsedJoinValues: any[];

        if (childJoinInfos.length > 0) {
          parsedJoinValues = await doing(rawJoinItems, childJoinInfos, fullJoinKey);
        } else {
          parsedJoinValues = rawJoinItems;
        }

        if (joinInfo.isSingle) {
          if (parsedJoinValues.length === 0) {
            workingSet = workingSet.map((item) => {
              const rest: Record<string, any> = {};
              for (const key of Object.keys(item)) {
                if (key !== joinInfo.key) {
                  rest[key] = item[key];
                }
              }
              return rest;
            });
          } else if (parsedJoinValues.length === 1) {
            workingSet = workingSet.map((item) => ({
              ...item,
              [joinInfo.key]: parsedJoinValues[0],
            }));
          } else {
            const newSet: Record<string, any>[] = [];
            for (const item of workingSet) {
              for (const val of parsedJoinValues) {
                newSet.push({
                  ...item,
                  [joinInfo.key]: val,
                });
              }
            }
            workingSet = newSet;
          }
        } else {
          workingSet = workingSet.map((item) => ({
            ...item,
            [joinInfo.key]: parsedJoinValues,
          }));
        }
      }

      results.push(...workingSet);
      await maybeYield();
    }

    return results;
  };

  if (rootJoinInfos.length > 0) {
    return (await doing(data, rootJoinInfos)) as any[];
  }

  return data as any[];
}
