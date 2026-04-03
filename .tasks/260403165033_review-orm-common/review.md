# orm-common 심층 리뷰

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/orm-common/src/` |
| 일시 | 2026-04-03 16:50 |
| 파일 수 | 34개 |
| 발견 이슈 | **26건** (Critical 1, Medium 12, Low 13) |

---

## Critical

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/orm-common/src/utils/result-parser.ts:271-282
title: serializeGroupKey 구분자 충돌로 인한 JOIN 결과 데이터 병합 오류
description:
  serializeGroupKey는 "|"와 ":"를 구분자로 사용하여 키-값 쌍을 직렬화한다.
  값 자체에 "|"나 ":"가 포함되면 서로 다른 레코드가 동일한 직렬화 결과를 가질 수 있다.

  예시:
    레코드 A: { a: "x|b:y" }        → "a:x|b:y"
    레코드 B: { a: "x", b: "y" }    → "a:x|b:y"

  두 레코드가 동일한 그룹으로 병합되어 JOIN 데이터가 잘못 합쳐지거나 레코드가 손실된다.
  실제 DB 데이터에서 이메일(user@domain:port), URL(https://...), 파이프 구분 텍스트 등에
  이 문자들이 자주 등장한다.
suggestion:
  값을 이스케이프하거나, length-prefixed 인코딩을 적용한다.
  예: key.length + ":" + key + value.length + ":" + String(value)
```

---

## Medium

```
id: LOGIC-002
severity: Medium
category: 로직
location: packages/orm-common/src/db-context.ts:137-185
title: connect()에서 commitTransaction 실패 시 이중 롤백 시도
description:
  fn() 성공 후 commitTransaction()이 실패하면 catch 블록으로 진입하여 rollbackTransaction()을
  시도한다. 네트워크 오류로 커밋이 이미 완료되었으나 응답을 못 받은 경우, 롤백이 부적절하거나
  이미 커밋된 상태에서 불필요한 롤백 에러가 발생할 수 있다.
suggestion:
  commitTransaction 실패를 fn() 실패와 분리하여 처리하거나,
  커밋 실패 시 롤백 실패를 허용하는 별도 에러 핸들링을 적용한다.
```

```
id: LOGIC-003
severity: Medium
category: 로직
location: packages/orm-common/src/db-context.ts:137-209
title: connect()/connectWithoutTransaction()에서 close() 실패 시 status 불일치
description:
  connect()와 connectWithoutTransaction()에서 this._executor.close()가 예외를 던지면
  status가 "connect"에서 "ready"로 전이되지 않는다. 이후 connect() 재호출 시
  executor.connect()가 중복 호출되어 예측 불가능한 상태가 된다.
  catch 블록 내의 close() 실패도 동일한 문제를 가진다.
suggestion:
  close()를 try-finally로 감싸서 status를 항상 "ready"로 전이시킨다.
```

```
id: LOGIC-004
severity: Medium
category: 로직
location: packages/orm-common/src/ddl/initialize.ts:57-72
title: 다중 DB 초기화 시 createAllObjects가 단일 DB에만 수행
description:
  options.dbs에 여러 DB를 전달하면 clearSchema는 각 dbName에 대해 반복하지만,
  createAllObjects는 dbNames와 무관하게 1회만 호출된다.
  JSDoc은 "초기화 대상 데이터베이스 목록"이라고 명시하지만,
  실제로는 clear만 다중 DB에 적용되고 create는 builder의 database에만 적용된다.
suggestion:
  의도를 명확히 하여 JSDoc을 수정하거나,
  createAllObjects를 dbNames 루프 안에서 호출하도록 변경한다.
```

