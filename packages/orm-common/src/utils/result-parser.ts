import { bytes, obj, DateOnly, DateTime, Time, Uuid } from "@simplysm/core-common";
import type { ColumnPrimitiveStr } from "../types/column";
import type { ResultMeta } from "../types/db";

declare function setImmediate(callback: () => void): void;

// ============================================
// 타입 파서
// ============================================

/**
 * 값을 지정된 타입으로 파싱
 *
 * @param value - 파싱할 값
 * @param type - 대상 타입 (ColumnPrimitiveStr)
 * @returns 파싱된 값
 * @throws 파싱 실패 시 Error
 */
function parseValue(value: unknown, type: ColumnPrimitiveStr): unknown {
  // undefined는 key 제거 대상으로 남기고, null은 SQL 결과값으로 보존한다.
  if (value == null) {
    return value;
  }

  switch (type) {
    case "number": {
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new Error(`숫자 파싱 실패: ${String(value)}`);
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
      if (typeof value === "string") return bytes.fromHex(value);
      throw new Error(`Bytes 파싱 실패: ${typeof value}`);
  }
}

// ============================================
// 그룹핑 유틸리티
// ============================================

/** flatToNested용 사전 계산된 column 메타데이터 */
interface ColumnInfo {
  key: string;
  type: ColumnPrimitiveStr;
  parts: string[] | undefined; // 단순 key는 undefined, 중첩 key는 string[]
}

/** 고유한 columns 객체마다 column 정보를 한 번만 사전 계산 */
function buildColumnInfos(columns: Record<string, ColumnPrimitiveStr>): ColumnInfo[] {
  return Object.entries(columns).map(([key, type]) => ({
    key,
    type,
    parts: key.includes(".") ? key.split(".") : undefined,
  }));
}

/**
 * 플랫 레코드를 중첩 객체로 변환
 */
function flatToNested(
  record: Record<string, unknown>,
  columnInfos: ColumnInfo[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const { key, type, parts } of columnInfos) {
    const rawValue = record[key];
    if (typeof rawValue === "undefined") continue;
    const parsedValue = parseValue(rawValue, type);

    if (parts != null) {
      // 중첩 key: "posts.id" → { posts: { id: ... } }
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
function isEmptyObject(record: Record<string, unknown>): boolean {
  return Object.keys(record).length === 0;
}

/**
 * JOIN 결과 객체가 실질적으로 비어있는지 확인
 *
 * 모든 값이 null/undefined 이거나, 중첩 객체도 재귀적으로 비어있으면 비어있는 JOIN으로 간주한다.
 */
function isEmptyJoinObject(record: Record<string, unknown>): boolean {
  const entries = Object.entries(record);
  if (entries.length === 0) {
    return true;
  }

  for (const [, value] of entries) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        return false;
      }
      continue;
    }

    if (typeof value === "object") {
      if (!isEmptyJoinObject(value as Record<string, unknown>)) {
        return false;
      }
      continue;
    }

    return false;
  }

  return true;
}

// ============================================
// 메인 함수
// ============================================

/** 양보 간격: N개 레코드마다 이벤트 루프에 양보 */
const YIELD_INTERVAL = 100;

/** 이벤트 루프 양보: Node.js는 setImmediate, 브라우저는 setTimeout 폴백 */
const yieldToEventLoop: () => Promise<void> =
  typeof setImmediate !== "undefined"
    ? () => new Promise<void>((resolve) => setImmediate(resolve))
    : () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * ResultMeta를 통해 DB 쿼리 결과를 TypeScript 객체로 변환
 *
 * @param rawResults - 데이터베이스에서 반환된 원시 결과 배열
 * @param meta - 타입 변환 및 JOIN 구조 정보 (필수)
 * @returns 타입 변환 및 중첩된 결과 배열. 입력이 비어있거나 유효한 결과가 없으면 undefined 반환
 * @throws 타입 파싱 실패 시 Error
 *
 * @remarks
 * - meta 필수: meta 없이는 이 함수를 호출할 필요 없음 (입력 = 출력)
 * - async 전용: 대규모 처리 시 외부 인터럽트 허용을 위해 동기 버전 미제공
 * - 브라우저/Node 호환: setTimeout(resolve, 0)으로 양보
 * - 빈 결과 처리: 입력 배열이 비어있거나 파싱 후 모든 레코드가 빈 객체이면 undefined 반환
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

  // JOIN 없음: 단순 타입 파싱만 수행
  if (joinKeys.length === 0) {
    return parseSimpleRecords<TRecord>(rawResults, meta.columns);
  }

  // JOIN 있음: 그룹핑 + 중첩
  return parseJoinedRecords<TRecord>(rawResults, meta);
}

/**
 * JOIN이 없는 단순 레코드 파싱
 */
