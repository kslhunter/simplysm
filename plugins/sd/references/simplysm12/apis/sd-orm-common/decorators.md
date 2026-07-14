# @simplysm/sd-orm-common — 엔티티 정의 데코레이터

클래스/프로퍼티에 붙여 테이블 정의(`ITableDef`)를 `Reflect` 메타데이터로 누적함. 정의는 `DbContext.tableDefs`/`Queryable`/초기화·마이그레이션에서 읽힘. 모든 데코레이터는 `@simplysm/sd-core-common` 의 `TClassDecoratorReturn`/`TPropertyDecoratorReturn` 을 반환. `@Column` 의 타입 추론은 `Reflect.getMetadata("design:type")` 에 의존하므로 emitDecoratorMetadata 활성화 필요.

## @Table&lt;T&gt;(def)

클래스를 테이블/뷰/프로시저로 등록. `def`:

- `description: string` — 테이블 설명(필수). `Queryable.tableDescription` 등으로 노출.
- `database?: string` — 소속 DB명. 미지정 시 `db.opt.database`.
- `schema?: string` — 스키마명. 미지정 시 `db.opt.schema`.
- `name?: string` — 테이블명. 미지정 시 클래스명 사용.
- `view?: (db) => Queryable<DbContext, any>` — 지정 시 이 테이블을 VIEW 로 생성(초기화 시 해당 Queryable 의 SELECT 정의 사용).
- `procedure?: string` — 지정 시 프로시저 본문. `StoredProcedure` 로 실행.

## @Column&lt;T&gt;(columnDef)

프로퍼티를 컬럼으로 등록. propertyKey 기준 병합. `columnDef`:

- `description: string` — 컬럼 설명(필수).
- `name?: string` — 실제 컬럼명. 미지정 시 propertyKey.
- `dataType?: TSdOrmDataType` — 명시적 DB 타입(README의 TSdOrmDataType 참고). 미지정 시 TS 타입에서 자동 추론.
- `nullable?: boolean` — NULL 허용 여부.
- `autoIncrement?: boolean` — 자동 증가(IDENTITY) 여부. INSERT/UPSERT 시 IDENTITY_INSERT 처리에 사용.
- `primaryKey?: number` — PK 순번(1-base). 지정된 컬럼들이 순번 오름차순으로 복합 PK 구성.

## @ForeignKey&lt;T&gt;(columnNames, targetTypeFwd, description)

FK 보유 측(다대일의 "다") 프로퍼티에 부착. JOIN 시 `include` 로 단일 객체 연결.

- `columnNames: (keyof T)[]` — 이 테이블에서 FK 를 구성하는 컬럼 프로퍼티키 배열(대상 PK 와 개수 일치 필요). 원소가 `"=리터럴"` 형태면 상수 비교 조건으로 처리(`Queryable._include` 분기).
- `targetTypeFwd: () => Type<any>` — 대상(부모) 테이블 클래스 지연 참조(순환 import 회피).
- `description: string`.

## @ForeignKeyTarget&lt;T, P&gt;(sourceTypeFwd, foreignKeyPropertyKey, description, multiplicity?)

FK 의 대상 측(부모)에서 역방향 컬렉션/단일을 노출.

- `sourceTypeFwd: () => Type<P>` — 자신을 FK 로 참조하는 자식 테이블 클래스 지연 참조.
- `foreignKeyPropertyKey: keyof P` — 자식 테이블의 `@ForeignKey` 프로퍼티키.
- `description: string`.
- `multiplicity?: "single"` — `"single"` 이면 1:1 로 보고 `joinSingle`(단일 객체), 미지정 시 1:N 로 `join`(배열). `include` 시 분기됨.

## @ReferenceKey / @ReferenceKeyTarget

`@ForeignKey`/`@ForeignKeyTarget` 와 동일한 인자·동작이지만 실제 DB FK 제약을 만들지 않는 논리적 관계(별도 메타 슬롯 `referenceKeys`/`referenceKeyTargets` 에 저장). `include` 시에는 FK 와 동일하게 JOIN 으로 처리되나 초기화 시 ADD FOREIGN KEY/INDEX 생성 대상에서 제외됨.

- `@ReferenceKey<T>(columnNames, targetTypeFwd, description)`.
- `@ReferenceKeyTarget<T, P>(sourceTypeFwd, referenceKeyPropertyKey, description, multiplicity?)`.

## @Index&lt;T&gt;(def?)

프로퍼티 단위로 인덱스 컬럼 등록. 같은 `name` 이면 여러 컬럼이 하나의 인덱스로 병합. `def`:

- `name?: string` — 인덱스명. 미지정 시 propertyKey(단일 컬럼 인덱스).
- `order?: number` — 복합 인덱스 내 컬럼 순서. 미지정 1.
- `orderBy?: "ASC" | "DESC"` — 정렬 방향. 미지정 `"ASC"`.
- `unique?: boolean` — 유니크 인덱스 여부. 미지정 false.

## 관련 정의 타입 (참조용)

`@Table` 메타데이터의 형태(직접 다룰 일은 드묾, `DbDefUtils` 로 접근):

- `ITableNameDef { database?; schema?; name }` / `ITableDef`(columns/foreignKeys/foreignKeyTargets/indexes/referenceKeys/referenceKeyTargets/view?/procedure? 포함).
- `IColumnDef`, `IForeignKeyDef`, `IForeignKeyTargetDef`(`isSingle`), `IIndexDef`(`columns[].order/orderBy/unique`), `IReferenceKeyDef`, `IReferenceKeyTargetDef`. 각 Def 의 `typeFwd`/`targetTypeFwd`/`sourceTypeFwd` 는 지연 타입 해석 함수.