```
id: LOGIC-005
severity: Medium
category: 로직
location: packages/orm-common/src/ddl/initialize.ts:79-108
title: force=false + 다중 DB에서 _migration 확인이 단일 DB에만 수행
description:
  force=false 분기에서 db._migration().execute()는 db의 기본 database에 대해서만 실행된다.
  options.dbs에 여러 DB를 전달해도 migration 상태 확인과 객체 생성은 기본 DB 기준 1회만 수행.
  LOGIC-004와 동일한 맥락의 다중 DB 지원 불일치.
suggestion:
  LOGIC-004와 함께 다중 DB 지원 의도를 명확히 정의 후 force=false 분기도 수정한다.
```

```
id: LOGIC-006
severity: Medium
category: 로직
location: packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts:379
title: MySQL isoWeek에서 WEEK() 모드 값이 부정확 — ISO 주 번호와 불일치
description:
  WEEK(date, 1)은 "주의 시작이 월요일, 범위 0-53, 첫 주 = 해당 연도 첫 월요일"이다.
  ISO 8601 주 번호는 mode=3 (범위 1-53, 첫 주 = 4일 이상 포함하는 첫 주)이어야 한다.
  예: 2021-01-01(금)에서 mode=1은 week=0, ISO 8601은 week=53(전년도).
  MSSQL(DATEPART(ISO_WEEK,...))과 PostgreSQL(EXTRACT(WEEK FROM...))은 ISO 준수.
suggestion:
  WEEK(date, 3) 또는 WEEKOFYEAR()로 변경한다.
```

```
id: LOGIC-007
severity: Medium
category: 로직
location: packages/orm-common/src/query-builder/mssql/mssql-expr-renderer.ts:524
title: MSSQL random()이 NEWID()를 반환하여 dialect간 타입 불일치
description:
  MySQL RAND()와 PostgreSQL RANDOM()은 0.0~1.0 float를 반환하지만,
  MSSQL NEWID()는 UNIQUEIDENTIFIER(GUID)를 반환한다.
  ORDER BY random() 용도에서는 동작하지만,
  random() * 100 같은 산술 연산에서는 MSSQL만 실패한다.
suggestion:
  랜덤 정렬 전용이라면 문서에 명시한다.
  숫자 난수가 필요하면 RAND() 또는 ABS(CHECKSUM(NEWID())) 패턴을 사용한다.
```

```
id: LOGIC-008
severity: Medium
category: 로직
location: packages/orm-common/src/query-builder/postgresql/postgresql-query-builder.ts:240-327
title: PostgreSQL UPDATE/DELETE에서 top/limit가 무시됨
description:
  MySQL의 update()/delete()는 def.top/def.limit이 있으면 LIMIT 절을 생성하고,
  MSSQL도 TOP N을 생성한다. 그러나 PostgreSQL은 두 연산 모두에서
  top과 limit을 완전히 무시하여 dialect간 동작 차이가 발생한다.
suggestion:
  CTE를 사용한 우회 패턴을 적용하거나, 미지원임을 에러로 명시한다.
  예: WITH cte AS (SELECT pk FROM table WHERE ... LIMIT N)
      UPDATE table SET ... WHERE pk IN (SELECT pk FROM cte)
```

```
id: LOGIC-009
severity: Medium
category: 로직
location: packages/orm-common/src/query-builder/mssql/mssql-query-builder.ts:454-459
title: MSSQL renameColumn에서 bracket-wrap된 식별자가 sp_rename에 전달
description:
  this.tableName(def.table)이 [db].[dbo].[Table] 형태의 wrap된 이름을 반환하고,
  이것을 escapeString()으로 이스케이프한 뒤 sp_rename에 전달한다.
  sp_rename @objname에 bracket-quoted 이름이 정상 동작하는지 검증 필요.
  일반적으로 sp_rename은 bracket 없는 dot-separated 이름을 기대한다.
suggestion:
  sp_rename에 전달하는 @objname은 wrap 없이 원시 이름(db.dbo.Table.column)을 사용한다.
```

