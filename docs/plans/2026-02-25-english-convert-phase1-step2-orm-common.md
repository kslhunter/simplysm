# English Conversion — Phase 1 Step 2: orm-common Comments

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert all Korean comments, JSDoc, and region labels in `packages/orm-common/src/` to English.

**Architecture:** Read each file → translate comments/JSDoc/regions to English → build → test → commit.

**Tech Stack:** TypeScript, pnpm, vitest

**Reference:** `docs/plans/2026-02-24-codebase-english-conversion-design.md`

**Checklist:** `docs/references/codebase-english-conversion-checklist.md`

**Dependency:** Step 1 (core-common) should be complete first.

---

## Global Translation Rules

### What to Translate
- `//` single-line comments
- `/* */` block comments
- `/** */` JSDoc comments
- `//#region` and `//#endregion` labels

### What to KEEP (Korean)
- String literals inside `throw new Error(...)` — handled in Phase 2
- Korean encoding test data (not in orm-common, but in tests)

### Translation Style
- **Concise**: `// DDL` stays as-is, `// 수정` → `// Update`
- **Consistent**: Same term → same English across all files

---

## Files to Process

**Total: ~32 source files in `packages/orm-common/src/`**

### By Category

**Core** (5 files)
- [ ] `create-db-context.ts`
- [ ] `index.ts`
- [ ] `common.types.ts` (if exists)

**DDL** (5 files)
- [ ] `ddl/column-ddl.ts`
- [ ] `ddl/initialize.ts`
- [ ] `ddl/relation-ddl.ts`
- [ ] `ddl/schema-ddl.ts`
- [ ] `ddl/table-ddl.ts`

**Errors** (1 file)
- [ ] `errors/db-transaction-error.ts`

**Execution** (3 files)
- [ ] `exec/executable.ts`
- [ ] `exec/queryable.ts`
- [ ] `exec/search-parser.ts`

**Expressions** (2 files)
- [ ] `expr/expr-unit.ts`
- [ ] `expr/expr.ts`

**Query Builder** (7 files)
- [ ] `query-builder/base/expr-renderer-base.ts`
- [ ] `query-builder/base/query-builder-base.ts`
- [ ] `query-builder/mssql/mssql-expr-renderer.ts`
- [ ] `query-builder/mssql/mssql-query-builder.ts`
- [ ] `query-builder/mysql/mysql-expr-renderer.ts`
- [ ] `query-builder/mysql/mysql-query-builder.ts`
- [ ] `query-builder/postgresql/postgresql-expr-renderer.ts`
- [ ] `query-builder/postgresql/postgresql-query-builder.ts`
- [ ] `query-builder/query-builder.ts`

**Schema** (6 files)
- [ ] `schema/factory/column-builder.ts`
- [ ] `schema/factory/index-builder.ts`
- [ ] `schema/factory/relation-builder.ts`
- [ ] `schema/procedure-builder.ts`
- [ ] `schema/table-builder.ts`
- [ ] `schema/view-builder.ts`

**Types** (3 files)
- [ ] `types/column.ts`
- [ ] `types/db.ts`
- [ ] `types/expr.ts`
- [ ] `types/query-def.ts`

**Utils** (1 file)
- [ ] `utils/result-parser.ts`

---

## Task: Translate All Comments

### Step 1: Scan for Korean

```bash
grep -rn '[가-힣]' packages/orm-common/src/ --include='*.ts'
```

Expected: All Korean lines (mostly comments).

### Step 2: Translate files in batches

Work by category (5-6 files per batch):
1. Read files
2. Translate comments/JSDoc/regions
3. Edit with corrections
4. Verify no untranslated Korean remains in comments

### Step 3: Verify

```bash
grep -rn '[가-힣]' packages/orm-common/src/ --include='*.ts' | grep -v 'throw new Error\|console\.'
```

Expected: Only error/log strings remain (no comments with Korean).

### Step 4: Build

```bash
pnpm build orm-common
```

### Step 5: Test

```bash
pnpm vitest packages/orm-common/tests/ --run
```

### Step 6: Commit

```bash
git add packages/orm-common/src/
git commit -m "refactor: convert Korean comments to English in orm-common"
```

---

## Translation Glossary (orm-common context)

| Korean | English |
|--------|---------|
| 데이터베이스 | Database |
| DB | DB |
| 테이블 | Table |
| 컬럼 | Column |
| 열 | Column |
| 행 | Row |
| 레코드 | Record |
| 쿼리 | Query |
| 선택 | Select |
| 삽입 | Insert |
| 수정 | Update |
| 삭제 | Delete |
| DDL | DDL |
| DML | DML |
| DQL | DQL |
| 스키마 | Schema |
| 관계 | Relation |
| 인덱스 | Index |
| 트랜잭션 | Transaction |
| 연결 | Connection |
| 연결풀 | Connection pool |
| 실행기 | Executor |
| 빌더 | Builder |
| 렌더러 | Renderer |
| 파서 | Parser |
| 표현식 | Expression |
| 조건 | Condition |
| 조인 | Join |
| 그룹핑 | Grouping |
| 정렬 | Sort |
| 페이지 | Page |
| 제약 | Constraint |
| 주키 | Primary key |
| 외래키 | Foreign key |
| 유니크 | Unique |
| 널 | Null |
| 기본값 | Default value |
| 타입 | Type |
| 길이 | Length |
| 정밀도 | Precision |
| 소수점 | Decimal |
| 매핑 | Mapping |
| 변환 | Transform |
| 처리 | Processing |
| 계산 | Calculate |
| 필터 | Filter |
| 검증 | Validation |
| 오류 | Error |
| 예외 | Exception |
| 결과 | Result |

---

## Notes

1. **DDL files** tend to have more comments describing SQL operations — make sure to translate thoroughly.

2. **Query builder complexity**: Files in `query-builder/` contain complex logic with detailed comments. Take time to understand the logic before translating complex comments.

3. **Brand consistency**: Use "Database" not "DB" in full sentences, but keep "DB" in technical names like "DbContext".

4. **Work pace**: orm-common is large (~32 files). Plan to do this over 2-3 focused sessions.

---

## Success Criteria

- ✅ All Korean comments translated to English in orm-common/src/
- ✅ All Korean region labels translated
- ✅ All Korean JSDoc translated
- ✅ Error/log messages left unchanged (Phase 2)
- ✅ `pnpm build orm-common` passes
- ✅ `pnpm vitest packages/orm-common/tests/ --run` passes
- ✅ Single commit with all changes

