import { bytesFromHex, DateOnly, DateTime, objEqual, Time, Uuid } from "@simplysm/core-common";
import type { ColumnPrimitiveStr } from "../types/column";
import type { ResultMeta } from "../types/db";

declare function setImmediate(callback: () => void): void;

// ============================================
// Type Parsers
// ============================================

/**
 * 값을 지정된 타입으로 Parse
 *
 * @param value - Parse할 value
 * @param type - 대상 type (ColumnPrimitiveStr)
 * @returns Parse된 value
 * @throws Parse 실패 시 Error
 */
function parseValue(value: unknown, type: ColumnPrimitiveStr): unknown {
  // null/undefined는 그대로 return (호출부에서 key Remove Process)
  if (value == null) {
    return undefined;
  }

  switch (type) {
    case "number": {
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new Error(`number Parse 실패: ${String(value)}`);
      }
      return num;
    }

    case "string":
      return String(value);

    case "boolean":
      // 0, 1, "0", "1", true, false 등 처리
      if (value === 0 || value === "0" || value === false) return false;
      if (value === 1 || value === "1" || value === true) return true;
      return Boolean(value);

    case "DateTime":
      return DateTime.parse(value as string);

    case "DateOnly":
      return DateOnly.parse(value as string);

    case "Time":
      return Time.parse(value as string);

    case "Uuid":
      if (value instanceof Uint8Array) return Uuid.fromBytes(value);
      return new Uuid(value as string);

    case "Bytes":
      if (value instanceof Uint8Array) return value;
      if (typeof value === "string") return bytesFromHex(value);
      throw new Error(`Bytes Parse 실패: ${typeof value}`);
  }
}

// ============================================
// Grouping Utilities
// ============================================

/**
 * flat 레코드를 중첩 객체로 Transform
 *
 * @example
 * { "posts.id": 1, "posts.title": "Hi" } → { posts: { id: 1, title: "Hi" } }
 */
function flatToNested(
  record: Record<string, unknown>,
  columns: Record<string, ColumnPrimitiveStr>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, type] of Object.entries(columns)) {
    const rawValue = record[key];
    const parsedValue = parseValue(rawValue, type);

    // undefined는 key 자체를 추가하지 않음
    if (parsedValue === undefined) continue;

    if (key.includes(".")) {
      // 중첩 key: "posts.id" → { posts: { id: ... } }
      const parts = key.split(".");
      let current = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] == null) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
      current[parts[parts.length - 1]] = parsedValue;
    } else {
      // 단순 key
      result[key] = parsedValue;
    }
  }

  return result;
}

/**
 * 객체가 비어있는지 확인 (모든 값이 undefined)
 */
function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

// ============================================
// Main Function
// ============================================

/** yield 간격: N개 처리마다 이벤트 루프 양보 */
const YIELD_INTERVAL = 100;

/** 이벤트 루프 양보: Node.js에서는 setImmediate, 브라우저에서는 setTimeout 폴백 */
const yieldToEventLoop: () => Promise<void> =
  typeof setImmediate !== "undefined"
    ? () => new Promise<void>((resolve) => setImmediate(resolve))
    : () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * DB Query result를 ResultMeta를 통해 TypeScript 객체로 Transform
 *
 * @param rawResults - DB에서 받은 raw result array
 * @param meta - Type Transform 및 JOIN structure information (required)
 * @returns type Transform 및 중첩화된 result array. 입력이 비거나 유효한 결과가 없으면 undefined
 * @throws type Parse 실패 시 Error
 *
 * @remarks
 * - meta required: meta가 없으면 이 함수를 호출할 필요 없음 (입력 = Output)
 * - async only: 대용량 처리 시 외부 인터럽트를 위해 synchronous 버전 미제공
 * - browser/node 모두 지원: setTimeout(resolve, 0)으로 yield
 * - 빈 result 처리: 입력 배열이 비거나, Parse 후 모든 레코드가 빈 객체인 경우 undefined return
 *
 * @example
 * ```typescript
 * // 1. 단순 type Parse
 * const raw = [{ id: "1", createdAt: "2026-01-07T10:00:00.000Z" }];
 * const meta = { columns: { id: "number", createdAt: "DateTime" }, joins: {} };
 * const result = await parseQueryResult(raw, meta);
 * // [{ id: 1, createdAt: DateTime(...) }]
 *
 * // 2. JOIN result 중첩화
 * const raw = [
 *   { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" },
 *   { id: 1, name: "User1", "posts.id": 11, "posts.title": "Post2" },
 * ];
 * const meta = {
 *   columns: { id: "number", name: "string", "posts.id": "number", "posts.title": "string" },
 *   joins: { posts: { isSingle: false } }
 * };
 * const result = await parseQueryResult(raw, meta);
 * // [{ id: 1, name: "User1", posts: [{ id: 10, title: "Post1" }, { id: 11, title: "Post2" }] }]
 * ```
 */