```
id: LOGIC-010
severity: Medium
category: 로직
location: packages/orm-common/src/exec/search-parser.ts:167-168
title: termToLikePattern에서 미정의 이스케이프 시퀀스의 backslash 이중 이스케이프
description:
  전처리 단계(93-99행)에서 \\, \*, \+, \-, \" 등 정의된 6종만 플레이스홀더로 치환한다.
  사용자가 \a처럼 정의되지 않은 이스케이프 시퀀스를 입력하면 \가 그대로 남아
  167행에서 \\로 이스케이프되어 SQL에서 리터럴 backslash + a로 검색된다.
suggestion:
  미정의 이스케이프 시퀀스에 대한 처리 정책을 명확히 한다.
  예: 인식되지 않는 escape는 backslash를 제거하고 리터럴 문자로 처리.
```

```
id: LOGIC-011
severity: Medium
category: 로직
location: packages/orm-common/src/exec/executable.ts:50-54
title: executable params 키가 meta.params에 없을 때 런타임 TypeError
description:
  Object.keys(params).map으로 params 키를 순회하면서 meta.params![key]에 접근한다.
  params에는 있지만 meta.params에는 없는 키가 전달되면
  meta.params![key]가 undefined가 되어 .meta.type 접근 시 TypeError 발생.
  TypeScript 타입으로는 보호되지만, as any 캐스팅이나 dynamic 호출 시 발생 가능.
suggestion:
  meta.params의 키를 기준으로 순회하거나, 개별 키 존재 여부 가드를 추가한다.
```

```
id: LOGIC-012
severity: Medium
category: 로직
location: packages/orm-common/src/schema/view-builder.ts:171
title: ViewBuilder.relations()가 TRelations 타입 파라미터를 갱신하지 않음
description:
  ViewBuilder.relations()의 반환 타입에서 새 관계 T를 TData에 병합하면서도,
  세 번째 타입 파라미터 TRelations는 기존 값 그대로 유지된다.
  반면 TableBuilder.relations()는 새 관계 T를 TRelations 자리에 정확히 넣는다.
  $relations에 접근하여 관계 메타데이터를 순회하는 소비 코드에서
  런타임 meta.relations와 타입 레벨 $relations가 불일치하게 된다.
suggestion:
  반환 타입을 ViewBuilder<TDbContext, TData & InferDeepRelations<T>, T>로 변경하여
  TableBuilder와 동일한 패턴으로 통일한다.
```

```
id: LOGIC-013
severity: Medium
category: 로직
location: packages/orm-common/src/utils/result-parser.ts:279
title: serializeGroupKey에서 null과 문자열 "null" 구분 불가
description:
  String(v)는 null일 때 "null", undefined일 때 "undefined"를 반환하여
  실제 null 값과 문자열 "null"이 동일하게 직렬화된다.
  LOGIC-001과 연관되며, 그룹 키 충돌 범위를 넓힌다.
suggestion:
  LOGIC-001의 length-prefixed 방식을 적용하면 자연스럽게 해결된다.
  또는 null/undefined를 별도 고유 토큰으로 구분한다.
```

---

## Low

```
id: LOGIC-014
severity: Low
category: 로직
location: packages/orm-common/src/db-context.ts:137-148
title: connect()/connectWithoutTransaction()에서 이미 연결된 상태 재진입 가드 부재
description:
  transaction()은 "이미 TRANSACTION 상태입니다" 가드가 있지만,
  connect()와 connectWithoutTransaction()에는 status가 "ready"인지 확인하는 가드가 없다.
  status가 "connect" 또는 "transact"인 상태에서 재호출하면 executor.connect()가 이중 호출된다.
suggestion:
  진입부에 if (this.status !== "ready") throw new Error(...) 가드를 추가한다.
```

```
id: LOGIC-015
severity: Low
category: 로직
location: packages/orm-common/src/types/column.ts:151-161
title: inferColumnPrimitiveStr에서 undefined 입력 시 에러 메시지 부정확
description:
  undefined가 전달되면 "알 수 없는 값 타입: undefined" 에러가 발생하지만,
  undefined는 NULL을 나타내는 의도적 값이다.
  "NULL 값으로는 타입을 추론할 수 없습니다"가 더 정확하다.
suggestion:
  undefined를 먼저 검사하여 명확한 에러 메시지를 제공한다.
```

