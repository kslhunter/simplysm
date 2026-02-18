/**
 * 깊은 복사
 * - 순환 참조 지원
 * - 커스텀 타입(DateTime, DateOnly, Time, Uuid, Uint8Array) 복사 지원
 *
 * @note 함수, Symbol은 복사되지 않고 참조가 유지됨
 * @note WeakMap, WeakSet은 지원되지 않음 (일반 객체로 복사되어 빈 객체가 됨)
 * @note 프로토타입 체인은 유지됨 (Object.setPrototypeOf 사용)
 * @note getter/setter는 현재 값으로 평가되어 복사됨 (접근자 속성 자체는 복사되지 않음)
 */
export declare function objClone<T>(source: T): T;
/** objEqual 옵션 타입 */
export interface EqualOptions {
  /** 비교할 키 목록. 지정 시 해당 키만 비교 (최상위 레벨에만 적용) */
  includes?: string[];
  /** 비교에서 제외할 키 목록 (최상위 레벨에만 적용) */
  excludes?: string[];
  /** 배열 순서 무시 여부. true 시 O(n²) 복잡도 */
  ignoreArrayIndex?: boolean;
  /** 얕은 비교 여부. true 시 1단계만 비교 (참조 비교) */
  onlyOneDepth?: boolean;
}
/**
 * 깊은 비교
 *
 * @param source 비교 대상 1
 * @param target 비교 대상 2
 * @param options 비교 옵션
 * @param options.includes 비교할 키 목록. 지정 시 해당 키만 비교 (최상위 레벨에만 적용)
 *   @example `{ includes: ["id", "name"] }` - id, name 키만 비교
 * @param options.excludes 비교에서 제외할 키 목록 (최상위 레벨에만 적용)
 *   @example `{ excludes: ["updatedAt"] }` - updatedAt 키를 제외하고 비교
 * @param options.ignoreArrayIndex 배열 순서 무시 여부. true 시 O(n²) 복잡도
 * @param options.onlyOneDepth 얕은 비교 여부. true 시 1단계만 비교 (참조 비교)
 *
 * @note includes/excludes 옵션은 object 속성 키에만 적용됨.
 *       Map의 모든 키는 항상 비교에 포함됨.
 * @note 성능 고려사항:
 * - 기본 배열 비교: O(n) 시간 복잡도
 * - `ignoreArrayIndex: true` 사용 시: O(n²) 시간 복잡도
 *   (대용량 배열에서 성능 저하 가능)
 * @note `ignoreArrayIndex: true` 동작 특성:
 * - 배열 순서를 무시하고 동일한 요소들의 순열인지 비교
 * - 예: `[1,2,3]`과 `[3,2,1]` → true, `[1,1,1]`과 `[1,2,3]` → false
 */
export declare function objEqual(source: unknown, target: unknown, options?: EqualOptions): boolean;
/** objMerge 옵션 타입 */
export interface ObjMergeOptions {
  /** 배열 처리 방식. "replace": target으로 대체(기본), "concat": 합침(중복 제거) */
  arrayProcess?: "replace" | "concat";
  /** target이 null일 때 해당 키 삭제 여부 */
  useDelTargetNull?: boolean;
}
/**
 * 깊은 병합 (source를 base로 target을 병합)
 *
 * @param source 기준 객체
 * @param target 병합할 객체
 * @param opt 병합 옵션
 * @param opt.arrayProcess 배열 처리 방식
 *   - `"replace"`: target 배열로 대체 (기본값)
 *   - `"concat"`: source와 target 배열을 합침 (Set으로 중복 제거)
 * @param opt.useDelTargetNull target 값이 null일 때 해당 키 삭제 여부
 *   - `true`: target이 null이면 결과에서 해당 키 삭제
 *   - `false` 또는 미지정: source 값 유지
 *
 * @note 원본 객체를 수정하지 않고 새 객체를 반환함 (불변성 보장)
 * @note arrayProcess="concat" 사용 시 Set을 통해 중복을 제거하며,
 *       객체 배열의 경우 참조(주소) 비교로 중복을 판단함
 * @note 타입이 다른 경우 target 값으로 덮어씀
 */