export async function parseQueryResult<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined> {
  // 빈 입력 처리
  if (rawResults.length === 0) {
    return undefined;
  }

  const joinKeys = Object.keys(meta.joins);

  // JOIN이 없는 경우: 단순 type Parse만
  if (joinKeys.length === 0) {
    return parseSimpleRecords<TRecord>(rawResults, meta.columns);
  }

  // JOIN이 있는 경우: grouping + 중첩화
  return parseJoinedRecords<TRecord>(rawResults, meta);
}

/**
 * JOIN 없는 단순 레코드 Parse
 */
async function parseSimpleRecords<TRecord>(
  rawResults: Record<string, unknown>[],
  columns: Record<string, ColumnPrimitiveStr>,
): Promise<TRecord[] | undefined> {
  const results: Record<string, unknown>[] = [];

  for (let i = 0; i < rawResults.length; i++) {
    // yield 처리
    if (i > 0 && i % YIELD_INTERVAL === 0) {
      await yieldToEventLoop();
    }

    const parsed = flatToNested(rawResults[i], columns);

    // 빈 객체는 exclude
    if (!isEmptyObject(parsed)) {
      results.push(parsed);
    }
  }

  // 빈 배열은 undefined return
  return results.length > 0 ? (results as TRecord[]) : undefined;
}

/**
 * JOIN 키를 깊이 순으로 sorting (얕은 것 먼저)
 * "posts" (1) < "posts.comments" (2)
 */
function sortJoinKeysByDepth(joinKeys: string[]): string[] {
  return [...joinKeys].sort((a, b) => {
    const depthA = a.split(".").length;
    const depthB = b.split(".").length;
    return depthA - depthB; // 얕은 것 먼저
  });
}

/**
 * JOIN 있는 레코드 Parse (재귀적 grouping)
 */
async function parseJoinedRecords<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined> {
  // 1. 모든 레코드를 중첩 structure로 Transform
  const nestedRecords: Record<string, unknown>[] = [];
  for (let i = 0; i < rawResults.length; i++) {
    if (i > 0 && i % YIELD_INTERVAL === 0) {
      await yieldToEventLoop();
    }
    nestedRecords.push(flatToNested(rawResults[i], meta.columns));
  }

  // 2. JOIN 키를 깊이 순으로 sorting (얕은 것 먼저)
  const sortedJoinKeys = sortJoinKeysByDepth(Object.keys(meta.joins));

  // 3. 루트 레벨부터 재귀적으로 grouping
  const results = groupRecordsRecursively(nestedRecords, sortedJoinKeys, meta.joins, "");

  // 4. 빈 result filtering
  const filteredResults = results.filter((r) => !isEmptyObject(r));

  return filteredResults.length > 0 ? (filteredResults as TRecord[]) : undefined;
}

/**
 * 그룹 키를 문자열로 serialize (Map 키로 사용)
 *
 * JSON.stringify보다 빠른 커스텀 serialize
 */
function serializeGroupKey(groupKey: Record<string, unknown>, cachedKeyOrder?: string[]): string {
  const keys = cachedKeyOrder ?? Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
  return keys.map((k) => `${k}:${groupKey[k] === null ? "null" : String(groupKey[k])}`).join("|");
}

/**
 * 현재 경로에 해당하는 레코드들을 재귀적으로 grouping
 *
 * Map 기반 그룹핑으로 O(n) 복잡도 달성
 *
 * @param records - Group핑할 레코드 array
 * @param allJoinKeys - 모든 JOIN key (깊이 순 정렬됨)
 * @param joinsConfig - JOIN 설정
 * @param currentPath - 현재 경로 (예: "", "posts", "posts.comments")
 */
