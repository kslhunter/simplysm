import { bytesFromHex, DateOnly, DateTime, objEqual, Time, Uuid } from "@simplysm/core-common";
import type { ColumnPrimitiveStr } from "../types/column";
import type { ResultMeta } from "../types/db";

declare function setImmediate(callback: () => void): void;

// ============================================
// Type Parsers
// ============================================

/**
 * Parse value to specified type
 *
 * @param value - value to parse
 * @param type - target type (ColumnPrimitiveStr)
 * @returns parsed value
 * @throws Error if parsing fails
 */
function parseValue(value: unknown, type: ColumnPrimitiveStr): unknown {
  // null/undefined returned as-is (key removal handled by caller)
  if (value == null) {
    return undefined;
  }

  switch (type) {
    case "number": {
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new Error(`Failed to parse number: ${String(value)}`);
      }
      return num;
    }

    case "string":
      return String(value);

    case "boolean":
      // Handle 0, 1, "0", "1", true, false, etc.
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
      throw new Error(`Failed to parse Bytes: ${typeof value}`);
  }
}

// ============================================
// Grouping Utilities
// ============================================

/**
 * Transform flat record to nested object
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

    // undefined values are not added as keys
    if (parsedValue === undefined) continue;

    if (key.includes(".")) {
      // Nested key: "posts.id" → { posts: { id: ... } }
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
      // Simple key
      result[key] = parsedValue;
    }
  }

  return result;
}

/**
 * Check if object is empty (all values are undefined)
 */
function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

// ============================================
// Main Function
// ============================================

/** Yield interval: yield to event loop every N records */
const YIELD_INTERVAL = 100;