export declare function objMerge<T, P>(source: T, target: P, opt?: ObjMergeOptions): T & P;
/** merge3 옵션 타입 */
export interface ObjMerge3KeyOptions {
  /** 비교할 하위 키 목록 (equal의 includes와 동일) */
  keys?: string[];
  /** 비교에서 제외할 하위 키 목록 */
  excludes?: string[];
  /** 배열 순서 무시 여부 */
  ignoreArrayIndex?: boolean;
}
/**
 * 3-way 병합
 *
 * source, origin, target 세 객체를 비교하여 병합합니다.
 * - source와 origin이 같고 target이 다르면 → target 값 사용
 * - target과 origin이 같고 source가 다르면 → source 값 사용
 * - source와 target이 같으면 → 해당 값 사용
 * - 세 값이 모두 다르면 → 충돌 발생 (origin 값 유지)
 *
 * @param source 변경된 버전 1
 * @param origin 기준 버전 (공통 조상)
 * @param target 변경된 버전 2
 * @param optionsObj 키별 비교 옵션. 각 키에 대해 equal() 비교 옵션을 개별 지정
 *   - `keys`: 비교할 하위 키 목록 (equal의 includes와 동일)
 *   - `excludes`: 비교에서 제외할 하위 키 목록
 *   - `ignoreArrayIndex`: 배열 순서 무시 여부
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
export declare function objMerge3<
  S extends Record<string, unknown>,
  O extends Record<string, unknown>,
  T extends Record<string, unknown>,
>(
  source: S,
  origin: O,
  target: T,
  optionsObj?: Record<string, ObjMerge3KeyOptions>,
): {
  conflict: boolean;
  result: O & S & T;
};
/**
 * 객체에서 특정 키들을 제외
 * @param item 원본 객체
 * @param omitKeys 제외할 키 배열
 * @returns 지정된 키가 제외된 새 객체
 * @example
 * const user = { name: "Alice", age: 30, email: "alice@example.com" };
 * objOmit(user, ["email"]);
 * // { name: "Alice", age: 30 }
 */
export declare function objOmit<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  omitKeys: K[],
): Omit<T, K>;
/**
 * 조건에 맞는 키들을 제외
 * @param item 원본 객체
 * @param omitKeyFn 키를 받아 제외 여부를 반환하는 함수 (true면 제외)
 * @returns 조건에 맞는 키가 제외된 새 객체
 * @example
 * const data = { name: "Alice", _internal: "secret", age: 30 };
 * objOmitByFilter(data, (key) => key.startsWith("_"));
 * // { name: "Alice", age: 30 }
 */
export declare function objOmitByFilter<T extends Record<string, unknown>>(
  item: T,
  omitKeyFn: (key: keyof T) => boolean,
): T;
/**
 * 객체에서 특정 키들만 선택
 * @param item 원본 객체
 * @param keys 선택할 키 배열
 * @returns 지정된 키만 포함된 새 객체
 * @example
 * const user = { name: "Alice", age: 30, email: "alice@example.com" };
 * objPick(user, ["name", "age"]);
 * // { name: "Alice", age: 30 }
 */
export declare function objPick<T extends Record<string, unknown>, K extends keyof T>(
  item: T,
  keys: K[],
): Pick<T, K>;
/**
 * 체인 경로로 값 가져오기
 * @example objGetChainValue(obj, "a.b[0].c")
 */
export declare function objGetChainValue(
  obj: unknown,
  chain: string,
  optional: true,
): unknown | undefined;
export declare function objGetChainValue(obj: unknown, chain: string): unknown;
/**
 * depth만큼 같은 키로 내려가기
 * @param obj 대상 객체
 * @param key 내려갈 키
 * @param depth 내려갈 깊이 (1 이상)
 * @param optional true면 중간에 null/undefined가 있어도 에러 없이 undefined 반환
 * @throws ArgumentError depth가 1 미만일 경우
 * @example objGetChainValueByDepth({ parent: { parent: { name: 'a' } } }, 'parent', 2) => { name: 'a' }
 */
