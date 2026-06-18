# @simplysm/sd-orm-common — 유틸 (SdOrmUtils, DbDefUtils)

ORM 내부에서 쓰이는 정적 유틸. 결과 파싱은 어댑터/테스트에서 직접 호출할 수 있고, 정의 메타는 데코레이터와 도구성 코드에서 쓴다.

## SdOrmUtils

`class SdOrmUtils` (static 메서드 모음).
- `parseQueryResultAsync<T>(orgResults: any[], option?: IQueryResultParseOption, yieldInterval = 50): Promise<T[]>` — DB raw 결과를 (1) 컬럼 `dataType` 별 타입 변환(`DateTime`/`DateOnly`/`Time`/`Uuid`/`Boolean`/`Number`/기타) → (2) 점 표기 키(`"user.name"`)를 JOIN 키 기준으로 중첩 객체 트리로 재조립한다. `option.joins[key].isSingle` 이 true 면 단일 객체(여러 건이면 부모 행 분할), false 면 배열. 전부 null 인 행은 제외. `yieldInterval` = 이 건수마다 이벤트루프 양보(대용량 블로킹 완화). 테스트(`tests/parse-query-result.spec.ts`)가 기본 타입/JOIN 재구성을 검증.
- `replaceString(str): string` — 작은따옴표를 `''` 로 이스케이프(SQL 리터럴용).
- `canConvertToQueryValue(value): value is TEntityValue<TQueryValue>` — 값이 쿼리값으로 쓸 수 있는 타입인지(undefined/boolean/number/string, 또는 QueryUnit/Number/String/Boolean/DateOnly/DateTime/Time/Uuid/Buffer 인스턴스).
- `getQueryValueType<T>(value): Type<T> | undefined` — 값의 런타임 타입 생성자 추출(QueryUnit 이면 그 `type`, undefined 면 undefined, 미인식이면 throw). select 파싱/CASE 타입 추론에 사용.
- `getQueryValueFields<T>(entity: TEntity<T>, availableDepth?): TEntityValue<any>[]` — 엔티티 트리에서 쿼리값 가능한 리프들을 평탄 수집(`availableDepth` 로 재귀 깊이 제한).

## DbDefUtils

`class DbDefUtils` (static). `@Table` 등이 클래스에 `Reflect` 메타키 `"sd-orm-table-def"` 로 저장한 `ITableDef` 를 읽고/병합한다. 데코레이터 구현이 이 메서드들을 호출.
- `getTableDef(tableType: Type<any>, throws = true): ITableDef` — 정의 조회. `throws=true`(기본)인데 없으면 `@Table 미지정` throw, `false` 면 빈 기본 정의 반환.
- `setTableDef(tableType, tableDef)` — 정의 통째 설정.
- `mergeTableDef(tableType, target: Partial<ITableDef>)` — 기존 정의에 얕은 병합(`@Table` 이 사용).
- `addColumnDef(tableType, def: IColumnDef)` — `propertyKey` 기준 컬럼 병합(`@Column`).
- `addForeignKeyDef` / `addReferenceKeyDef(tableType, def)` — `propertyKey` 기준 FK/참조키 병합.
- `addForeignKeyTargetDef` / `addReferenceKeyTargetDef(tableType, def)` — 역방향 타깃 병합.
- `addIndexDef(tableType, def: IIndexDef)` — 같은 `name` 인덱스가 있으면 컬럼을 `columnPropertyKey` 기준 병합, 없으면 추가(`@Index` 가 컬럼 단위로 호출하므로 복합 인덱스가 누적됨).
