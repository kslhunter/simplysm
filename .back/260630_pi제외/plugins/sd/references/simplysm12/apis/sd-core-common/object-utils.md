# @simplysm/sd-core-common — ObjectUtils

`ObjectUtils` 정적 메서드 모음 — 객체 깊은복제, 동등비교, 병합, 체인 경로(`a.b[0].c`) 접근, 유효성 검증. DateTime/DateOnly/Time/Uuid/Buffer/Map/Set 을 인지해 특수 처리한다.

## 복제 / 병합

- `clone<T>(source, options?): T` — 깊은 복제. 순환참조는 WeakMap 으로 동일 참조 보존. Date/DateTime/DateOnly/Time/Uuid 는 새 인스턴스로, Buffer/Array/Map 도 재귀 복제. 객체는 prototype 유지.
  - `options.excludes?: string[]` — 복제에서 뺄 최상위 키.
  - `options.useRefTypes?: any[]` — 이 생성자에 해당하는 값은 복제하지 않고 참조 그대로(예: 큰 객체·외부 인스턴스).
  - `options.onlyOneDepth?: boolean` — 1단계만 얕은 복제(`[...]`/`{...}`).
- `merge<T, P>(source, target, opt?): T & P` — target 을 source 위에 깊게 덮어쓰기.
  - `opt.arrayProcess?: "replace" | "concat"` — 배열을 통째 교체할지(`replace`), 이어붙여 distinct 할지(`concat`). 기본은 키별 인덱스 병합.
  - `opt.useDelTargetNull?: boolean` — target 값이 `null` 이면 해당 키 삭제(undefined 반환)로 처리.
  - Date/DateTime/DateOnly/Time/Uuid/Buffer 와 `arrayProcess:"replace"` 배열은 clone 으로 대체. source/target 타입이 다르면 Error.
- `merge3<S, O, T>(source, origin, target, optionsObj?): { conflict: boolean; result }` — 3-way 병합(공통조상 origin 기준). 한쪽만 변경되면 그 값 채택, 양쪽이 다르게 변경되면 `conflict = true`. `optionsObj` 는 키별 `equal` 옵션(`{ keys?, excludes?, ignoreArrayIndex? }`). S/O/T 는 `Record<string, TFlatType>`.

## 키 선택 / 정리

- `omit<T, K>(item, omitKeys: K[]): Omit<T, K>` — 지정 키 제외 얕은 복사.
- `omitByFilter<T>(item, omitKeyFn: (key) => boolean): T` — 콜백이 true 인 키 제외.
- `pick<T, K>(item, keys: K[]): Pick<T, K>` — 지정 키만 추림.
- `pickByType<T, A>(item, type: Type<A>)` — 주어진 생성자 타입(String/Number/Boolean/DateOnly/DateTime/Time/Uuid/Buffer)에 맞는 값만. (주의: 현재 구현은 `Object.keys(result)`(빈 객체)를 순회하여 사실상 빈 객체 반환 — 사용 전 확인 필요.)
- `clearUndefined<T>(obj): T` — 값이 `undefined` 인 키 삭제(in-place).
- `clear<T>(obj): {}` — 모든 키 삭제(in-place).
- `nullToUndefined<T>(obj): T | undefined` — null 을 undefined 로 재귀 치환. Date/DateTime/DateOnly/Time 은 그대로. `JsonConvert.parse` 가 내부 사용.
- `unflattenObject(flatObj): Record<string, any>` — `"a.b.c"` 형태의 평탄 키를 중첩 객체로 복원(`.` 구분).

## 동등 비교

- `equal(source, target, options?): boolean` — 깊은 동등성. Date 는 getTime, DateTime/DateOnly/Time 은 tick, Array/Map/Object 재귀 비교.
  - `options.includes?: string[]` — 이 키들만 비교.
  - `options.excludes?: string[]` — 이 키들은 비교 제외.
  - `options.ignoreArrayIndex?: boolean` — 배열을 순서 무시(집합) 비교.
  - `options.onlyOneDepth?: boolean` — 1단계만 `===` 비교(중첩 무시).

## 체인 경로 접근

문자열 체인은 `.`/`[]` 로 분해되고 숫자 세그먼트는 인덱스로 처리(`?`/`!`/따옴표 제거).

- `getChainValue(obj, chain): any` / `getChainValue(obj, chain, optional: true): any | undefined` — `"a.b[0].c"` 경로 값 조회. optional 이면 중간 undefined 안전.
- `setChainValue(obj, chain, value): void` — 경로 따라 set(중간 객체 없으면 `{}` 생성).
- `deleteChainValue(obj, chain): void` — 경로 끝 키 delete.
- `getChainValueByDepth<T, K>(obj, key, depth)` / `(..., optional: true)` — 같은 `key` 를 `depth` 번 반복 접근(예: linked-list/parent 체인). optional 이면 `?.`.

## 유효성 검증

`TValidateDef<T>` = `Type<WrappedType<T>>` | `Type<...>[]` | `IValidateDef<T>`. 즉 생성자 1개/배열/상세객체 모두 허용.

`IValidateDef<T>`:
- `type?: Type<WrappedType<T>> | Type<...>[]` — 허용 생성자(값의 `.constructor` 와 일치 검사). primitive 는 String/Number/Boolean.
- `notnull?: boolean` — true 면 undefined 불가(값 undefined 이고 notnull 아니면 검증 통과·skip).
- `includes?: T[]` — 화이트리스트(이 값들 중 하나여야 함).
- `displayValue?: boolean` — `...WithThrow` 에러 메시지에 값을 노출할지.
- `validator?: (value: UnwrappedType<NonNullable<T>>) => boolean | string` — 커스텀 검증. true=통과, string=실패 메시지, false=실패.

메서드:
- `validate<T>(value, def): IValidateResult<T> | undefined` — 단일 값 검증. 통과 시 undefined, 실패 시 `{ value, invalidateDef, message? }`(`invalidateDef` 는 위반한 규칙만). NaN 은 type 위반 처리.
- `validateObject<T>(obj, def: { [K in keyof T]?: TValidateDef<T[K]> }): { [K]?: IValidateResult }` — 객체 속성별 검증(체인 키 가능, `getChainValue` 사용). 위반 속성만 결과에 담김.
- `validateObjectWithThrow<T>(displayName, obj, def: TValidateObjectDefWithName<T>): void` — 위반 시 Error throw. `def` 각 항목은 `IValidateDefWithName`(= `IValidateDef` + `displayName: string`). `displayValue` true 면 메시지에 값 포함.
- `validateArray<T>(arr, def | (item) => def): IValidateArrayResult<T>[]` — 배열 각 항목 검증, 위반 항목만 `{ index, item, result }`.
- `validateArrayWithThrow<T>(displayName, arr, def | (item) => def): void` — 위반 시 항목 번호 포함 Error throw.

## 관련 export 타입

- `TValidateDef<T>` / `IValidateDef<T>` / `IValidateResult<T>` — 위 참조.
- `IValidateDefWithName<T>` — `IValidateDef<T> & { displayName: string }`.
- `TValidateObjectDefWithName<T>` — `{ [K in keyof T]?: IValidateDefWithName<T[K]> }`.
- `TUndefToOptional<T>` — `undefined` 를 포함하는 속성을 optional(`?`)로 바꾼 타입. `optToUndef<T>(obj: TUndefToOptional<T>): T` 가 역캐스팅 헬퍼.
- `TOptionalToUndef<T>` — optional 속성을 `값 | undefined` 필수 속성으로 바꾼 타입.