```
id: LOGIC-016
severity: Low
category: 로직
location: packages/orm-common/src/expr/expr.ts:915,937
title: expr.ceil/floor JSDoc 예제에서 존재하지 않는 expr.divide 참조
description:
  ceil과 floor의 JSDoc 예제에서 expr.divide(o.itemCount, 10)을 사용하지만,
  expr 네임스페이스에 divide 함수가 정의되어 있지 않다.
  이 예제를 참고하여 개발하는 사용자가 존재하지 않는 API를 호출하게 된다.
suggestion:
  JSDoc 예제를 실제 존재하는 API로 수정한다.
```

```
id: LOGIC-017
severity: Low
category: 로직
location: packages/orm-common/src/query-builder/mysql/mysql-query-builder.ts:731-738
title: MySQL clearSchema 동적 SQL에서 테이블명 식별자 이스케이프 누락
description:
  GROUP_CONCAT(table_name)으로 가져온 테이블명을 CONCAT('DROP TABLE IF EXISTS ', @tables)로
  그대로 연결한다. 테이블명에 예약어나 특수문자가 포함되면 DROP TABLE 문이 실패한다.
  MSSQL 구현은 QUOTENAME()을 사용하여 식별자를 안전하게 감싸고 있다.
suggestion:
  GROUP_CONCAT에서 테이블명을 backtick으로 감싼다.
```

```
id: LOGIC-018
severity: Low
category: 로직
location: packages/orm-common/src/utils/result-parser.ts:476-499
title: mergeJoinData 중복 검사에서 중첩 객체가 [object Object]로 직렬화
description:
  serializeGroupKey는 프리미티브 값만 String(v)로 직렬화하며,
  중첩 객체(하위 JOIN 데이터)가 포함되면 "[object Object]"로 직렬화된다.
  다중 레벨 JOIN에서 하위 데이터만 다른 두 레코드가 동일 해시를 가져
  후속 행이 중복 판정되어 누락될 수 있다.
suggestion:
  중복 검사 시 중첩 객체 key를 제외하고 현재 레벨의 프리미티브만으로 비교하거나,
  객체를 재귀적으로 직렬화한다.
```

```
id: LOGIC-019
severity: Low
category: 로직
location: packages/orm-common/src/query-builder/postgresql/postgresql-query-builder.ts:611-619
title: PostgreSQL execProc에서 RETURNS TABLE 함수 호출 시 컬럼 미확장
description:
  RETURNS TABLE(...)로 정의된 함수는 SELECT * FROM func() 형태로 호출해야
  테이블 형태의 결과를 받을 수 있다. 현재 SELECT func() 형태는
  단일 composite type 컬럼으로 반환되어 호출자 기대와 다를 수 있다.
suggestion:
  RETURNS TABLE 함수는 SELECT * FROM func(params) 형태로 호출하도록 변경한다.
```

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/orm-common/src/db-context.ts:211-246
title: transaction() 실패 시 원래 에러가 롤백 에러로 덮어씌워질 수 있음
description:
  fn() 실패 후 rollbackTransaction()도 실패하면 롤백 에러(err1)만 호출자에게 전달되고
  fn()에서 발생한 원래 에러(err)는 유실된다.
suggestion:
  롤백 에러를 원래 에러에 cause로 첨부한다.
  예: throw new Error("rollback failed", { cause: err1 })
```

```
id: DESIGN-002
severity: Low
category: 설계
location: packages/orm-common/src/exec/queryable.ts:1129-1131
title: exists()가 count() 기반으로 전체 행을 스캔
description:
  exists() 내부에서 this.count()를 호출하여 전체 매칭 행 수를 센 뒤 > 0으로 비교한다.
  SQL EXISTS 또는 SELECT TOP 1은 첫 행 발견 시 즉시 중단하지만,
  COUNT(*)는 모든 매칭 행을 스캔해야 한다.