async function parseSimpleRecords<TRecord>(
  rawResults: Record<string, unknown>[],
  columns: Record<string, ColumnPrimitiveStr>,
): Promise<TRecord[] | undefined> {
  const columnInfos = buildColumnInfos(columns);
  const results: Record<string, unknown>[] = [];

  for (let i = 0; i < rawResults.length; i++) {
    // 이벤트 루프에 양보
    if (i > 0 && i % YIELD_INTERVAL === 0) {
      await yieldToEventLoop();
    }

    const parsed = flatToNested(rawResults[i], columnInfos);

    // 빈 객체 제외
    if (!isEmptyObject(parsed)) {
      results.push(parsed);
    }
  }

  // 빈 배열은 undefined 반환
  return results.length > 0 ? (results as TRecord[]) : undefined;
}

/**
 * JOIN key를 깊이순으로 정렬 (얕은 것 우선)
 * "posts" (1) < "posts.comments" (2)
 */
function sortJoinKeysByDepth(joinKeys: string[]): string[] {
  return [...joinKeys].sort((a, b) => {
    const depthA = a.split(".").length;
    const depthB = b.split(".").length;
    return depthA - depthB; // 얕은 것 우선
  });
}

/**
 * JOIN이 있는 레코드 파싱 (재귀 그룹핑)
 */
async function parseJoinedRecords<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined> {
  // 1. 모든 레코드를 중첩 구조로 변환
  const columnInfos = buildColumnInfos(meta.columns);
  const nestedRecords: Record<string, unknown>[] = [];
  for (let i = 0; i < rawResults.length; i++) {
    if (i > 0 && i % YIELD_INTERVAL === 0) {
      await yieldToEventLoop();
    }
    nestedRecords.push(flatToNested(rawResults[i], columnInfos));
  }

  // 2. JOIN key를 깊이순으로 정렬 (얕은 것 우선)
  const sortedJoinKeys = sortJoinKeysByDepth(Object.keys(meta.joins));

  // 3. 루트 레벨부터 재귀적으로 그룹핑
  const results = groupRecordsRecursively(nestedRecords, sortedJoinKeys, meta.joins, "");

  // 4. 빈 결과 필터링
  const filteredResults = results.filter((r) => !isEmptyObject(r));

  return filteredResults.length > 0 ? (filteredResults as TRecord[]) : undefined;
}

/**
 * 그룹 key를 문자열로 직렬화 (Map key로 사용)
 *
 * length-prefixed 인코딩으로 값 내부의 구분자 문자 충돌을 방지한다.
 * null/undefined와 문자열 "null"/"undefined"도 구분된다.
 * 객체 타입 값(하위 JOIN 데이터)은 직렬화에서 제외한다.
 */
function serializeGroupKey(groupKey: Record<string, unknown>, cachedKeyOrder?: string[]): string {
  const keys = cachedKeyOrder ?? Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
  let result = "";
  for (const key of keys) {
    const v = groupKey[key];
    result += key.length.toString();
    result += ":";
    result += key;
    if (v == null) {
      result += "N;";
    } else if (typeof v === "object") {
      result += "O;";
    } else {
      const str = String(v);
      result += str.length.toString();
      result += ":";
      result += str;
      result += ";";
    }
  }
  return result;
}

/**
 * 현재 경로에 대해 레코드를 재귀적으로 그룹핑
 *
 * Map 기반 그룹핑으로 O(n) 복잡도 달성
 *
 * @param records - 그룹핑할 레코드 배열
 * @param allJoinKeys - 모든 JOIN key (깊이순 정렬)
 * @param joinsConfig - JOIN 설정
 * @param currentPath - 현재 경로 (예: "", "posts", "posts.comments")
 */
