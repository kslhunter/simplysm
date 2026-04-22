import { DateTime } from "../types/date-time";
import { DateOnly } from "../types/date-only";
import { Time } from "../types/time";
import { Uuid } from "../types/uuid";
import { ArgumentError } from "../errors/argument-error";

//#region clone

/**
 * 깊은 복사
 * - 순환 참조 지원
 * - 커스텀 타입 복사 지원 (DateTime, DateOnly, Time, Uuid, Uint8Array)
 *
 * @note 함수와 Symbol은 복사되지 않고 참조가 유지됨
 * @note WeakMap과 WeakSet은 지원되지 않음 (일반 객체로 복사되어 빈 객체가 됨)
 * @note 프로토타입 체인이 유지됨 (Object.setPrototypeOf 사용)
 * @note Getter/setter는 현재 값으로 평가되어 복사됨 (접근자 속성 자체는 복사되지 않음)
 */
export function clone<TObj>(source: TObj): TObj {
  return cloneImpl(source) as TObj;
}

function cloneImpl(source: unknown, prevClones?: WeakMap<object, unknown>): unknown {
  // 원시 값은 그대로 반환
  if (typeof source !== "object" || source == null) {
    return source;
  }

  // 불변과 유사한 타입 (내부 객체 참조 없음)
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

  // RegExp
  if (source instanceof RegExp) {
    return new RegExp(source.source, source.flags);
  }

  // 순환 참조 검사 (Error를 포함한 모든 객체 타입에 적용)
  const currPrevClones = prevClones ?? new WeakMap<object, unknown>();
  if (currPrevClones.has(source)) {
    return currPrevClones.get(source);
  }

  // Error (cause 포함)
  // 생성자 호출 대신 프로토타입 기반 복사 - 커스텀 Error 클래스 호환성 보장
  if (source instanceof Error) {
    const cloned = Object.create(Object.getPrototypeOf(source)) as Error;
    currPrevClones.set(source, cloned);
    cloned.message = source.message;
    cloned.name = source.name;
    cloned.stack = source.stack;
    if (source.cause != null) {
      cloned.cause = cloneImpl(source.cause, currPrevClones);
    }
    // 커스텀 Error 속성 복사
    for (const key of Object.keys(source)) {
      if (!["message", "name", "stack", "cause"].includes(key)) {
        const desc = Object.getOwnPropertyDescriptor(source, key);
        if (desc != null) {
          Object.defineProperty(cloned, key, {
            ...desc,
            value: "value" in desc ? cloneImpl(desc.value, currPrevClones) : desc.value,
          });
        }
      }
    }
    return cloned;
  }

  if (source instanceof Uint8Array) {
    const result = source.slice();
    currPrevClones.set(source, result);
    return result;
  }

  if (source instanceof Array) {
    const result: unknown[] = [];
    currPrevClones.set(source, result);
    for (const item of source) {
      result.push(cloneImpl(item, currPrevClones));
    }
    return result;
  }

  if (source instanceof Map) {
    const result = new Map();
    currPrevClones.set(source, result);
    for (const [key, value] of source) {
      result.set(cloneImpl(key, currPrevClones), cloneImpl(value, currPrevClones));
    }
    return result;
  }

  if (source instanceof Set) {
    const result = new Set();
    currPrevClones.set(source, result);
    for (const item of source) {
      result.add(cloneImpl(item, currPrevClones));
    }
    return result;
  }

  // 기타 Object 타입
  const result: Record<string, unknown> = {};
  Object.setPrototypeOf(result, Object.getPrototypeOf(source));
  currPrevClones.set(source, result);

  for (const key of Object.keys(source)) {
    const value = (source as Record<string, unknown>)[key];
    result[key] = cloneImpl(value, currPrevClones);
  }

  return result;
}

//#endregion

//#region equal

/** equal 옵션 타입 */
export interface EqualOptions {
  /** 비교할 key 목록. 지정 시 해당 key만 비교 (최상위 레벨에만 적용) */
  topLevelIncludes?: string[];
  /** 비교에서 제외할 key 목록 (최상위 레벨에만 적용) */
  topLevelExcludes?: string[];
  /** array 순서를 무시할지 여부. true면 O(n²) 복잡도 */
  ignoreArrayIndex?: boolean;
  /** 얕은 비교 여부. true면 1단계만 비교 (참조 비교) */
  shallow?: boolean;
}

