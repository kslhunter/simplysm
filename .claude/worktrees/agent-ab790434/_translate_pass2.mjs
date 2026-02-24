import fs from "fs";
import path from "path";

const translations = [
  // column-builder.ts
  ["컬럼 정의 빌더", "Column definition builder"],
  [
    "Fluent API를 통해 컬럼의 타입, nullable, autoIncrement, default, 설명을 정의",
    "Define column type, nullable, autoIncrement, default, and description through Fluent API",
  ],
  ["TableBuilder.columns()에서 사용", "Used in TableBuilder.columns()"],
  ["@template TValue - 컬럼 값 타입", "@template TValue - Column value type"],
  ["@template TMeta - 컬럼 메타데이터 타입", "@template TMeta - Column metadata type"],
  ["// varchar(20), default 값", "// varchar(20), default value"],
  [
    "@see {@link createColumnFactory} 컬럼 팩토리",
    "@see {@link createColumnFactory} Column factory",
  ],
  ["@see {@link TableBuilder} 테이블 빌더", "@see {@link TableBuilder} Table builder"],
  ["@param meta - 컬럼 메타데이터", "@param meta - Column metadata"],
  ["Auto Increment 설정", "Auto Increment setting"],
  [
    "INSERT 시 자동 증가. INSERT용 타입 추론에서 optional로 처리",
    "Auto-increments on INSERT. Treated as optional in INSERT type inference",
  ],
  ["@returns 새 ColumnBuilder 인스턴스", "@returns New ColumnBuilder instance"],
  ["Nullable 설정", "Nullable setting"],
  ["NULL 허용. 값 타입에 undefined 추가", "Allow NULL. Adds undefined to value type"],
  ["기본값 설정", "Default value setting"],
  [
    "INSERT 시 값 미지정 시 사용. INSERT용 타입 추론에서 optional로 처리",
    "Used when value is not specified on INSERT. Treated as optional in INSERT type inference",
  ],
  ["@param value - 기본값", "@param value - Default value"],
  ["컬럼 설명 설정", "Column description setting"],
  [
    "@param desc - 컬럼 설명 (DDL 주석으로 사용)",
    "@param desc - Column description (used as DDL comment)",
  ],
  ["// 컬럼 팩토리", "// Column factory"],
  ["컬럼 빌더 팩토리 생성", "Create column builder factory"],
  [
    "TableBuilder.columns()에서 사용하는 컬럼 타입 팩토리",
    "Column type factory used in TableBuilder.columns()",
  ],
  [
    "모든 기본 데이터 타입에 대한 빌더 생성 메서드 제공",
    "Provides builder creation methods for all base data types",
  ],
  [
    "@returns 컬럼 타입별 빌더 생성 메서드를 포함한 객체",
    "@returns Object containing builder creation methods per column type",
  ],
  ["// 숫자 타입", "// Numeric types"],
  ["// 문자열 타입", "// String types"],
  ["// 기타 타입", "// Other types"],
  ["정수 (INT, 4바이트)", "Integer (INT, 4 bytes)"],
  ["대형 정수 (BIGINT, 8바이트)", "Large integer (BIGINT, 8 bytes)"],
  ["단정밀도 부동소수점 (FLOAT)", "Single-precision floating point (FLOAT)"],
  ["배정밀도 부동소수점 (DOUBLE)", "Double-precision floating point (DOUBLE)"],
  ["고정 소수점 (DECIMAL)", "Fixed-point decimal (DECIMAL)"],
  ["@param precision - 전체 자릿수", "@param precision - Total digits"],
  ["@param scale - 소수점 자릿수", "@param scale - Decimal places"],
  ["가변 길이 문자열 (VARCHAR)", "Variable-length string (VARCHAR)"],
  ["@param length - 최대 문자 수", "@param length - Maximum character count"],
  ["고정 길이 문자열 (CHAR)", "Fixed-length string (CHAR)"],
  ["대용량 텍스트 (TEXT/LONGTEXT)", "Large text (TEXT/LONGTEXT)"],
  ["바이너리 데이터 (BLOB/VARBINARY)", "Binary data (BLOB/VARBINARY)"],
  ["불리언 (TINYINT(1)/BIT/BOOLEAN)", "Boolean (TINYINT(1)/BIT/BOOLEAN)"],
  ["날짜+시간 (DATETIME)", "Date+time (DATETIME)"],
  ["날짜 (DATE)", "Date (DATE)"],
  ["시간 (TIME)", "Time (TIME)"],
  ["UUID (BINARY(16)/UNIQUEIDENTIFIER/UUID)", "UUID (BINARY(16)/UNIQUEIDENTIFIER/UUID)"],
  ["커스텀 데이터 타입으로 컬럼 생성", "Create column with custom data type"],
  ["@param dataType - SQL 데이터 타입 정의", "@param dataType - SQL data type definition"],

  // index-builder.ts
  ["인덱스 정의 빌더", "Index definition builder"],
  [
    "Fluent API를 통해 인덱스의 컬럼, 유니크 여부, 정렬 순서를 정의",
    "Define index columns, uniqueness, and sort order through Fluent API",
  ],
  ["TableBuilder.indexes()에서 사용", "Used in TableBuilder.indexes()"],
  ["@template TKeys - 인덱스 컬럼 키 배열 타입", "@template TKeys - Index column key array type"],
  ["// 유니크 인덱스", "// Unique index"],
  ["// 복합 인덱스 + 정렬 순서", "// Composite index + sort order"],
  ["// 커스텀 이름", "// Custom name"],
  [
    "@see {@link createIndexFactory} 인덱스 팩토리",
    "@see {@link createIndexFactory} Index factory",
  ],
  ["@param meta - 인덱스 메타데이터", "@param meta - Index metadata"],
  ["@param meta.columns - 인덱스 컬럼 배열", "@param meta.columns - Index column array"],
  ["@param meta.name - 인덱스 이름 (선택)", "@param meta.name - Index name (optional)"],
  ["@param meta.unique - 유니크 인덱스 여부", "@param meta.unique - Unique index flag"],
  ["@param meta.orderBy - 컬럼별 정렬 순서", "@param meta.orderBy - Sort order per column"],
  ["@param meta.description - 인덱스 설명", "@param meta.description - Index description"],
  ["인덱스 이름 설정", "Set index name"],
  ["@param name - 인덱스 이름", "@param name - Index name"],
  ["@returns 새 IndexBuilder 인스턴스", "@returns New IndexBuilder instance"],
  ["유니크 인덱스 설정", "Set unique index"],
  ["정렬 순서 설정", "Set sort order"],
  ["@param orders - 컬럼별 정렬 순서 매핑", "@param orders - Sort order mapping per column"],
  ["// 인덱스 팩토리", "// Index factory"],
  ["인덱스 팩토리 함수", "Index factory function"],
  ["인덱스 팩토리 생성", "Create index factory"],
  [
    "TableBuilder.indexes()에서 사용하는 인덱스 생성 팩토리",
    "Index creation factory used in TableBuilder.indexes()",
  ],
  ["컬럼명 배열로 인덱스 빌더를 생성", "Creates index builder with column name array"],
  ["@param columns - 인덱스 컬럼명 배열", "@param columns - Index column name array"],
  ["@returns IndexBuilder 인스턴스", "@returns IndexBuilder instance"],
  ["인덱스 설명 설정", "Set index description"],

  // relation-builder.ts
  ["Foreign Key 관계 빌더 (N:1)", "Foreign Key relation builder (N:1)"],
  [
    "현재 테이블에서 참조 테이블로의 FK Relation definition",
    "FK relation definition from current table to reference table",
  ],
  ["DB에 실제 FK 제약조건 생성", "Creates actual FK constraint in DB"],
  ["@template TOwner - 소유 테이블 빌더 타입", "@template TOwner - Owner table builder type"],
  [
    "@template TTargetFn - 참조 테이블 빌더 팩토리 타입",
    "@template TTargetFn - Target table builder factory type",
  ],
  ["// FK 컬럼", "// FK column"],
  ["// N:1 관계 - Post → User", "// N:1 relation - Post -> User"],
  [
    "@see {@link ForeignKeyTargetBuilder} 역참조 빌더",
    "@see {@link ForeignKeyTargetBuilder} Reverse reference builder",
  ],
  [
    "@see {@link RelationKeyBuilder} DB FK 없는 관계",
    "@see {@link RelationKeyBuilder} Relation without DB FK",
  ],
  ["@param meta - FK 메타데이터", "@param meta - FK metadata"],
  ["@param meta.ownerFn - 소유 테이블 팩토리", "@param meta.ownerFn - Owner table factory"],
  ["@param meta.columns - FK 컬럼명 배열", "@param meta.columns - FK column name array"],
  ["@param meta.targetFn - 참조 테이블 팩토리", "@param meta.targetFn - Target table factory"],
  ["@param meta.description - 관계 설명", "@param meta.description - Relation description"],
  ["관계 설명 설정", "Set relation description"],
  ["@param desc - 관계 설명", "@param desc - Relation description"],
  ["@returns 새 ForeignKeyBuilder 인스턴스", "@returns New ForeignKeyBuilder instance"],
  ["Foreign Key 역참조 빌더 (1:N)", "Foreign Key reverse reference builder (1:N)"],
  [
    "다른 테이블에서 현재 테이블을 참조하는 FK의 역참조 정의",
    "Reverse reference definition for FK that references current table from another table",
  ],
  [
    "include() 시 배열로 로드 (single() 호출 시 단일 객체)",
    "Loaded as array on include() (single object when single() is called)",
  ],
  [
    "@template TTargetTableFn - 참조하는 테이블 빌더 팩토리 타입",
    "@template TTargetTableFn - Referencing table builder factory type",
  ],
  ["@template TIsSingle - 단일 객체 여부", "@template TIsSingle - Single object flag"],
  ["// 1:N 관계 - User ← Post.author", "// 1:N relation - User <- Post.author"],
  ["// 1:1 관계 (단일 객체)", "// 1:1 relation (single object)"],
  ["@param meta - FK 역참조 메타데이터", "@param meta - FK reverse reference metadata"],
  [
    "@param meta.targetTableFn - 참조하는 테이블 팩토리",
    "@param meta.targetTableFn - Referencing table factory",
  ],
  [
    "@param meta.relationName - 참조하는 테이블의 FK 관계명",
    "@param meta.relationName - FK relation name in referencing table",
  ],
  ["@param meta.isSingle - 단일 객체 여부", "@param meta.isSingle - Single object flag"],
  ["@returns 새 ForeignKeyTargetBuilder 인스턴스", "@returns New ForeignKeyTargetBuilder instance"],
  ["단일 결과 설정 (1:1 관계)", "Set single result (1:1 relation)"],
  [
    "RelationKey 빌더 (논리적 관계, FK 제약조건 없음)",
    "RelationKey builder (logical relation, no FK constraint)",
  ],
  [
    "FK 제약조건을 생성하지 않지만 JOIN 관계는 정의",
    "Does not create FK constraint but defines JOIN relation",
  ],
  [
    "코드 수준의 관계만 정의 (DDL에 FK 생성 안함)",
    "Defines relation at code level only (no FK in DDL)",
  ],
  ["@template TOwner - 소유 테이블 빌더 타입", "@template TOwner - Owner table builder type"],
  [
    "@template TTargetFn - 참조 테이블 빌더 팩토리 타입",
    "@template TTargetFn - Target table builder factory type",
  ],
  ["// DB에 FK 없이 논리적 관계만 정의", "// Define logical relation without DB FK"],
  [
    "@see {@link ForeignKeyBuilder} FK 제약조건이 있는 빌더",
    "@see {@link ForeignKeyBuilder} Builder with FK constraint",
  ],
  ["@param meta - RelationKey 메타데이터", "@param meta - RelationKey metadata"],
  ["@param meta.ownerFn - 소유 테이블 팩토리", "@param meta.ownerFn - Owner table factory"],
  ["@param meta.columns - 관계 컬럼명 배열", "@param meta.columns - Relation column name array"],
  ["@param meta.targetFn - 참조 테이블 팩토리", "@param meta.targetFn - Target table factory"],
  ["// 관계 팩토리", "// Relation factory"],
  ["관계 팩토리 생성", "Create relation factory"],
  [
    "TableBuilder.relations() / ViewBuilder.relations()에서 사용",
    "Used in TableBuilder.relations() / ViewBuilder.relations()",
  ],
  ["FK 관계 (N:1)", "FK relation (N:1)"],
  ["FK 역참조 (1:N)", "FK reverse reference (1:N)"],
  ["논리적 관계 (FK 없음)", "Logical relation (no FK)"],
  ["@param target - 참조 테이블 팩토리", "@param target - Target table factory"],
  ["@param columns - FK 컬럼명 배열", "@param columns - FK column name array"],
  ["@returns ForeignKeyBuilder 인스턴스", "@returns ForeignKeyBuilder instance"],
  ["@param targetTable - 참조하는 테이블 팩토리", "@param targetTable - Referencing table factory"],
  [
    "@param relationName - 참조 테이블의 FK 관계명",
    "@param relationName - FK relation name in referencing table",
  ],
  ["@returns ForeignKeyTargetBuilder 인스턴스", "@returns ForeignKeyTargetBuilder instance"],
  ["@returns RelationKeyBuilder 인스턴스", "@returns RelationKeyBuilder instance"],

  // table-builder.ts
  ["테이블 정의 빌더", "Table definition builder"],
  [
    "Fluent API를 통해 테이블의 컬럼, PK, 인덱스, 관계를 정의",
    "Define table columns, PK, indexes, and relations through Fluent API",
  ],
  ["@template TDbContext - DbContext 타입", "@template TDbContext - DbContext type"],
  ["@template TData - 테이블 데이터 레코드 타입", "@template TData - Table data record type"],
  [
    "@template TRelations - 관계 정의 레코드 타입",
    "@template TRelations - Relation definition record type",
  ],
  [
    "@template TInsertData - INSERT 데이터 타입 (autoIncrement, default 컬럼은 optional)",
    "@template TInsertData - INSERT data type (autoIncrement, default columns are optional)",
  ],
  ["// 테이블 정의", "// Table definition"],
  ["@see {@link Table} 팩토리 함수", "@see {@link Table} Factory function"],
  ["관계 정의 (타입 추론용)", "Relation definition (for type inference)"],
  ["INSERT 데이터 타입 (타입 추론용)", "INSERT data type (for type inference)"],
  ["@param meta - 테이블 메타데이터", "@param meta - Table metadata"],
  ["@param meta.name - 테이블 이름", "@param meta.name - Table name"],
  [
    "@param meta.description - 테이블 설명 (주석)",
    "@param meta.description - Table description (comment)",
  ],
  ["@param meta.columns - 컬럼 정의", "@param meta.columns - Column definition"],
  ["@param meta.primaryKey - PK 컬럼명 배열", "@param meta.primaryKey - PK column name array"],
  ["@param meta.indexes - 인덱스 정의 배열", "@param meta.indexes - Index definition array"],
  ["@param meta.relations - 관계 정의", "@param meta.relations - Relation definition"],
  ["테이블 설명 설정", "Set table description"],
  [
    "@param desc - 테이블 설명 (DDL 주석으로 사용)",
    "@param desc - Table description (used as DDL comment)",
  ],
  ["@returns 새 TableBuilder 인스턴스", "@returns New TableBuilder instance"],
  ["컬럼 정의", "Column definition"],
  [
    "@param fn - 컬럼 팩토리를 받아 컬럼 정의를 반환하는 함수",
    "@param fn - Function that receives column factory and returns column definition",
  ],
  ["Primary Key 정의", "Primary Key definition"],
  ["인덱스 정의", "Index definition"],
  [
    "@param fn - 인덱스 팩토리를 받아 인덱스 정의를 반환하는 함수",
    "@param fn - Function that receives index factory and returns index definition",
  ],
  ["Table builder 생성 팩토리 함수", "Table builder creation factory function"],
  [
    "TableBuilder를 생성하여 Fluent API로 테이블 스키마 정의",
    "Create TableBuilder to define table schema via Fluent API",
  ],
  ["@param name - 테이블 이름", "@param name - Table name"],
  ["@returns TableBuilder 인스턴스", "@returns TableBuilder instance"],
  ["@see {@link TableBuilder} 빌더 클래스", "@see {@link TableBuilder} Builder class"],

  // query-builder-base.ts / expr-renderer-base.ts / dialect-specific files
  [
    /\/\/#region ========== SELECT 쿼리 ==========/g,
    "//#region ========== SELECT Query ==========",
  ],
  [
    /\/\/#region ========== INSERT 쿼리 ==========/g,
    "//#region ========== INSERT Query ==========",
  ],
  [
    /\/\/#region ========== UPDATE 쿼리 ==========/g,
    "//#region ========== UPDATE Query ==========",
  ],
  [
    /\/\/#region ========== DELETE 쿼리 ==========/g,
    "//#region ========== DELETE Query ==========",
  ],
  [
    /\/\/#region ========== UPSERT 쿼리 ==========/g,
    "//#region ========== UPSERT Query ==========",
  ],
  [/\/\/#region ========== DDL 쿼리 ==========/g, "//#region ========== DDL Query =========="],
  [/\/\/#region ========== 헬퍼 ==========/g, "//#region ========== Helper =========="],
  [/\/\/#region ========== 값 ==========/g, "//#region ========== Values =========="],
  [/\/\/#region ========== 비교 ==========/g, "//#region ========== Comparison =========="],
  [/\/\/#region ========== 논리 ==========/g, "//#region ========== Logical =========="],
  [/\/\/#region ========== 문자열 ==========/g, "//#region ========== String =========="],
  [/\/\/#region ========== 숫자 ==========/g, "//#region ========== Numeric =========="],
  [/\/\/#region ========== 날짜 ==========/g, "//#region ========== Date =========="],
  [
    /\/\/#region ========== 조건\/변환 ==========/g,
    "//#region ========== Conditional/Conversion ==========",
  ],
  [/\/\/#region ========== 집계 ==========/g, "//#region ========== Aggregate =========="],
  [/\/\/#region ========== 윈도우 ==========/g, "//#region ========== Window =========="],
  [/\/\/#region ========== 기타 ==========/g, "//#region ========== Misc =========="],
  [/\/\/#region ========== 시스템 ==========/g, "//#region ========== System =========="],
  ["표현식 렌더러 기본 클래스", "Expression renderer base class"],
  ["Expr JSON AST를 SQL 문자열로 변환", "Convert Expr JSON AST to SQL string"],
  ["각 DBMS별 구현체가 이 클래스를 상속", "Each DBMS-specific implementation extends this class"],
  ["쿼리 빌더 기본 클래스", "Query builder base class"],
  ["QueryDef를 SQL로 변환하는 기본 클래스", "Base class for converting QueryDef to SQL"],
  [
    "각 DBMS별 구현체에서 상속하여 방언별 SQL 생성",
    "Inherited by each DBMS-specific implementation for dialect-specific SQL generation",
  ],
  ["@param dialect - 데이터베이스 방언", "@param dialect - Database dialect"],
  ["@param renderer - 표현식 렌더러", "@param renderer - Expression renderer"],
  ["SELECT 쿼리 빌드", "Build SELECT query"],
  ["INSERT 쿼리 빌드", "Build INSERT query"],
  ["UPDATE 쿼리 빌드", "Build UPDATE query"],
  ["DELETE 쿼리 빌드", "Build DELETE query"],
  ["UPSERT 쿼리 빌드", "Build UPSERT query"],
  ["쿼리 빌드 (QueryDef → SQL)", "Query build (QueryDef -> SQL)"],
  ["이름을 DBMS별 형식으로 래핑", "Wrap name in DBMS-specific format"],
  ["객체 이름을 풀 네임으로 변환", "Convert object name to full name"],
  ["MSSQL 쿼리 빌더", "MSSQL query builder"],
  ["MySQL 쿼리 빌더", "MySQL query builder"],
  ["PostgreSQL 쿼리 빌더", "PostgreSQL query builder"],
  ["MSSQL 표현식 렌더러", "MSSQL expression renderer"],
  ["MySQL 표현식 렌더러", "MySQL expression renderer"],
  ["PostgreSQL 표현식 렌더러", "PostgreSQL expression renderer"],
  ["// OUTPUT 절이 있으면 임시테이블 사용", "// Use temp table if OUTPUT clause exists"],
  ["// INSERT 후 SELECT로 결과 반환", "// Return result via SELECT after INSERT"],
  ["// DELETE 후 OUTPUT 결과 반환", "// Return OUTPUT result after DELETE"],
  ["// UPSERT는 MERGE 문 사용", "// UPSERT uses MERGE statement"],
  ["// INSERT ... ON DUPLICATE KEY UPDATE", "// INSERT ... ON DUPLICATE KEY UPDATE"],
  ["// INSERT ... ON CONFLICT DO UPDATE", "// INSERT ... ON CONFLICT DO UPDATE"],
  ["// OUTPUT 절 처리", "// OUTPUT clause handling"],
  ["// WHERE 조건 생성", "// Generate WHERE conditions"],
  ["// JOIN 절 생성", "// Generate JOIN clause"],
  ["// ORDER BY 절 생성", "// Generate ORDER BY clause"],
  ["// GROUP BY 절 생성", "// Generate GROUP BY clause"],
  ["// HAVING 절 생성", "// Generate HAVING clause"],
  ["// LIMIT/OFFSET 절 생성", "// Generate LIMIT/OFFSET clause"],
  ["// WITH 절 (재귀 CTE) 생성", "// Generate WITH clause (recursive CTE)"],
  ["풀 네임", "Full name"],
  ["스키마 포함", "Including schema"],
  ["데이터베이스 포함", "Including database"],

  // queryable.ts remaining
  ["// 행 번호는 항상 첫 번째 컬럼", "// Row number is always the first column"],
  ["// 결과에서 행 번호 제거", "// Remove row number from result"],
];

const rootDir = "D:/workspaces-13/simplysm/.claude/worktrees/agent-ab790434";
const filePaths = [
  "packages/orm-common/src/schema/factory/column-builder.ts",
  "packages/orm-common/src/schema/factory/index-builder.ts",
  "packages/orm-common/src/schema/factory/relation-builder.ts",
  "packages/orm-common/src/schema/table-builder.ts",
  "packages/orm-common/src/schema/procedure-builder.ts",
  "packages/orm-common/src/schema/view-builder.ts",
  "packages/orm-common/src/query-builder/base/expr-renderer-base.ts",
  "packages/orm-common/src/query-builder/base/query-builder-base.ts",
  "packages/orm-common/src/query-builder/mssql/mssql-expr-renderer.ts",
  "packages/orm-common/src/query-builder/mssql/mssql-query-builder.ts",
  "packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts",
  "packages/orm-common/src/query-builder/mysql/mysql-query-builder.ts",
  "packages/orm-common/src/query-builder/postgresql/postgresql-expr-renderer.ts",
  "packages/orm-common/src/query-builder/postgresql/postgresql-query-builder.ts",
  "packages/orm-common/src/exec/queryable.ts",
  "packages/orm-common/src/types/query-def.ts",
];

let totalReplacements = 0;

for (const relPath of filePaths) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP: ${relPath}`);
    continue;
  }
  let content = fs.readFileSync(fullPath, "utf-8");
  let fileReplacements = 0;

  for (const [korean, english] of translations) {
    if (korean instanceof RegExp) {
      const matches = content.match(korean);
      if (matches) {
        content = content.replace(korean, english);
        fileReplacements += matches.length;
      }
    } else {
      let idx = content.indexOf(korean);
      while (idx !== -1) {
        content = content.substring(0, idx) + english + content.substring(idx + korean.length);
        fileReplacements++;
        idx = content.indexOf(korean, idx + english.length);
      }
    }
  }

  if (fileReplacements > 0) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`OK (${fileReplacements}): ${relPath}`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`NO CHANGES: ${relPath}`);
  }
}

console.log(`\nTotal: ${totalReplacements}`);