function groupRecordsRecursively(
  records: Record<string, unknown>[],
  allJoinKeys: string[],
  joinsConfig: Record<string, { isSingle: boolean }>,
  currentPath: string,
): Record<string, unknown>[] {
  // 현재 경로에 직접 대응하는 JOIN key 찾기
  // 예: currentPath="" → ["posts", "company"]
  // 예: currentPath="posts" → ["posts.comments"]
  const childJoinKeys = allJoinKeys.filter((key) => {
    if (currentPath === "") {
      // 루트 레벨: 점이 없는 key
      return !key.includes(".");
    } else {
      // 하위 레벨: 현재 경로 + "." + key
      return (
        key.startsWith(currentPath + ".") && key.slice(currentPath.length + 1).indexOf(".") === -1
      );
    }
  });

  if (childJoinKeys.length === 0) {
    // 더 이상 그룹핑할 JOIN 없음
    return records;
  }

  // Map 기반 그룹핑 (O(n) 복잡도)
  const groupMap = new Map<string, Record<string, unknown>>();
  // 중복 검사용 hashSet을 데이터 객체와 분리 (DESIGN-003)
  const hashSetsMap = new Map<string, Record<string, Set<string>>>();

  // O(1) 조회를 위한 JOIN key 제외 집합 사전 계산
  const joinKeyExclusions = buildJoinKeyExclusionSet(childJoinKeys);

  // Key 순서 캐싱 (첫 번째 레코드에서 결정 후 재사용)
  let groupKeyOrder: string[] | undefined;

  for (const record of records) {
    // 그룹 key 추출 및 직렬화 (JOIN key 제외)
    const groupKey = extractGroupKey(record, joinKeyExclusions);
    if (groupKeyOrder == null) {
      groupKeyOrder = Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
    }
    const keyStr = serializeGroupKey(groupKey, groupKeyOrder);

    const existingGroup = groupMap.get(keyStr);

    if (existingGroup != null) {
      // 기존 그룹에 JOIN 데이터 병합
      const hashSets = hashSetsMap.get(keyStr)!;
      for (const joinKey of childJoinKeys) {
        const localKey = currentPath === "" ? joinKey : joinKey.slice(currentPath.length + 1);
        mergeJoinData(existingGroup, record, localKey, joinsConfig[joinKey].isSingle, hashSets);
      }
    } else {
      // 새 그룹 생성
      const newGroup = { ...record };
      const hashSets: Record<string, Set<string>> = {};

      // 각 JOIN key를 배열 또는 단일 객체로 초기화
      for (const joinKey of childJoinKeys) {
        const localKey = currentPath === "" ? joinKey : joinKey.slice(currentPath.length + 1);
        const joinData = newGroup[localKey] as Record<string, unknown> | undefined;

        if (joinData != null && !isEmptyJoinObject(joinData)) {
          if (!joinsConfig[joinKey].isSingle) {
            // 배열로 변환 (hashSet은 첫 merge 시 초기화)
            newGroup[localKey] = [joinData];
          }
        } else {
          // 데이터가 비어있으면 key 삭제
          delete newGroup[localKey];
        }
      }

      groupMap.set(keyStr, newGroup);
      hashSetsMap.set(keyStr, hashSets);
    }
  }

  // Map을 배열로 변환
  const grouped = Array.from(groupMap.values());

  // 각 JOIN의 하위 레벨을 재귀적으로 처리
  for (const group of grouped) {
    for (const joinKey of childJoinKeys) {
      const localKey = currentPath === "" ? joinKey : joinKey.slice(currentPath.length + 1);
      const joinData = group[localKey];

      if (Array.isArray(joinData) && joinData.length > 0) {
        // 배열인 경우: 하위 레벨을 재귀적으로 처리
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

  return grouped;
}

/**
 * 그룹 key에서 제외할 key의 Set 구성 (join key와 그 접두사)
 */
function buildJoinKeyExclusionSet(joinKeys: string[]): Set<string> {
  const exclusions = new Set<string>();
  for (const jk of joinKeys) {
    exclusions.add(jk);
    // 상위 경로도 제외 (예: join key "posts.comments"에 대해 "posts")
    const parts = jk.split(".");
    for (let i = 1; i < parts.length; i++) {
      exclusions.add(parts.slice(0, i).join("."));
    }
  }
  return exclusions;
}

/**
 * JOIN key를 제외하고 레코드에서 그룹 key 추출
 */
function extractGroupKey(
  record: Record<string, unknown>,
  joinKeyExclusions: Set<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    // JOIN이 아닌 key만 포함
    if (!joinKeyExclusions.has(key)) {
      // 프리미티브 값만 그룹 key로 사용 (객체/배열 제외)
      if (value == null || typeof value !== "object") {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * 기존 그룹에 JOIN 데이터 병합
 */
function mergeJoinData(
  existingGroup: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  localKey: string,
  isSingle: boolean,
  hashSets: Record<string, Set<string>>,
): void {
  const newJoinData = newRecord[localKey] as Record<string, unknown> | undefined;

  if (newJoinData == null || isEmptyJoinObject(newJoinData)) {
    return; // 병합할 데이터 없음
  }

  const existingJoinData = existingGroup[localKey];

  if (isSingle) {
    // isSingle: true - 데이터가 존재하고 값이 다르면 에러
    if (existingJoinData != null) {
      if (!obj.equal(existingJoinData, newJoinData)) {
        throw new Error(`isSingle 관계 '${localKey}'에 여러 개의 다른 결과가 있습니다.`);
      }
    } else {
      existingGroup[localKey] = newJoinData;
    }
  } else {
    // isSingle: false → 배열에 추가
    if (!Array.isArray(existingJoinData)) {
      existingGroup[localKey] = [newJoinData];
      hashSets[localKey] = new Set([serializeGroupKey(newJoinData)]);
    } else {
      // Set 기반 중복 검사 (O(1))
      const hashSet = hashSets[localKey] as Set<string> | undefined;
      const newHash = serializeGroupKey(newJoinData);
      if (hashSet != null) {
        if (!hashSet.has(newHash)) {
          hashSet.add(newHash);
          existingJoinData.push(newJoinData);
        }
      } else {
        // hashSet 미초기화: obj.equal 폴백 (중첩 객체 포함 시 정확한 비교)
        const isDuplicate = existingJoinData.some((item) =>
          obj.equal(item as Record<string, unknown>, newJoinData),
        );
        if (!isDuplicate) {
          existingJoinData.push(newJoinData);
        }
      }
    }
  }
}