/**
 * 깊은 동등성 비교
 *
 * @param source 비교 대상 1
 * @param target 비교 대상 2
 * @param options 비교 옵션
 * @param options.topLevelIncludes 비교할 key 목록. 지정 시 해당 key만 비교 (최상위 레벨에만 적용)
 *   @example `{ topLevelIncludes: ["id", "name"] }` - id와 name key만 비교
 * @param options.topLevelExcludes 비교에서 제외할 key 목록 (최상위 레벨에만 적용)
 *   @example `{ topLevelExcludes: ["updatedAt"] }` - updatedAt key를 제외하고 비교
 * @param options.ignoreArrayIndex array 순서를 무시할지 여부. true면 O(n²) 복잡도
 * @param options.shallow 얕은 비교 여부. true면 1단계만 비교 (참조 비교)
 *
 * @note topLevelIncludes/topLevelExcludes 옵션은 객체 속성 key에만 적용됨.
 *       Map의 모든 key는 항상 비교에 포함됨.
 * @note 성능 고려사항:
 * - 기본 array 비교: O(n) 시간 복잡도
 * - `ignoreArrayIndex: true` 사용 시: O(n²) 시간 복잡도
 *   (대형 array에서 성능 저하 가능)
 * @note `ignoreArrayIndex: true` 동작 특성:
 * - array 순서를 무시하고 요소가 같은 집합의 순열인지 확인
 * - 예: `[1,2,3]`과 `[3,2,1]` → true, `[1,1,1]`과 `[1,2,3]` → false
 */
export function equal(source: unknown, target: unknown, options?: EqualOptions): boolean {
  if (source === target) return true;
  if (source == null || target == null) return false;
  if (typeof source !== typeof target) return false;

  if (source instanceof Date && target instanceof Date) {
    return source.getTime() === target.getTime();
  }

  if (
    (source instanceof DateTime && target instanceof DateTime) ||
    (source instanceof DateOnly && target instanceof DateOnly) ||
    (source instanceof Time && target instanceof Time)
  ) {
    return source.tick === target.tick;
  }

  if (source instanceof Uuid && target instanceof Uuid) {
    return source.toString() === target.toString();
  }

  if (source instanceof RegExp && target instanceof RegExp) {
    return source.source === target.source && source.flags === target.flags;
  }

  if (source instanceof Array && target instanceof Array) {
    return equalArray(source, target, options);
  }

  if (source instanceof Map && target instanceof Map) {
    return equalMap(source, target, options);
  }

  if (source instanceof Set && target instanceof Set) {
    return equalSet(source, target, options);
  }

  if (typeof source === "object" && typeof target === "object") {
    return equalObject(
      source as Record<string, unknown>,
      target as Record<string, unknown>,
      options,
    );
  }

  return false;
}

