# 코드 리뷰: class 기반 DbContext

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/orm-common/src` (변경 파일 4개) |
| 일시 | 2026-04-03 |
| 파일 수 | 4 |
| 이슈 수 | 3 |

## 이슈 목록

### Medium

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/orm-common/src/types/db-context-def.ts:40-84
title: Dead code — DbContextDef, DbContextInstance, DbContextConnectionMethods 타입이 더 이상 참조되지 않음
description: defineDbContext/createDbContext 삭제 후 이 타입들을 사용하는 코드가 없다.
  DbContextBase, DbContextStatus, DbContextDdlMethods만 아직 사용 중이다.
suggestion: DbContextDef, DbContextInstance, DbContextConnectionMethods를 db-context-def.ts에서 제거
```

```
id: CONSIST-002
severity: Medium
category: 일관성
location: packages/orm-common/src/db-context.ts:49
title: JSDoc 예시에 static migrations 잔재
description: migrations가 인스턴스 프로퍼티로 변경되었는데 JSDoc 예시가 아직 `static migrations`로 되어 있다.
suggestion: JSDoc 예시를 `migrations: Migration[] = [...]`로 수정
```

### Low

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/orm-common/src/ddl/initialize.ts:39-45
title: initialize()의 db/dbContext 파��미터 중복
description: initialize(db, dbContext, options)에서 db와 dbContext는 항상 같은 DbContext 인스턴스.
  두 파라미터로 분리된 이유는 기존 함수형 API에서 db(실행기)와 def(정의)가 별개였기 때문인데,
  class 기반에서는 하나의 인스턴��가 두 역할을 겸한다.
suggestion: 단일 파라미터로 통합 — initialize(dbContext, options)
```