suggestion:
  this.top(1).execute()로 변경하거나 EXISTS 서브쿼리를 생성한다.
```

```
id: DESIGN-003
severity: Low
category: 설계
location: packages/orm-common/src/utils/result-parser.ts:401-408
title: result-parser __hashSet__ 접두사 기반 임시 속성이 데이터 key와 충돌 가능
description:
  groupRecordsRecursively는 중복 검사를 위해 "__hashSet__" 접두사 임시 속성을
  결과 객체에 직접 삽입하고 마지막에 제거한다.
  DB 컬럼명이 "__hashSet__"로 시작하면 해당 데이터가 삭제된다.
suggestion:
  WeakMap(Chrome 36+)이나 별도 Map을 사용하여 hashSet을 관리한다.
```

```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/orm-common/src/schema/view-builder.ts:58
title: ViewBuilder.$inferSelect에 관계 타입이 포함되지 않음 (TableBuilder와 불일치)
description:
  TableBuilder.$inferSelect는 InferColumns<TColumns> & InferDeepRelations<TRelations>로
  column 타입과 관계 타입을 모두 포함한다.
  ViewBuilder.$inferSelect는 TData만 선언되어 있어 타입 추론 전략이 다르다.
  LOGIC-012와 연관.
suggestion:
  LOGIC-012 해결과 함께 ViewBuilder.$inferSelect도 통일을 검토한다.
```

```
id: CONSIST-002
severity: Low
category: 일관성
location: packages/orm-common/src/schema/factory/relation-builder.ts:307-342
title: createRelationFactory가 ViewBuilder에도 FK 메서드를 런타임에 제공
description:
  반환 타입은 조건부 타입으로 ViewBuilder일 때 FK 메서드를 숨기지만,
  런타임 구현체는 항상 foreignKey/foreignKeyTarget를 포함한다.
  as any 등 타입 우회 시 View에서 FK 생성이 가능하게 된다.
suggestion:
  타입 레벨 방어가 충분하다면 현행 유지 가능.
  방어적으로 ViewBuilder일 때 호출 시 에러를 던지는 것도 고려.
```

```
id: CONSIST-003
severity: Low
category: 일관성
location: packages/orm-common/src/ddl/table-ddl.ts:180-189 / packages/orm-common/src/db-context.ts:103-111
title: getQueryDefObjectName 함수가 두 곳에 중복 정의
description:
  table-ddl.ts에 standalone 함수로, db-context.ts에 메서드로 동일한 로직이 존재한다.
  하나가 변경될 때 다른 쪽이 동기화되지 않을 위험이 있다.
suggestion:
  한 곳에서만 정의하고 다른 쪽에서 참조하도록 통합한다.
```

```
id: CONSIST-004
severity: Low
category: 일관성
location: packages/orm-common/src/ddl/relation-ddl.ts:32-52
title: getAddForeignKeyQueryDef와 getAddIndexQueryDef의 추상화 수준 불일치
description:
  FK 함수는 DbContextBase를 받아 내부에서 이름 변환을 수행하고,
  Index 함수는 이미 변환된 QueryDefObjectName을 받는다.
  함수 시그니처의 추상화 수준이 다르다.
suggestion:
  두 함수 모두 일관된 추상화 수준을 유지하도록 시그니처를 맞춘다.
```

```
id: PERF-001
severity: Low
category: 성능
location: packages/orm-common/src/db-context.ts:94-97
title: executeDefs에서 DDL 타입 체크를 Array.includes로 매번 수행
description:
  defs 배열의 각 요소에 대해 DDL_TYPES(19개) 배열의 includes를 수행한다.
  대량 batch 실행 시 O(defs * 19). Set을 사용하면 O(defs)로 줄일 수 있다.
suggestion:
  DDL_TYPES를 모듈 레벨에서 Set으로 변환한다.
```