function equalArray(source: unknown[], target: unknown[], options?: EqualOptions): boolean {
  if (source.length !== target.length) {
    return false;
  }

  if (options?.ignoreArrayIndex) {
    const matchedIndices = new Set<number>();

    if (options.shallow) {
      return source.every((sourceItem) => {
        const idx = target.findIndex((t, i) => !matchedIndices.has(i) && t === sourceItem);
        if (idx !== -1) {
          matchedIndices.add(idx);
          return true;
        }
        return false;
      });
    } else {
      // 재귀 호출 시 topLevelIncludes/topLevelExcludes 옵션은 최상위 레벨에만 적용되므로 제외
      const recursiveOptions = {
        ignoreArrayIndex: options.ignoreArrayIndex,
        shallow: options.shallow,
      };
      return source.every((sourceItem) => {
        const idx = target.findIndex(
          (t, i) => !matchedIndices.has(i) && equal(t, sourceItem, recursiveOptions),
        );
        if (idx !== -1) {
          matchedIndices.add(idx);
          return true;
        }
        return false;
      });
    }
  } else {
    if (options?.shallow) {
      for (let i = 0; i < source.length; i++) {
        if (source[i] !== target[i]) {
          return false;
        }
      }
    } else {
      // 재귀 호출 시 topLevelIncludes/topLevelExcludes 옵션은 최상위 레벨에만 적용되므로 제외
      for (let i = 0; i < source.length; i++) {
        if (
          !equal(source[i], target[i], {
            ignoreArrayIndex: options?.ignoreArrayIndex,
            shallow: options?.shallow,
          })
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Map 객체 비교
 * @note 비문자열 key(객체, array 등) 처리 시 O(n²) 복잡도
 * @note 대용량 데이터에는 shallow: true 옵션 사용 권장 (참조 비교로 O(n)으로 개선)
 */
function equalMap(
  source: Map<unknown, unknown>,
  target: Map<unknown, unknown>,
  options?: EqualOptions,
): boolean {
  // Map 비교 시 topLevelIncludes/topLevelExcludes 옵션은 무시됨 (객체 속성 key에만 적용)
  const sourceKeys = Array.from(source.keys()).filter((key) => source.get(key) != null);
  const targetKeys = Array.from(target.keys()).filter((key) => target.get(key) != null);

  if (sourceKeys.length !== targetKeys.length) {
    return false;
  }

  const usedTargetKeys = new Set<number>();
  for (const sourceKey of sourceKeys) {
    // 문자열 key: 직접 비교
    if (typeof sourceKey === "string") {
      const sourceValue = source.get(sourceKey);
      const targetValue = target.get(sourceKey);
      if (options?.shallow) {
        if (sourceValue !== targetValue) return false;
      } else {
        if (
          !equal(sourceValue, targetValue, {
            ignoreArrayIndex: options?.ignoreArrayIndex,
            shallow: options?.shallow,
          })
        ) {
          return false;
        }
      }
    } else {
      // 비문자열 key: targetKeys에서 동등한 key 검색
      let found = false;
      for (let i = 0; i < targetKeys.length; i++) {
        const targetKey = targetKeys[i];
        if (typeof targetKey === "string" || usedTargetKeys.has(i)) continue;
        if (options?.shallow ? sourceKey === targetKey : equal(sourceKey, targetKey)) {
          usedTargetKeys.add(i);
          const sourceValue = source.get(sourceKey);
          const targetValue = target.get(targetKey);
          if (options?.shallow) {
            if (sourceValue !== targetValue) return false;
          } else {
            if (
              !equal(sourceValue, targetValue, {
                ignoreArrayIndex: options?.ignoreArrayIndex,
                shallow: options?.shallow,
              })
            ) {
              return false;
            }
          }
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
  }

  return true;
}

function equalObject(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  options?: EqualOptions,
): boolean {
  const sourceKeys = Object.keys(source).filter(
    (key) =>
      (options?.topLevelIncludes == null || options.topLevelIncludes.includes(key)) &&
      !options?.topLevelExcludes?.includes(key) &&
      source[key] != null,
  );
  const targetKeys = Object.keys(target).filter(
    (key) =>
      (options?.topLevelIncludes == null || options.topLevelIncludes.includes(key)) &&
      !options?.topLevelExcludes?.includes(key) &&
      target[key] != null,
  );

  if (sourceKeys.length !== targetKeys.length) {
    return false;
  }

  for (const key of sourceKeys) {
    if (options?.shallow) {
      if (source[key] !== target[key]) {
        return false;
      }
    } else {
      if (
        !equal(source[key], target[key], {
          ignoreArrayIndex: options?.ignoreArrayIndex,
        })
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Set 깊은 동등성 비교
 * @note 깊은 비교(`shallow: false`)는 O(n²) 시간 복잡도.
 *   원시 타입 Set이거나 성능이 중요한 경우 `shallow: true` 사용 권장
 */
function equalSet(source: Set<unknown>, target: Set<unknown>, options?: EqualOptions): boolean {
  if (source.size !== target.size) {
    return false;
  }

  if (options?.shallow) {
    for (const sourceItem of source) {
      if (!target.has(sourceItem)) {
        return false;
      }
    }
  } else {
    // 깊은 비교: 루프 외부에서 target array를 한 번만 생성
    // 중복 매칭 방지를 위해 매칭된 인덱스 추적
    const targetArr = [...target];
    const matchedIndices = new Set<number>();
    for (const sourceItem of source) {
      const idx = targetArr.findIndex(
        (t, i) => !matchedIndices.has(i) && equal(sourceItem, t, options),
      );
      if (idx === -1) {
        return false;
      }
      matchedIndices.add(idx);
    }
  }

  return true;
}

//#endregion

//#region merge

/** merge 옵션 타입 */
export interface MergeOptions {
  /** Array 처리 방식. "replace": target으로 교체 (기본값), "concat": 병합 (중복 제거) */
  arrayProcess?: "replace" | "concat";
  /** target이 null일 때 해당 key를 삭제할지 여부 */
  useDelTargetNull?: boolean;
}

/**
 * 깊은 병합 (source를 기반으로 target을 병합)
 *
 * @param source 기본 객체
 * @param target 병합할 객체
 * @param opt 병합 옵션
 * @param opt.arrayProcess Array 처리 방식
 *   - `"replace"`: target array로 교체 (기본값)
 *   - `"concat"`: source와 target array를 병합 (Set으로 중복 제거)
 * @param opt.useDelTargetNull target 값이 null일 때 해당 key를 삭제할지 여부
 *   - `true`: target이 null이면 결과에서 해당 key 삭제
 *   - `false` 또는 미지정: source 값 유지
 *
 * @note 원본 객체를 수정하지 않고 새 객체를 반환 (불변성 보장)
 * @note arrayProcess="concat" 사용 시 Set으로 중복 제거되며,
 *       객체 array의 경우 참조(주소) 비교로 중복 여부 판단
 * @note 타입이 다르면 target 값으로 덮어씀
 */
export function merge<TSource, TMergeTarget>(
  source: TSource,
  target: TMergeTarget,
  opt?: MergeOptions,
): TSource & TMergeTarget {
  if (source == null) {
    return clone(target) as TSource & TMergeTarget;
  }

  if (target == null) {
    // null(typeof "object")이면 useDelTargetNull 옵션 적용, undefined면 항상 clone
    if (typeof target === "object" && opt?.useDelTargetNull) {
      return undefined as TSource & TMergeTarget;
    }
    return clone(source) as TSource & TMergeTarget;
  }

  if (typeof target !== "object") {
    return target as TSource & TMergeTarget;
  }

  if (
    target instanceof Date ||
    target instanceof DateTime ||
    target instanceof DateOnly ||
    target instanceof Time ||
    target instanceof Uuid ||
    target instanceof Uint8Array ||
    (opt?.arrayProcess === "replace" && target instanceof Array)
  ) {
    return clone(target) as TSource & TMergeTarget;
  }

  // source가 객체가 아니거나 source와 target이 다른 타입의 객체이면 target으로 덮어씀
  if (typeof source !== "object" || source.constructor !== target.constructor) {
    return clone(target) as TSource & TMergeTarget;
  }

  if (source instanceof Map && target instanceof Map) {
    const result = clone(source);
    for (const key of target.keys()) {
      if (result.has(key)) {
        result.set(key, merge(result.get(key), target.get(key), opt));
      } else {
        result.set(key, clone(target.get(key)));
      }
    }
    return result as TSource & TMergeTarget;
  }

  if (opt?.arrayProcess === "concat" && source instanceof Array && target instanceof Array) {
    let result = [...new Set([...source, ...target])];
    if (opt.useDelTargetNull) {
      result = result.filter((item) => item != null);
    }
    return result as TSource & TMergeTarget;
  }

  const sourceRec = source as Record<string, unknown>;
  const targetRec = target as Record<string, unknown>;
  const resultRec = clone(sourceRec);
  for (const key of Object.keys(target)) {
    resultRec[key] = merge(sourceRec[key], targetRec[key], opt);
    if (resultRec[key] == null) {
      delete resultRec[key];
    }
  }

  return resultRec as TSource & TMergeTarget;
}

/** merge3 옵션 타입 */
export interface Merge3KeyOptions {
  /** 비교할 하위 key 목록 (equal의 topLevelIncludes와 동일) */
  keys?: string[];
  /** 비교에서 제외할 하위 key 목록 */
  excludes?: string[];
  /** array 순서를 무시할지 여부 */
  ignoreArrayIndex?: boolean;
}

/**
 * 3-way 병합
 *
 * source, origin, target 세 객체를 비교하여 병합.
 * - source와 origin이 같고 target이 다르면 → target 값 사용
 * - target과 origin이 같고 source가 다르면 → source 값 사용
 * - source와 target이 같으면 → 해당 값 사용
 * - 세 값이 모두 다르면 → 충돌 발생 (origin 값 유지)
 *
 * @param source 변경된 버전 1
 * @param origin 기본 버전 (공통 조상)
 * @param target 변경된 버전 2
 * @param optionsObj key별 비교 옵션. 각 key에 대해 equal() 비교 옵션을 개별 지정
 *   - `keys`: 비교할 하위 key 목록 (equal의 topLevelIncludes와 동일)
 *   - `excludes`: 비교에서 제외할 하위 key 목록
 *   - `ignoreArrayIndex`: array 순서를 무시할지 여부
 * @returns conflict: 충돌 발생 여부, result: 병합 결과
 *
 * @example
 * const { conflict, result } = merge3(
 *   { a: 1, b: 2 },  // source
 *   { a: 1, b: 1 },  // origin
 *   { a: 2, b: 1 },  // target
 * );
 * // conflict: false, result: { a: 2, b: 2 }
 */
export function merge3<
  S extends Record<string, unknown>,
  O extends Record<string, unknown>,
  T extends Record<string, unknown>,
>(
  source: S,
  origin: O,
  target: T,
  optionsObj?: Record<string, Merge3KeyOptions>,
): {
  conflict: boolean;
  result: O & S & T;
} {
  let conflict = false;
  const result = clone(origin) as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(source), ...Object.keys(target), ...Object.keys(origin)]);
  for (const key of allKeys) {
    if (equal(source[key], result[key], optionsObj?.[key])) {
      result[key] = clone(target[key]);
    } else if (equal(target[key], result[key], optionsObj?.[key])) {
      result[key] = clone(source[key]);
    } else if (equal(source[key], target[key], optionsObj?.[key])) {
      result[key] = clone(source[key]);
    } else {
      conflict = true;
    }
  }

  return {
    conflict,
    result: result as O & S & T,
  };
}

//#endregion

//#region omit / pick

/**
 * 객체에서 특정 key 제외
 * @param item 원본 객체
 * @param omitKeys 제외할 key 배열
 * @returns 지정된 key가 제외된 새 객체
 * @example
 * const user = { name: "Alice", age: 30, email: "alice@example.com" };
 * omit(user, ["email"]);
 * // { name: "Alice", age: 30 }
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  omitKeys: K[],
): Omit<T, K> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(item)) {
    if (!omitKeys.includes(key as K)) {
      result[key] = item[key];
    }
  }
  return result as Omit<T, K>;
}

/**
 * 조건에 맞는 key 제외
 * @internal
 * @param item 원본 객체
 * @param omitKeyFn key를 받아 제외 여부를 반환하는 함수 (true면 제외)
 * @returns 조건에 맞는 key가 제외된 새 객체
 * @example
 * const data = { name: "Alice", _internal: "secret", age: 30 };
 * omitByFilter(data, (key) => key.startsWith("_"));
 * // { name: "Alice", age: 30 }
 */
export function omitByFilter<T extends Record<string, unknown>>(
  item: T,
  omitKeyFn: (key: keyof T) => boolean,
): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(item)) {
    if (!omitKeyFn(key)) {
      result[key] = item[key];
    }
  }
  return result as T;
}

/**
 * 객체에서 특정 key만 선택
 * @param item 원본 객체
 * @param keys 선택할 key 배열
 * @returns 지정된 key만 포함된 새 객체
 * @example
 * const user = { name: "Alice", age: 30, email: "alice@example.com" };
 * pick(user, ["name", "age"]);
 * // { name: "Alice", age: 30 }
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  pickKeys: K[],
): Pick<T, K> {
  const result: Record<string, unknown> = {};
  for (const key of pickKeys) {
    result[key as string] = item[key];
  }
  return result as Pick<T, K>;
}

//#endregion

//#region getChainValue / setChainValue / deleteChainValue

// 정규식 캐싱 (모듈 로드 시 한 번만 생성)
const chainSplitRegex = /[.[\]]/g;
const chainCleanRegex = /[?!'"]/g;
const chainNumericRegex = /^[0-9]*$/;

function getChainSplits(chain: string): (string | number)[] {
  const split = chain
    .split(chainSplitRegex)
    .map((item) => item.replace(chainCleanRegex, ""))
    .filter((item) => Boolean(item));
  const result: (string | number)[] = [];
  for (const splitItem of split) {
    if (chainNumericRegex.test(splitItem)) {
      result.push(Number.parseInt(splitItem));
    } else {
      result.push(splitItem);
    }
  }

  return result;
}

/**
 * 체인 경로로 값 조회
 * @example getChainValue(obj, "a.b[0].c")
 */
export function getChainValue(obj: unknown, chain: string, optional: true): unknown | undefined;
export function getChainValue(obj: unknown, chain: string): unknown;
export function getChainValue(
  obj: unknown,
  chain: string,
  optional?: true,
): unknown | undefined {
  const splits = getChainSplits(chain);
  let result: unknown = obj;
  for (const splitItem of splits) {
    if (optional && result == null) {
      result = undefined;
    } else {
      result = (result as Record<string | number, unknown>)[splitItem];
    }
  }
  return result;
}

/**
 * 같은 key로 지정된 깊이만큼 하강
 * @internal
 * @param obj 대상 객체
 * @param key 하강에 사용할 key
 * @param depth 하강 깊이 (1 이상)
 * @param optional true이면 중간에 null/undefined를 만나도 에러 없이 undefined 반환
 * @throws ArgumentError depth가 1 미만인 경우
 * @example getChainValueByDepth({ parent: { parent: { name: 'a' } } }, 'parent', 2) => { name: 'a' }
 */
export function getChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject,
  key: TKey,
  depth: number,
  optional: true,
): TObject[TKey] | undefined;
export function getChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject,
  key: TKey,
  depth: number,
): TObject[TKey];
export function getChainValueByDepth<TObject, TKey extends keyof TObject>(
  obj: TObject,
  key: TKey,
  depth: number,
  optional?: true,
): TObject[TKey] | undefined {
  if (depth < 1) {
    throw new ArgumentError("depth는 1 이상이어야 합니다", { depth });
  }
  let result: unknown = obj;
  for (let i = 0; i < depth; i++) {
    if (optional && result == null) {
      result = undefined;
    } else {
      result = (result as Record<string, unknown>)[key as string];
    }
  }
  return result as TObject[TKey] | undefined;
}

/**
 * 체인 경로로 값 설정
 * @example setChainValue(obj, "a.b[0].c", value)
 */
export function setChainValue(obj: unknown, chain: string, value: unknown): void {
  const splits = getChainSplits(chain);
  if (splits.length === 0) {
    throw new ArgumentError("chain이 비어있습니다", { chain });
  }

  let curr: Record<string | number, unknown> = obj as Record<string | number, unknown>;
  for (const splitItem of splits.slice(0, -1)) {
    curr[splitItem] = curr[splitItem] ?? {};
    curr = curr[splitItem] as Record<string | number, unknown>;
  }

  const last = splits[splits.length - 1];
  curr[last] = value;
}

/**
 * 체인 경로로 값 삭제
 * @example deleteChainValue(obj, "a.b[0].c")
 */
export function deleteChainValue(obj: unknown, chain: string): void {
  const splits = getChainSplits(chain);
  if (splits.length === 0) {
    throw new ArgumentError("chain이 비어있습니다", { chain });
  }

  let curr: Record<string | number, unknown> = obj as Record<string | number, unknown>;
  for (const splitItem of splits.slice(0, -1)) {
    const next = curr[splitItem];
    // 중간 경로가 존재하지 않으면 조용히 반환 (삭제할 것이 없음)
    if (next == null || typeof next !== "object") {
      return;
    }
    curr = next as Record<string | number, unknown>;
  }

  const last = splits[splits.length - 1];
  delete curr[last];
}

//#endregion

//#region clearUndefined / clear / nullToUndefined / unflatten

/**
 * 객체에서 undefined 값을 가진 key 삭제
 * @internal
 *
 * @mutates 원본 객체를 직접 수정
 */
export function clearUndefined<T extends object>(obj: T): T {
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] == null) {
      delete record[key];
    }
  }
  return obj;
}

/**
 * 객체의 모든 key 삭제
 * @internal
 *
 * @mutates 원본 객체를 직접 수정
 */
export function clear<T extends Record<string, unknown>>(obj: T): Record<string, never> {
  for (const key of Object.keys(obj)) {
    delete obj[key];
  }
  return obj as Record<string, never>;
}

/**
 * null을 undefined로 변환 (재귀)
 * @internal
 *
 * @mutates 원본 array/객체를 직접 수정
 */
export function nullToUndefined<TObject>(obj: TObject): TObject | undefined {
  return nullToUndefinedImpl(obj, new WeakSet());
}

function nullToUndefinedImpl<TObject>(obj: TObject, seen: WeakSet<object>): TObject | undefined {
  if (obj == null) {
    return undefined;
  }

  if (
    obj instanceof Date ||
    obj instanceof DateTime ||
    obj instanceof DateOnly ||
    obj instanceof Time ||
    obj instanceof Uuid
  ) {
    return obj;
  }

  if (obj instanceof Array) {
    if (seen.has(obj)) return obj;
    seen.add(obj);
    for (let i = 0; i < obj.length; i++) {
      obj[i] = nullToUndefinedImpl(obj[i], seen);
    }
    return obj;
  }

  if (typeof obj === "object") {
    if (seen.has(obj)) return obj;
    seen.add(obj);
    const objRec = obj as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      objRec[key] = nullToUndefinedImpl(objRec[key], seen);
    }

    return obj;
  }

  return obj;
}

/**
 * 평탄화된 객체를 중첩 객체로 변환
 * @internal
 * @example unflatten({ "a.b.c": 1 }) => { a: { b: { c: 1 } } }
 */
export function unflatten(flatObj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in flatObj) {
    const parts = key.split(".");
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (i === parts.length - 1) {
        current[part] = flatObj[key];
      } else {
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
    }
  }

  return result;
}

//#endregion

//#region 타입 유틸리티

/**
 * undefined를 가진 속성을 optional로 변환
 * @example { a: string; b: string | undefined } → { a: string; b?: string | undefined }
 */
export type UndefToOptional<TObject> = {
  [K in keyof TObject as undefined extends TObject[K] ? K : never]?: TObject[K];
} & { [K in keyof TObject as undefined extends TObject[K] ? never : K]: TObject[K] };

/**
 * optional 속성을 필수 + undefined 유니온으로 변환
 * @example { a: string; b?: string } → { a: string; b: string | undefined }
 */
export type OptionalToUndef<TObject> = {
  [K in keyof TObject]-?: {} extends Pick<TObject, K> ? TObject[K] | undefined : TObject[K];
};

//#endregion

/**
 * 타입 안전한 Object.keys
 * @param obj key를 추출할 객체
 * @returns 객체 key 배열
 */
export function keys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * 타입 안전한 Object.entries
 * @param obj 엔트리를 추출할 객체
 * @returns [key, value] 튜플 배열
 */
export function entries<T extends object>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>;
}