function groupRecordsRecursively(
  records: Record<string, unknown>[],
  allJoinKeys: string[],
  joinsConfig: Record<string, { isSingle: boolean }>,
  currentPath: string,
): Record<string, unknown>[] {
  // 현재 경로에 직접 해당하는 JOIN 키들 찾기
  // 예: currentPath="" → ["posts", "company"]
  // 예: currentPath="posts" → ["posts.comments"]
  const childJoinKeys = allJoinKeys.filter((key) => {
    if (currentPath === "") {
      // 루트 레벨: . 없는 키들
      return !key.includes(".");
    } else {
      // 하위 레벨: 현재 경로 + "." + key
      return (
        key.startsWith(currentPath + ".") && key.slice(currentPath.length + 1).indexOf(".") === -1
      );
    }
  });

  if (childJoinKeys.length === 0) {
    // 더 이상 그룹핑할 JOIN이 없음
    return records;
  }

  // Map 기반 grouping (O(n) 복잡도)
  const groupMap = new Map<string, Record<string, unknown>>();

  // key order Caching (첫 번째 레코드에서 결정 후 재사용)
  let groupKeyOrder: string[] | undefined;

  for (const record of records) {
    // 그룹 key 추출 및 serialize (JOIN key exclude)
    const groupKey = extractGroupKey(record, childJoinKeys);
    if (groupKeyOrder == null) {
      groupKeyOrder = Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
    }
    const keyStr = serializeGroupKey(groupKey, groupKeyOrder);

    const existingGroup = groupMap.get(keyStr);

    if (existingGroup != null) {
      // 기존 그룹에 JOIN data merge
      for (const joinKey of childJoinKeys) {
        const localKey = currentPath === "" ? joinKey : joinKey.slice(currentPath.length + 1);
        mergeJoinData(existingGroup, record, localKey, joinsConfig[joinKey].isSingle);
      }
    } else {
      // 새 그룹 Generate
      const newGroup = { ...record };

      // 각 JOIN 키를 array 또는 단일 객체로 Initialize
      for (const joinKey of childJoinKeys) {
        const localKey = currentPath === "" ? joinKey : joinKey.slice(currentPath.length + 1);
        const joinData = newGroup[localKey] as Record<string, unknown> | undefined;

        if (joinData != null && !isEmptyObject(joinData)) {
          if (!joinsConfig[joinKey].isSingle) {
            // 배열로 Transform
            newGroup[localKey] = [joinData];
          }
        } else {
          // 빈 data면 key Delete
          delete newGroup[localKey];
        }
      }

      groupMap.set(keyStr, newGroup);
    }
  }

  // Map에서 배열로 Transform
  const grouped = Array.from(groupMap.values());

  // 각 JOIN의 하위 레벨도 재귀적으로 처리
  for (const group of grouped) {
    for (const joinKey of childJoinKeys) {
      const localKey = currentPath === "" ? joinKey : joinKey.slice(currentPath.length + 1);
      const joinData = group[localKey];

      if (Array.isArray(joinData) && joinData.length > 0) {
        // 배열인 경우: 하위 레벨 recursive 처리
        group[localKey] = groupRecordsRecursively(
          joinData as Record<string, unknown>[],
          allJoinKeys,
          joinsConfig,
          joinKey,
        );
      } else if (joinData != null && typeof joinData === "object" && !Array.isArray(joinData)) {
        // 단일 객체인 경우 (isSingle: true)
        const processed = groupRecordsRecursively(
          [joinData as Record<string, unknown>],
          allJoinKeys,
          joinsConfig,
          joinKey,
        );
        if (processed.length > 0) {
          group[localKey] = processed[0];
        }
      }
    }
  }

  // __hashSet__ 내부 property Remove (중복 체크용 임시 Property)
  for (const group of grouped) {
    for (const key of Object.keys(group)) {
      if (key.startsWith("__hashSet__")) {
        delete group[key];
      }
    }
  }

  return grouped;
}

/**
 * 레코드에서 JOIN 키를 제외한 그룹 key 추출
 */
function extractGroupKey(
  record: Record<string, unknown>,
  joinKeys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    // JOIN 키가 아닌 것만 include
    if (!joinKeys.some((jk) => jk === key || jk.startsWith(key + "."))) {
      // object/배열이 아닌 primitive 값만 그룹 키로 사용
      if (value == null || typeof value !== "object") {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * JOIN data를 기존 그룹에 merge
 */
function mergeJoinData(
  existingGroup: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  localKey: string,
  isSingle: boolean,
): void {
  const newJoinData = newRecord[localKey] as Record<string, unknown> | undefined;

  if (newJoinData == null || isEmptyObject(newJoinData)) {
    return; // 병합할 data 없음
  }

  const existingJoinData = existingGroup[localKey];

  if (isSingle) {
    // isSingle: true인데 이미 data가 있고 다른 값이면 에러
    if (existingJoinData != null) {
      if (!objEqual(existingJoinData as Record<string, unknown>, newJoinData)) {
        throw new Error(`isSingle relationship '${localKey}'에 여러 개의 다른 결과가 존재합니다.`);
      }
    } else {
      existingGroup[localKey] = newJoinData;
    }
  } else {
    // isSingle: false → 배열에 Add
    const hashSetKey = `__hashSet__${localKey}`;
    if (!Array.isArray(existingJoinData)) {
      existingGroup[localKey] = [newJoinData];
      // Set 기반 해시 중복 체크를 위한 내부 property Initialize
      existingGroup[hashSetKey] = new Set([serializeGroupKey(newJoinData)]);
    } else {
      // Set 기반 중복 체크 (O(1))
      const hashSet = existingGroup[hashSetKey] as Set<string> | undefined;
      const newHash = serializeGroupKey(newJoinData);
      if (hashSet != null) {
        if (!hashSet.has(newHash)) {
          hashSet.add(newHash);
          existingJoinData.push(newJoinData);
        }
      } else {
        // hashSet이 없으면 폴백 (기존 방식)
        const isDuplicate = existingJoinData.some((item) =>
          objEqual(item as Record<string, unknown>, newJoinData),
        );
        if (!isDuplicate) {
          existingJoinData.push(newJoinData);
        }
      }
    }
  }
}