/** Event loop yield: setImmediate for Node.js, setTimeout fallback for browser */
const yieldToEventLoop: () => Promise<void> =
  typeof setImmediate !== "undefined"
    ? () => new Promise<void>((resolve) => setImmediate(resolve))
    : () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Transform DB query result to TypeScript object via ResultMeta
 *
 * @param rawResults - Raw result array from database
 * @param meta - Type transformation and JOIN structure information (required)
 * @returns Type-transformed and nested result array. Returns undefined if input is empty or no valid results
 * @throws Error if type parsing fails
 *
 * @remarks
 * - meta required: no need to call this function without meta (input = output)
 * - async only: no synchronous version provided for large-scale processing to allow external interrupts
 * - browser/node compatible: yields via setTimeout(resolve, 0)
 * - empty result handling: returns undefined if input array is empty or all records are empty objects after parsing
 *
 * @example
 * ```typescript
 * // 1. Simple type parsing
 * const raw = [{ id: "1", createdAt: "2026-01-07T10:00:00.000Z" }];
 * const meta = { columns: { id: "number", createdAt: "DateTime" }, joins: {} };
 * const result = await parseQueryResult(raw, meta);
 * // [{ id: 1, createdAt: DateTime(...) }]
 *
 * // 2. JOIN result nesting
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
  // Handle empty input
  if (rawResults.length === 0) {
    return undefined;
  }

  const joinKeys = Object.keys(meta.joins);

  // No JOINs: simple type parsing only
  if (joinKeys.length === 0) {
    return parseSimpleRecords<TRecord>(rawResults, meta.columns);
  }

  // With JOINs: grouping + nesting
  return parseJoinedRecords<TRecord>(rawResults, meta);
}

/**
 * Parse simple records without JOINs
 */
async function parseSimpleRecords<TRecord>(
  rawResults: Record<string, unknown>[],
  columns: Record<string, ColumnPrimitiveStr>,
): Promise<TRecord[] | undefined> {
  const results: Record<string, unknown>[] = [];

  for (let i = 0; i < rawResults.length; i++) {
    // Yield to event loop
    if (i > 0 && i % YIELD_INTERVAL === 0) {
      await yieldToEventLoop();
    }

    const parsed = flatToNested(rawResults[i], columns);

    // Exclude empty objects
    if (!isEmptyObject(parsed)) {
      results.push(parsed);
    }
  }

  // Return undefined for empty arrays
  return results.length > 0 ? (results as TRecord[]) : undefined;
}

/**
 * Sort JOIN keys by depth (shallower ones first)
 * "posts" (1) < "posts.comments" (2)
 */
function sortJoinKeysByDepth(joinKeys: string[]): string[] {
  return [...joinKeys].sort((a, b) => {
    const depthA = a.split(".").length;
    const depthB = b.split(".").length;
    return depthA - depthB; // Shallower ones first
  });
}

/**
 * Parse records with JOINs (recursive grouping)
 */
async function parseJoinedRecords<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined> {
  // 1. Transform all records to nested structure
  const nestedRecords: Record<string, unknown>[] = [];
  for (let i = 0; i < rawResults.length; i++) {
    if (i > 0 && i % YIELD_INTERVAL === 0) {
      await yieldToEventLoop();
    }
    nestedRecords.push(flatToNested(rawResults[i], meta.columns));
  }

  // 2. Sort JOIN keys by depth (shallower ones first)
  const sortedJoinKeys = sortJoinKeysByDepth(Object.keys(meta.joins));

  // 3. Recursively group from root level
  const results = groupRecordsRecursively(nestedRecords, sortedJoinKeys, meta.joins, "");

  // 4. Filter empty results
  const filteredResults = results.filter((r) => !isEmptyObject(r));

  return filteredResults.length > 0 ? (filteredResults as TRecord[]) : undefined;
}

/**
 * Serialize group key to string (used as Map key)
 *
 * Custom serialization faster than JSON.stringify
 */
function serializeGroupKey(groupKey: Record<string, unknown>, cachedKeyOrder?: string[]): string {
  const keys = cachedKeyOrder ?? Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
  return keys.map((k) => `${k}:${groupKey[k] === null ? "null" : String(groupKey[k])}`).join("|");
}

/**
 * Recursively group records for current path
 *
 * Achieves O(n) complexity with Map-based grouping
 *
 * @param records - Record array to group
 * @param allJoinKeys - All JOIN keys (sorted by depth)
 * @param joinsConfig - JOIN configuration
 * @param currentPath - Current path (e.g., "", "posts", "posts.comments")
 */
function groupRecordsRecursively(
  records: Record<string, unknown>[],
  allJoinKeys: string[],
  joinsConfig: Record<string, { isSingle: boolean }>,
  currentPath: string,
): Record<string, unknown>[] {
  // Find JOIN keys directly corresponding to current path
  // e.g., currentPath="" → ["posts", "company"]
  // e.g., currentPath="posts" → ["posts.comments"]
  const childJoinKeys = allJoinKeys.filter((key) => {
    if (currentPath === "") {
      // Root level: keys without dots
      return !key.includes(".");
    } else {
      // Sublevel: current path + "." + key
      return (
        key.startsWith(currentPath + ".") && key.slice(currentPath.length + 1).indexOf(".") === -1
      );
    }
  });

  if (childJoinKeys.length === 0) {
    // No more JOINs to group
    return records;
  }

  // Map-based grouping (O(n) complexity)
  const groupMap = new Map<string, Record<string, unknown>>();

  // Key order caching (determined from first record and reused)
  let groupKeyOrder: string[] | undefined;

  for (const record of records) {
    // Extract and serialize group key (excluding JOIN keys)
    const groupKey = extractGroupKey(record, childJoinKeys);
    if (groupKeyOrder == null) {
      groupKeyOrder = Object.keys(groupKey).sort((a, b) => a.localeCompare(b));
    }
    const keyStr = serializeGroupKey(groupKey, groupKeyOrder);

    const existingGroup = groupMap.get(keyStr);

    if (existingGroup != null) {
      // Merge JOIN data to existing group
      for (const joinKey of childJoinKeys) {
        const localKey = currentPath === "" ? joinKey : joinKey.slice(currentPath.length + 1);
        mergeJoinData(existingGroup, record, localKey, joinsConfig[joinKey].isSingle);
      }
    } else {
      // Generate new group
      const newGroup = { ...record };

      // Initialize each JOIN key as array or single object
      for (const joinKey of childJoinKeys) {
        const localKey = currentPath === "" ? joinKey : joinKey.slice(currentPath.length + 1);
        const joinData = newGroup[localKey] as Record<string, unknown> | undefined;

        if (joinData != null && !isEmptyObject(joinData)) {
          if (!joinsConfig[joinKey].isSingle) {
            // Transform to array
            newGroup[localKey] = [joinData];
          }
        } else {
          // Delete key if data is empty
          delete newGroup[localKey];
        }
      }

      groupMap.set(keyStr, newGroup);
    }
  }

  // Transform Map to array
  const grouped = Array.from(groupMap.values());

  // Recursively process sublevel of each JOIN
  for (const group of grouped) {
    for (const joinKey of childJoinKeys) {
      const localKey = currentPath === "" ? joinKey : joinKey.slice(currentPath.length + 1);
      const joinData = group[localKey];

      if (Array.isArray(joinData) && joinData.length > 0) {
        // Array case: process sublevel recursively
        group[localKey] = groupRecordsRecursively(
          joinData as Record<string, unknown>[],
          allJoinKeys,
          joinsConfig,
          joinKey,
        );
      } else if (joinData != null && typeof joinData === "object" && !Array.isArray(joinData)) {
        // Single object case (isSingle: true)
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

  // Remove __hashSet__ internal property (temporary property for duplicate checking)
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
 * Extract group key from record excluding JOIN keys
 */
function extractGroupKey(
  record: Record<string, unknown>,
  joinKeys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    // Only include non-JOIN keys
    if (!joinKeys.some((jk) => jk === key || jk.startsWith(key + "."))) {
      // Only use primitive values (not object/array) as group key
      if (value == null || typeof value !== "object") {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Merge JOIN data to existing group
 */
function mergeJoinData(
  existingGroup: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  localKey: string,
  isSingle: boolean,
): void {
  const newJoinData = newRecord[localKey] as Record<string, unknown> | undefined;

  if (newJoinData == null || isEmptyObject(newJoinData)) {
    return; // No data to merge
  }

  const existingJoinData = existingGroup[localKey];

  if (isSingle) {
    // isSingle: true - error if data exists and values differ
    if (existingJoinData != null) {
      if (!objEqual(existingJoinData as Record<string, unknown>, newJoinData)) {
        throw new Error(`isSingle relationship '${localKey}' has multiple different results.`);
      }
    } else {
      existingGroup[localKey] = newJoinData;
    }
  } else {
    // isSingle: false → Add to array
    const hashSetKey = `__hashSet__${localKey}`;
    if (!Array.isArray(existingJoinData)) {
      existingGroup[localKey] = [newJoinData];
      // Initialize internal property for Set-based duplicate checking
      existingGroup[hashSetKey] = new Set([serializeGroupKey(newJoinData)]);
    } else {
      // Set-based duplicate checking (O(1))
      const hashSet = existingGroup[hashSetKey] as Set<string> | undefined;
      const newHash = serializeGroupKey(newJoinData);
      if (hashSet != null) {
        if (!hashSet.has(newHash)) {
          hashSet.add(newHash);
          existingJoinData.push(newJoinData);
        }
      } else {
        // Fallback without hashSet (legacy approach)
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