/**
 * 타입 안전한 Object.fromEntries
 * @param entries [key, value] 튜플 배열
 * @returns 생성된 객체
 */
export function fromEntries<T extends [string, unknown]>(entryPairs: T[]): { [K in T[0]]: T[1] } {
  return Object.fromEntries(entryPairs) as { [K in T[0]]: T[1] };
}

type Entries<TObject> = { [K in keyof TObject]: [K, TObject[K]] }[keyof TObject][];

/**
 * 객체의 각 엔트리를 변환하여 새 객체 반환
 * @param obj 변환할 객체
 * @param fn 변환 함수 (key, value) => [newKey, newValue]
 * @returns key와 value가 변환된 새 객체
 * @example
 * const colors = { primary: "255, 0, 0", secondary: "0, 255, 0" };
 *
 * // 값만 변환
 * map(colors, (key, rgb) => [null, `rgb(${rgb})`]);
 * // { primary: "rgb(255, 0, 0)", secondary: "rgb(0, 255, 0)" }
 *
 * // key와 값 모두 변환
 * map(colors, (key, rgb) => [`${key}Light`, `rgb(${rgb})`]);
 * // { primaryLight: "rgb(255, 0, 0)", secondaryLight: "rgb(0, 255, 0)" }
 */
export function map<TSource extends object, TNewKey extends string, TNewValue>(
  obj: TSource,
  fn: (key: keyof TSource, value: TSource[keyof TSource]) => [TNewKey | null, TNewValue],
): Record<TNewKey | Extract<keyof TSource, string>, TNewValue> {
  return mapImpl(obj, fn);
}

function mapImpl<TSource extends object, TNewKey extends string, TNewValue>(
  obj: TSource,
  fn: (key: keyof TSource, value: TSource[keyof TSource]) => [TNewKey | null, TNewValue],
): Record<string, TNewValue> {
  const result: Record<string, TNewValue> = {};
  for (const key of Object.keys(obj)) {
    const [newKey, newValue] = fn(
      key as keyof TSource,
      (obj as Record<string, TSource[keyof TSource]>)[key],
    );
    result[newKey ?? key] = newValue;
  }
  return result;
}