export declare function objGetChainValueByDepth<T, K extends keyof T>(
  obj: T,
  key: K,
  depth: number,
  optional: true,
): T[K] | undefined;
export declare function objGetChainValueByDepth<T, K extends keyof T>(
  obj: T,
  key: K,
  depth: number,
): T[K];
/**
 * 체인 경로로 값 설정
 * @example objSetChainValue(obj, "a.b[0].c", value)
 */
export declare function objSetChainValue(obj: unknown, chain: string, value: unknown): void;
/**
 * 체인 경로의 값 삭제
 * @example objDeleteChainValue(obj, "a.b[0].c")
 */
export declare function objDeleteChainValue(obj: unknown, chain: string): void;
/**
 * 객체에서 undefined 값을 가진 키 삭제
 *
 * @mutates 원본 객체를 직접 수정함
 */
export declare function objClearUndefined<T extends object>(obj: T): T;
/**
 * 객체의 모든 키 삭제
 *
 * @mutates 원본 객체를 직접 수정함
 */
export declare function objClear<T extends Record<string, unknown>>(obj: T): Record<string, never>;
/**
 * null을 undefined로 변환 (재귀적)
 *
 * @mutates 원본 배열/객체를 직접 수정함
 */
export declare function objNullToUndefined<T>(obj: T): T | undefined;
/**
 * flat된 객체를 nested 객체로 변환
 * @example objUnflatten({ "a.b.c": 1 }) => { a: { b: { c: 1 } } }
 */
export declare function objUnflatten(flatObj: Record<string, unknown>): Record<string, unknown>;
/**
 * undefined를 가진 프로퍼티를 optional로 변환
 * @example { a: string; b: string | undefined } → { a: string; b?: string | undefined }
 */
export type ObjUndefToOptional<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};
/**
 * optional 프로퍼티를 required + undefined 유니온으로 변환
 * @example { a: string; b?: string } → { a: string; b: string | undefined }
 */
export type ObjOptionalToUndef<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? T[K] | undefined : T[K];
};
/**
 * Object.keys의 타입 안전한 버전
 * @param obj 키를 추출할 객체
 * @returns 객체의 키 배열
 */
export declare function objKeys<T extends object>(obj: T): (keyof T)[];
/**
 * Object.entries의 타입 안전한 버전
 * @param obj 엔트리를 추출할 객체
 * @returns [키, 값] 튜플 배열
 */
export declare function objEntries<T extends object>(obj: T): ObjEntries<T>;
/**
 * Object.fromEntries의 타입 안전한 버전
 * @param entries [키, 값] 튜플 배열
 * @returns 생성된 객체
 */
export declare function objFromEntries<T extends [string, unknown]>(
  entries: T[],
): {
  [K in T[0]]: T[1];
};
type ObjEntries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];
/**
 * 객체의 각 엔트리를 변환하여 새 객체 반환
 * @param obj 변환할 객체
 * @param fn 변환 함수 (key, value) => [newKey, newValue]
 * @returns 변환된 키와 값을 가진 새 객체
 * @example
 * const colors = { primary: "255, 0, 0", secondary: "0, 255, 0" };
 *
 * // 값만 변환
 * objMap(colors, (key, rgb) => [null, `rgb(${rgb})`]);
 * // { primary: "rgb(255, 0, 0)", secondary: "rgb(0, 255, 0)" }
 *
 * // 키와 값 모두 변환
 * objMap(colors, (key, rgb) => [`${key}Light`, `rgb(${rgb})`]);
 * // { primaryLight: "rgb(255, 0, 0)", secondaryLight: "rgb(0, 255, 0)" }
 */
export declare function objMap<T extends object, NK extends string, NV>(
  obj: T,
  fn: (key: keyof T, value: T[keyof T]) => [NK | null, NV],
): Record<NK | Extract<keyof T, string>, NV>;
export {};
//# sourceMappingURL=obj.d.ts.map
