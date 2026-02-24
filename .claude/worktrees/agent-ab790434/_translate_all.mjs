import fs from "fs";
import path from "path";

// Korean to English translation map for common patterns in comments
const translations = [
  // types/expr.ts
  ["날짜 연산 단위", "Date operation unit"],
  ["dateDiff, dateAdd 등 날짜 함수에서 사용", "Used in date functions like dateDiff, dateAdd"],
  [
    /\/\/#region ========== 값 표현식 ==========/g,
    "//#region ========== Value Expressions ==========",
  ],
  ["컬럼 참조 표현식", "Column reference expression"],
  [
    "@property path - 컬럼 경로 (테이블별칭.컬럼명 등)",
    "@property path - Column path (table alias.column name, etc.)",
  ],
  ["리터럴 값 표현식", "Literal value expression"],
  ["@property value - 컬럼 프리미티브 값", "@property value - Column primitive value"],
  ["Raw SQL 표현식", "Raw SQL expression"],
  [
    "@property sql - SQL 문자열 (파라미터는 {0}, {1}로 표시)",
    "@property sql - SQL string (parameters denoted as {0}, {1})",
  ],
  ["@property params - 파라미터 표현식 배열", "@property params - Parameter expression array"],
  [
    /\/\/#region ========== 비교 연산 \(WHERE용\) ==========/g,
    "//#region ========== Comparison Operations (for WHERE) ==========",
  ],
  ["동등 비교 (=) - NULL-safe", "Equality comparison (=) - NULL-safe"],
  ["초과 비교 (>)", "Greater than comparison (>)"],
  ["미만 비교 (<)", "Less than comparison (<)"],
  ["이상 비교 (>=)", "Greater than or equal comparison (>=)"],
  ["이하 비교 (<=)", "Less than or equal comparison (<=)"],
  ["범위 비교 (BETWEEN from AND to)", "Range comparison (BETWEEN from AND to)"],
  ["NULL 검사 (IS NULL)", "NULL check (IS NULL)"],
  ["패턴 매칭 (LIKE)", "Pattern matching (LIKE)"],
  ["정규식 매칭 (REGEXP)", "Regex matching (REGEXP)"],
  ["값 목록 포함 검사 (IN)", "Value list inclusion check (IN)"],
  ["서브쿼리 결과 포함 검사 (IN subquery)", "Subquery result inclusion check (IN subquery)"],
  ["서브쿼리 존재 검사 (EXISTS)", "Subquery existence check (EXISTS)"],
  [
    /\/\/#region ========== 논리 연산 ==========/g,
    "//#region ========== Logical Operations ==========",
  ],
  ["논리 부정 (NOT)", "Logical negation (NOT)"],
  ["논리 곱 (AND)", "Logical conjunction (AND)"],
  ["논리 합 (OR)", "Logical disjunction (OR)"],
  [
    /\/\/#region ========== 문자열 함수 ==========/g,
    "//#region ========== String Functions ==========",
  ],
  ["문자열 연결 (CONCAT)", "String concatenation (CONCAT)"],
  ["왼쪽 N자 추출 (LEFT)", "Extract left N characters (LEFT)"],
  ["오른쪽 N자 추출 (RIGHT)", "Extract right N characters (RIGHT)"],
  ["좌우 공백 제거 (TRIM)", "Trim whitespace (TRIM)"],
  ["왼쪽 패딩 (LPAD)", "Left padding (LPAD)"],
  ["문자열 치환 (REPLACE)", "String replacement (REPLACE)"],
  ["대문자 변환 (UPPER)", "Uppercase conversion (UPPER)"],
  ["소문자 변환 (LOWER)", "Lowercase conversion (LOWER)"],
  ["문자 길이 (CHAR_LENGTH)", "Character length (CHAR_LENGTH)"],
  ["바이트 길이 (LENGTH/DATALENGTH)", "Byte length (LENGTH/DATALENGTH)"],
  ["부분 문자열 (SUBSTRING)", "Substring (SUBSTRING)"],
  ["문자열 위치 (LOCATE/CHARINDEX/POSITION)", "String position (LOCATE/CHARINDEX/POSITION)"],
  [
    /\/\/#region ========== 숫자 함수 ==========/g,
    "//#region ========== Numeric Functions ==========",
  ],
  ["절대값 (ABS)", "Absolute value (ABS)"],
  ["반올림 (ROUND)", "Rounding (ROUND)"],
  ["올림 (CEIL)", "Ceiling (CEIL)"],
  ["내림 (FLOOR)", "Floor (FLOOR)"],
  [
    /\/\/#region ========== 날짜 함수 ==========/g,
    "//#region ========== Date Functions ==========",
  ],
  ["연도 추출 (YEAR)", "Year extraction (YEAR)"],
  ["월 추출 (MONTH)", "Month extraction (MONTH)"],
  ["일 추출 (DAY)", "Day extraction (DAY)"],
  ["시간 추출 (HOUR)", "Hour extraction (HOUR)"],
  ["분 추출 (MINUTE)", "Minute extraction (MINUTE)"],
  ["초 추출 (SECOND)", "Second extraction (SECOND)"],
  ["ISO 주차 (WEEK)", "ISO week number (WEEK)"],
  ["ISO 주 시작일", "ISO week start date"],
  ["ISO 연월 (YYYYMM 형식)", "ISO year-month (YYYYMM format)"],
  ["날짜 차이 (DATEDIFF)", "Date difference (DATEDIFF)"],
  ["날짜 연산 (DATEADD)", "Date arithmetic (DATEADD)"],
  ["날짜 포맷 (FORMAT/DATE_FORMAT)", "Date format (FORMAT/DATE_FORMAT)"],
  [/\/\/#region ========== 조건 ==========/g, "//#region ========== Conditional =========="],
  [
    "NULL 대체 (COALESCE - 첫 번째 non-null 반환)",
    "NULL replacement (COALESCE - return first non-null)",
  ],
  [
    "조건부 NULL (NULLIF - source === value 이면 NULL)",
    "Conditional NULL (NULLIF - NULL if source === value)",
  ],
  ["조건을 값으로 변환 (boolean → 0/1)", "Convert condition to value (boolean -> 0/1)"],
  ["CASE WHEN 표현식", "CASE WHEN expression"],
  ["IF 표현식 (IIF/IF)", "IF expression (IIF/IF)"],
  [/\/\/#region ========== 집계 ==========/g, "//#region ========== Aggregate =========="],
  ["레코드 수 (COUNT)", "Record count (COUNT)"],
  ["합계 (SUM)", "Sum (SUM)"],
  ["평균 (AVG)", "Average (AVG)"],
  ["최대값 (MAX)", "Maximum (MAX)"],
  ["최소값 (MIN)", "Minimum (MIN)"],
  [/\/\/#region ========== 기타 ==========/g, "//#region ========== Misc =========="],
  ["최대값 선택 (GREATEST)", "Maximum value selection (GREATEST)"],
  ["최소값 선택 (LEAST)", "Minimum value selection (LEAST)"],
  ["행 번호 (ROW_NUMBER 단순 버전)", "Row number (simple ROW_NUMBER version)"],
  ["난수 (RAND/RANDOM)", "Random number (RAND/RANDOM)"],
  ["타입 변환 (CAST)", "Type conversion (CAST)"],
  ["LAG() - 이전 행 값", "LAG() - Previous row value"],
  ["LEAD() - 다음 행 값", "LEAD() - Next row value"],
  ["윈도우 SUM", "Window SUM"],
  ["윈도우 AVG", "Window AVG"],
  ["윈도우 COUNT", "Window COUNT"],
  ["윈도우 MIN", "Window MIN"],
  ["윈도우 MAX", "Window MAX"],
  ["윈도우 함수 유니언 타입", "Window function union type"],
  ["순위, 탐색, 집계 윈도우 함수", "Ranking, navigation, and aggregate window functions"],
  ["윈도우 스펙 (OVER 절)", "Window spec (OVER clause)"],
  [
    "@property partitionBy - PARTITION BY 표현식 목록",
    "@property partitionBy - PARTITION BY expression list",
  ],
  [
    "@property orderBy - ORDER BY [컬럼, 방향] 목록",
    "@property orderBy - ORDER BY [column, direction] list",
  ],
  ["윈도우 표현식", "Window expression"],
  ["윈도우 함수 + 윈도우 스펙 조합", "Window function + window spec combination"],
  [/\/\/#region ========== 시스템 ==========/g, "//#region ========== System =========="],
  ["스칼라 서브쿼리", "Scalar subquery"],
  [
    "WHERE 절에 사용되는 표현식 (boolean 반환)",
    "Expression used in WHERE clause (returns boolean)",
  ],
  ["비교 연산 + 논리 연산의 유니언 타입", "Union type of comparison and logical operations"],
  ["where(), having() 등에서 사용", "Used in where(), having(), etc."],
  ["모든 표현식 유니언 타입", "All expressions union type"],
  [
    "값, 문자열, 숫자, 날짜, 조건, 집계, 윈도우 등 모든 표현식",
    "All expressions including value, string, numeric, date, conditional, aggregate, window, etc.",
  ],
  ["select(), orderBy() 등에서 사용", "Used in select(), orderBy(), etc."],
  [
    "@see {@link WhereExpr} WHERE 절 전용 표현식",
    "@see {@link WhereExpr} WHERE clause expressions",
  ],

  // types/query-def.ts
  [/\/\/#region ========== 공통 ==========/g, "//#region ========== Common =========="],
  ["DB 객체 이름 (테이블, 뷰, 프로시저 등)", "DB object name (table, view, procedure, etc.)"],
  ["DBMS별 네임스페이스:", "Per-DBMS namespace:"],
  ["- MySQL: `database.name` (schema 무시)", "- MySQL: `database.name` (schema ignored)"],
  [
    "- MSSQL: `database.schema.name` (schema 기본값: dbo)",
    "- MSSQL: `database.schema.name` (schema default: dbo)",
  ],
  [
    "- PostgreSQL: `schema.name` (database는 connection용)",
    "- PostgreSQL: `schema.name` (database is for connection)",
  ],
  ["CUD 쿼리의 OUTPUT 절 정의", "OUTPUT clause definition for CUD queries"],
  ["INSERT/UPDATE/DELETE 후 반환값 정의", "Return value definition after INSERT/UPDATE/DELETE"],
  ["SELECT 쿼리 정의", "SELECT query definition"],
  ['@property type - 쿼리 타입 ("select")', '@property type - Query type ("select")'],
  ["@property from - FROM 절 (테이블/서브쿼리)", "@property from - FROM clause (table/subquery)"],
  ["@property as - 테이블 별칭", "@property as - Table alias"],
  ["@property select - SELECT 절 컬럼 매핑", "@property select - SELECT clause column mapping"],
  ["@property distinct - DISTINCT 여부", "@property distinct - DISTINCT flag"],
  ["@property lock - 락 여부", "@property lock - Lock flag"],
  ["@property where - WHERE 조건 배열", "@property where - WHERE condition array"],
  ["@property joins - JOIN 정의 배열", "@property joins - JOIN definition array"],
  [
    "@property orderBy - ORDER BY [컬럼, 방향] 배열",
    "@property orderBy - ORDER BY [column, direction] array",
  ],
  ["@property groupBy - GROUP BY 표현식 배열", "@property groupBy - GROUP BY expression array"],
  ["@property having - HAVING 조건 배열", "@property having - HAVING condition array"],
  ["@property with - 재귀 CTE 정의", "@property with - Recursive CTE definition"],
  ["JOIN 쿼리 정의", "JOIN query definition"],
  ["SelectQueryDef 확장 + isSingle 플래그", "SelectQueryDef extension + isSingle flag"],
  ["단일 결과 여부 (1:1 관계)", "Single result flag (1:1 relation)"],
  ["INSERT 쿼리 정의", "INSERT query definition"],
  ["@property records - 삽입할 레코드 배열", "@property records - Array of records to insert"],
  [
    "@property overrideIdentity - IDENTITY_INSERT 활성화 여부",
    "@property overrideIdentity - IDENTITY_INSERT enable flag",
  ],
  ["@property output - OUTPUT 절 정의", "@property output - OUTPUT clause definition"],
  ["조건부 INSERT 쿼리 정의", "Conditional INSERT query definition"],
  ["존재하지 않는 경우에만 삽입", "Insert only if not exists"],
  ["INSERT INTO SELECT 쿼리 정의", "INSERT INTO SELECT query definition"],
  ["서브쿼리 결과를 삽입", "Insert subquery results"],
  ["UPDATE 쿼리 정의", "UPDATE query definition"],
  [
    "@property record - 업데이트할 컬럼/값 매핑",
    "@property record - Column/value mapping to update",
  ],
  ["@property joins - UPDATE JOIN (지원 시)", "@property joins - UPDATE JOIN (when supported)"],
  ["DELETE 쿼리 정의", "DELETE query definition"],
  ["UPSERT 쿼리 정의", "UPSERT query definition"],
  ["INSERT or UPDATE (MERGE 패턴)", "INSERT or UPDATE (MERGE pattern)"],
  ["FK 제약조건 활성화/비활성화", "Enable/disable FK constraints"],
  ["스키마 초기화 (모든 객체 삭제)", "Schema initialization (delete all objects)"],
  ["MODIFY COLUMN (타입/속성 변경)", "MODIFY COLUMN (type/attribute change)"],
  ["스키마 존재 여부 확인", "Check schema existence"],
  [
    /\/\/#region ========== DDL 타입 상수 ==========/g,
    "//#region ========== DDL Type Constants ==========",
  ],
  ["DDL QueryDef 유니언 (컴파일 타임 검증용)", "DDL QueryDef union (for compile-time validation)"],
  [
    "switchFk는 DDL이 아니므로 제외 (트랜잭션 내 사용 가능)",
    "switchFk is excluded as it is not DDL (can be used within transactions)",
  ],
  ["DDL (Data Definition Language) 타입 상수", "DDL (Data Definition Language) type constants"],
  [
    "트랜잭션 내 DDL 차단 및 DDL 타입 검증에 사용",
    "Used for blocking DDL within transactions and DDL type validation",
  ],
  [
    "satisfies 키워드로 DdlQueryDef와의 동기화를 컴파일 타임에 검증",
    "Compile-time sync validation with DdlQueryDef using satisfies keyword",
  ],
  ["DDL 타입 유니언", "DDL type union"],
  [
    /\/\/#region ========== 통합 Union Type ==========/g,
    "//#region ========== Combined Union Type ==========",
  ],
  ["모든 쿼리 정의 유니언 타입", "All query definition union type"],
  ["@see {@link SelectQueryDef} SELECT 쿼리", "@see {@link SelectQueryDef} SELECT query"],
  ["@see {@link InsertQueryDef} INSERT 쿼리", "@see {@link InsertQueryDef} INSERT query"],
  ["@see {@link UpdateQueryDef} UPDATE 쿼리", "@see {@link UpdateQueryDef} UPDATE query"],
  ["@see {@link DeleteQueryDef} DELETE 쿼리", "@see {@link DeleteQueryDef} DELETE query"],

  // schema files
  ["저장 프로시저 정의 빌더", "Stored procedure definition builder"],
  [
    "Fluent API를 통해 프로시저의 파라미터, 반환 타입, 본문을 정의",
    "Define procedure parameters, return types, and body through Fluent API",
  ],
  [
    "DbContext의 executable()과 함께 사용하여 타입 안전한 프로시저 호출",
    "Use with DbContext's executable() for type-safe procedure calls",
  ],
  [
    "@template TParams - 파라미터 컬럼 정의 타입",
    "@template TParams - Parameter column definition type",
  ],
  [
    "@template TReturns - 반환 컬럼 정의 타입",
    "@template TReturns - Return column definition type",
  ],
  ["// 프로시저 정의", "// Procedure definition"],
  ["// DbContext에서 사용", "// Usage in DbContext"],
  ["// 호출", "// Call"],
  ["@see {@link Procedure} 팩토리 함수", "@see {@link Procedure} Factory function"],
  ["@see {@link executable} Executable 생성", "@see {@link executable} Executable creation"],
  ["파라미터 정의 (타입 추론용)", "Parameter definition (for type inference)"],
  ["반환 타입 정의 (타입 추론용)", "Return type definition (for type inference)"],
  ["@param meta - 프로시저 메타데이터", "@param meta - Procedure metadata"],
  ["@param meta.name - 프로시저 이름", "@param meta.name - Procedure name"],
  [
    "@param meta.description - 프로시저 설명 (주석)",
    "@param meta.description - Procedure description (comment)",
  ],
  ["@param meta.database - 데이터베이스 이름", "@param meta.database - Database name"],
  [
    "@param meta.schema - 스키마 이름 (MSSQL/PostgreSQL)",
    "@param meta.schema - Schema name (MSSQL/PostgreSQL)",
  ],
  ["@param meta.params - 파라미터 정의", "@param meta.params - Parameter definition"],
  ["@param meta.returns - 반환 타입 정의", "@param meta.returns - Return type definition"],
  ["@param meta.query - 프로시저 본문 SQL", "@param meta.query - Procedure body SQL"],
  ["프로시저 설명 설정", "Set procedure description"],
  [
    "@param desc - 프로시저 설명 (DDL 주석으로 사용)",
    "@param desc - Procedure description (used as DDL comment)",
  ],
  ["@returns 새 ProcedureBuilder 인스턴스", "@returns New ProcedureBuilder instance"],
  ["데이터베이스 이름 설정", "Set database name"],
  ["@param db - 데이터베이스 이름", "@param db - Database name"],
  ["@returns 새 ViewBuilder 인스턴스", "@returns New ViewBuilder instance"],
  ["스키마 이름 설정", "Set schema name"],
  ["MSSQL, PostgreSQL에서 사용", "Used in MSSQL, PostgreSQL"],
  [
    "@param schema - 스키마 이름 (MSSQL: dbo, PostgreSQL: public)",
    "@param schema - Schema name (MSSQL: dbo, PostgreSQL: public)",
  ],
  ["파라미터 정의", "Parameter definition"],
  ["프로시저 입력 파라미터 정의", "Define procedure input parameters"],
  [
    "DBMS별 파라미터 문법 차이 주의 (MSSQL: @param, MySQL/PostgreSQL: param)",
    "Note DBMS-specific parameter syntax differences (MSSQL: @param, MySQL/PostgreSQL: param)",
  ],
  ["@template T - 새 파라미터 정의 타입", "@template T - New parameter definition type"],
  [
    "@param fn - 컬럼 팩토리를 받아 파라미터 정의를 반환하는 함수",
    "@param fn - Function that receives column factory and returns parameter definition",
  ],
  ["@returns 새 ProcedureBuilder 인스턴스", "@returns New ProcedureBuilder instance"],
  ["반환 타입 정의", "Return type definition"],
  ["프로시저 반환 결과 컬럼 정의", "Define procedure return result columns"],
  ["@template T - 새 반환 타입 정의", "@template T - New return type definition"],
  [
    "@param fn - 컬럼 팩토리를 받아 반환 컬럼 정의를 반환하는 함수",
    "@param fn - Function that receives column factory and returns column definition",
  ],
  ["프로시저 본문 SQL 설정", "Set procedure body SQL"],
  ["DBMS별 SQL 문법 차이 주의:", "Note DBMS-specific SQL syntax differences:"],
  ["- MySQL: 파라미터명 그대로 (userId)", "- MySQL: Parameter name as-is (userId)"],
  ["- MSSQL: @ 접두사 (@userId)", "- MSSQL: @ prefix (@userId)"],
  ["- PostgreSQL: RETURN QUERY 필요", "- PostgreSQL: RETURN QUERY required"],
  ["@param sql - 프로시저 본문 SQL", "@param sql - Procedure body SQL"],
  ["// Procedure 함수", "// Procedure function"],
  ["프로시저 빌더 생성 팩토리 함수", "Procedure builder creation factory function"],
  [
    "ProcedureBuilder를 생성하여 Fluent API로 저장 프로시저 스키마 정의",
    "Create ProcedureBuilder to define stored procedure schema via Fluent API",
  ],
  ["@param name - 프로시저 이름", "@param name - Procedure name"],
  ["@returns ProcedureBuilder 인스턴스", "@returns ProcedureBuilder instance"],
  ["// 기본 사용", "// Basic usage"],
  ["// 파라미터 없는 프로시저", "// Procedure without parameters"],
  ["@see {@link ProcedureBuilder} 빌더 클래스", "@see {@link ProcedureBuilder} Builder class"],

  // view-builder.ts
  ["데이터베이스 뷰 정의 빌더", "Database view definition builder"],
  [
    "Fluent API를 통해 뷰의 쿼리, 관계를 정의",
    "Define view query and relations through Fluent API",
  ],
  [
    "DbContext에서 queryable()과 함께 사용하여 타입 안전한 쿼리 작성",
    "Use with DbContext's queryable() for type-safe query writing",
  ],
  ["@template TDbContext - DbContext 타입", "@template TDbContext - DbContext type"],
  ["@template TData - 뷰 데이터 레코드 타입", "@template TData - View data record type"],
  [
    "@template TRelations - 관계 정의 레코드 타입",
    "@template TRelations - Relation definition record type",
  ],
  ["// 뷰 정의", "// View definition"],
  ["// DbContext에서 사용", "// Usage in DbContext"],
  ["@see {@link View} 팩토리 함수", "@see {@link View} Factory function"],
  ["@see {@link queryable} Queryable 생성", "@see {@link queryable} Queryable creation"],
  ["관계 정의 (타입 추론용)", "Relation definition (for type inference)"],
  ["전체 타입 추론", "Full type inference"],
  ["@param meta - 뷰 메타데이터", "@param meta - View metadata"],
  ["@param meta.name - 뷰 이름", "@param meta.name - View name"],
  [
    "@param meta.description - 뷰 설명 (주석)",
    "@param meta.description - View description (comment)",
  ],
  ["@param meta.database - 데이터베이스 이름", "@param meta.database - Database name"],
  [
    "@param meta.schema - 스키마 이름 (MSSQL/PostgreSQL)",
    "@param meta.schema - Schema name (MSSQL/PostgreSQL)",
  ],
  ["@param meta.viewFn - 뷰 쿼리 정의 함수", "@param meta.viewFn - View query definition function"],
  ["@param meta.relations - 관계 정의", "@param meta.relations - Relation definition"],
  ["뷰 설명 설정", "Set view description"],
  [
    "@param desc - 뷰 설명 (DDL 주석으로 사용)",
    "@param desc - View description (used as DDL comment)",
  ],
  ["@param db - 데이터베이스 이름", "@param db - Database name"],
  ["뷰 쿼리 정의", "View query definition"],
  ["SELECT 쿼리를 통해 뷰의 데이터 소스 정의", "Define view data source through SELECT query"],
  ["@template TViewData - 뷰 데이터 타입", "@template TViewData - View data type"],
  ["@template TDb - DbContext 타입", "@template TDb - DbContext type"],
  [
    "@param viewFn - DbContext를 받아 Queryable을 반환하는 함수",
    "@param viewFn - Function that receives DbContext and returns Queryable",
  ],
  ["관계 정의", "Relation definition"],
  ["다른 테이블/뷰와의 관계 설정", "Set relations with other tables/views"],
  ["@template T - 관계 정의 타입", "@template T - Relation definition type"],
  [
    "@param fn - 관계 팩토리를 받아 관계 정의를 반환하는 함수",
    "@param fn - Function that receives relation factory and returns relation definition",
  ],
  ["@see {@link ForeignKeyBuilder} FK 빌더", "@see {@link ForeignKeyBuilder} FK builder"],
  [
    "@see {@link ForeignKeyTargetBuilder} FK 역참조 빌더",
    "@see {@link ForeignKeyTargetBuilder} FK reverse reference builder",
  ],
  [
    "TypeScript의 제네릭 타입 추론 한계로 인해 캐스팅 불가피",
    "Casting unavoidable due to TypeScript generic type inference limitations",
  ],
  [
    "TRelations 타입 파라미터와 새로 생성되는 관계 타입 T 간의 타입 불일치 해결",
    "Resolve type mismatch between TRelations type parameter and newly created relation type T",
  ],
  ["// View 함수", "// View function"],
  ["View builder 생성 팩토리 함수", "View builder creation factory function"],

  // orm-node files
  ["Orm 옵션", "Orm options"],
  [
    "DbConnConfig보다 우선 적용되는 DbContext 옵션",
    "DbContext options that take precedence over DbConnConfig",
  ],
  [
    "데이터베이스 이름 (DbConnConfig의 database 대신 사용)",
    "Database name (used instead of DbConnConfig's database)",
  ],
  ["스키마 이름 (MSSQL: dbo, PostgreSQL: public)", "Schema name (MSSQL: dbo, PostgreSQL: public)"],
  ["Orm 인스턴스 타입", "Orm instance type"],
  ["createOrm에서 반환되는 객체의 타입", "Type of object returned from createOrm"],
  ["트랜잭션 내에서 콜백 실행", "Execute callback within transaction"],
  [
    "@param callback - DB 연결 후 실행할 콜백",
    "@param callback - Callback to execute after DB connection",
  ],
  [
    "@param isolationLevel - 트랜잭션 격리 수준",
    "@param isolationLevel - Transaction isolation level",
  ],
  ["@returns 콜백 결과", "@returns Callback result"],
  ["트랜잭션 없이 콜백 실행", "Execute callback without transaction"],
  ["Node.js ORM 팩토리 함수", "Node.js ORM factory function"],
  [
    "DbContext와 DB 연결을 관리하는 인스턴스를 생성합니다.",
    "Creates an instance that manages DbContext and DB connections.",
  ],
  [
    "DbContext 정의와 연결 설정을 받아 트랜잭션을 관리합니다.",
    "Receives DbContext definition and connection settings to manage transactions.",
  ],
  ["// 트랜잭션 내에서 실행", "// Execute within transaction"],
  ["// 트랜잭션 없이 실행", "// Execute without transaction"],
  [
    "// database는 options에서 우선, 없으면 config에서",
    "// database takes priority from options, falls back to config",
  ],
  [
    "// schema는 options에서 우선, 없으면 config에서",
    "// schema takes priority from options, falls back to config",
  ],

  // create-db-conn.ts
  ["DB 연결 팩토리", "DB connection factory"],
  [
    "데이터베이스 연결 인스턴스를 생성하고 풀링을 관리한다.",
    "Creates database connection instances and manages pooling.",
  ],
  ["MSSQL, MySQL, PostgreSQL을 지원한다.", "Supports MSSQL, MySQL, PostgreSQL."],
  ["설정별 커넥션 풀 캐싱", "Connection pool caching per configuration"],
  [
    "풀 생성 실패 시 마지막 에러 캐싱 (configKey 기준)",
    "Cache last error on pool creation failure (by configKey)",
  ],
  ["지연 로딩 모듈 캐시", "Lazy-loaded module cache"],
  ["DB 연결 생성", "Create DB connection"],
  [
    "커넥션 풀에서 연결을 획득하여 반환한다.",
    "Acquires and returns a connection from the connection pool.",
  ],
  ["풀이 없는 경우 새로 생성한다.", "Creates a new pool if none exists."],
  ["@param config - 데이터베이스 연결 설정", "@param config - Database connection configuration"],
  ["@returns 풀링된 DB 연결 객체", "@returns Pooled DB connection object"],
  ["// 1. 풀 가져오기 (없으면 생성)", "// 1. Get pool (create if not exists)"],
  ["// 2. 래퍼 객체 반환", "// 2. Return wrapper object"],
  [
    "객체를 키로 쓰기 위해 문자열 변환 (중첩 객체도 정렬하여 동일 설정의 일관된 키 보장)",
    "Convert object to string key (sort nested objects to ensure consistent key for same configuration)",
  ],
  ["풀에서 제거될 때 실제 연결 종료", "Close actual connection when removed from pool"],
  [
    "획득 시 연결 상태 확인 (끊겨있으면 Pool이 폐기하고 새로 만듦)",
    "Check connection status on acquire (Pool discards and creates new if disconnected)",
  ],
  ["[중요] 빌려줄 때 validate 실행 여부", "[Important] Whether to run validate on borrow"],

  // pooled-db-conn.ts
  ["커넥션 풀에서 관리되는 DB 연결 래퍼", "DB connection wrapper managed by connection pool"],
  [
    "generic-pool 라이브러리를 사용하여 커넥션 풀링을 지원한다.",
    "Supports connection pooling using the generic-pool library.",
  ],
  [
    "실제 물리 연결은 풀에서 획득하고 반환한다.",
    "Actual physical connections are acquired from and returned to the pool.",
  ],
  ["풀에서 빌려온 실제 물리 커넥션", "Actual physical connection borrowed from pool"],
  ["풀에서 DB 연결을 획득한다.", "Acquires a DB connection from the pool."],
  ["@throws {SdError} 이미 연결된 상태일 때", "@throws {SdError} When already connected"],
  ["// 1. 풀에서 커넥션 획득", "// 1. Acquire connection from pool"],
  [
    "// 2. 물리 연결이 (타임아웃 등으로) 끊어질 경우를 대비해 리스너 등록",
    "// 2. Register listener in case physical connection drops (timeout, etc.)",
  ],
  [
    "//    만약 사용 중에 끊기면 PooledDbConn도 close 이벤트를 발생시켜야 함",
    "//    If disconnected during use, PooledDbConn must also emit close event",
  ],
  [
    "풀에 DB 연결을 반환한다. (실제 연결을 종료하지 않음)",
    "Returns DB connection to pool. (Does not close actual connection)",
  ],
  [
    "// 1. 트랜잭션 진행 중이면 롤백하여 깨끗한 상태로 풀에 반환",
    "// 1. Rollback if transaction in progress to return clean state to pool",
  ],
  [
    "// 롤백 실패 시 로그만 남기고 계속 진행 (연결이 이미 끊긴 경우 등)",
    "// On rollback failure, log and continue (e.g., connection already dropped)",
  ],
  [
    "// 2. 리스너 해제 (Pool에 돌아가서 다른 래퍼에 의해 재사용될 때 영향 주지 않도록)",
    "// 2. Remove listener (to avoid affecting reuse by other wrappers in pool)",
  ],
  [
    "// 3. 풀에 커넥션 반환 (실제로 끊지 않음)",
    "// 3. Return connection to pool (without actually closing)",
  ],
  [
    "// 4. 소비자에게 논리적으로 연결이 닫혔음을 알림",
    "// 4. Notify consumer that connection is logically closed",
  ],
  ["물리 연결이 끊겼을 때 처리 핸들러", "Handler for physical connection disconnect"],
  [
    "물리 연결이 끊겼으므로 참조 제거 (Pool에서는 validate 시점에 걸러낼 것임)",
    "Remove reference since physical connection dropped (Pool will filter at validate)",
  ],
  ["소비자에게 알림", "Notify consumer"],
  ["// --- 아래는 위임(Delegation) 메소드 ---", "// --- Delegation methods below ---"],
  ["트랜잭션 시작", "Begin transaction"],
  [
    "@param isolationLevel - 트랜잭션 격리 수준",
    "@param isolationLevel - Transaction isolation level",
  ],
  [
    "@throws {SdError} 연결이 획득되지 않은 상태일 때",
    "@throws {SdError} When connection is not acquired",
  ],
  ["트랜잭션 커밋", "Commit transaction"],
  ["트랜잭션 롤백", "Rollback transaction"],
  ["SQL 쿼리 실행", "Execute SQL query"],
  ["@param queries - 실행할 SQL 쿼리 배열", "@param queries - Array of SQL queries to execute"],
  ["@returns 각 쿼리의 결과 배열", "@returns Array of results for each query"],
  ["파라미터화된 SQL 쿼리 실행", "Execute parameterized SQL query"],
  ["@param query - SQL 쿼리 문자열", "@param query - SQL query string"],
  ["@param params - 쿼리 파라미터 배열", "@param params - Query parameter array"],
  ["@returns 쿼리 결과 배열", "@returns Query result array"],
  ["대량 데이터 삽입 (네이티브 벌크 API 사용)", "Bulk data insert (using native bulk API)"],
  ["@param tableName - 대상 테이블명", "@param tableName - Target table name"],
  ["@param columnMetas - 컬럼 메타데이터", "@param columnMetas - Column metadata"],
  ["@param records - 삽입할 레코드 배열", "@param records - Array of records to insert"],

  // db-conn.ts
  ["// 공통 상수", "// Common constants"],
  ["DB 연결 수립 타임아웃 (10초)", "DB connection establishment timeout (10 seconds)"],
  ["DB 쿼리 기본 타임아웃 (10분)", "DB query default timeout (10 minutes)"],
  ["DB 연결 에러 메시지", "DB connection error messages"],
  ["저수준 DB 연결 인터페이스", "Low-level DB connection interface"],
  [
    "각 DBMS별 구현체가 이 인터페이스를 구현합니다.",
    "Each DBMS-specific implementation implements this interface.",
  ],
  ["- {@link MysqlDbConn} - MySQL 연결", "- {@link MysqlDbConn} - MySQL connection"],
  ["- {@link MssqlDbConn} - MSSQL 연결", "- {@link MssqlDbConn} - MSSQL connection"],
  [
    "- {@link PostgresqlDbConn} - PostgreSQL 연결",
    "- {@link PostgresqlDbConn} - PostgreSQL connection",
  ],
  [
    "SdEventEmitter를 상속하여 'close' 이벤트를 발생시킵니다.",
    "Extends SdEventEmitter to emit 'close' events.",
  ],
  ["연결 설정", "Connection configuration"],
  ["연결 여부", "Connection status"],
  ["트랜잭션 진행 여부", "Transaction in progress"],
  ["DB 연결 수립", "Establish DB connection"],
  ["DB 연결 종료", "Close DB connection"],
  [
    "@param isolationLevel - 격리 수준 (선택)",
    "@param isolationLevel - Isolation level (optional)",
  ],
  ["SQL 쿼리 배열 실행", "Execute SQL query array"],
  ["@param queries - 실행할 SQL 문자열 배열", "@param queries - Array of SQL strings to execute"],
  ["@returns 각 쿼리별 결과 배열의 배열", "@returns Array of result arrays per query"],
  ["파라미터화된 쿼리 실행", "Execute parameterized query"],
  ["@param query - SQL 쿼리 문자열", "@param query - SQL query string"],
  ["@param params - 바인딩 파라미터 (선택)", "@param params - Binding parameters (optional)"],
  ["@returns 결과 배열의 배열", "@returns Array of result arrays"],
  ["대량 INSERT (네이티브 벌크 API 사용)", "Bulk INSERT (using native bulk API)"],
  ["- MySQL: LOAD DATA LOCAL INFILE (임시 파일)", "- MySQL: LOAD DATA LOCAL INFILE (temp file)"],
  [
    "@param tableName - 테이블명 (database.table 또는 database.schema.table)",
    "@param tableName - Table name (database.table or database.schema.table)",
  ],
  [
    "@param columnMetas - 컬럼명 → ColumnMeta 매핑",
    "@param columnMetas - Column name to ColumnMeta mapping",
  ],
  ["@param records - 삽입할 레코드 배열", "@param records - Array of records to insert"],
  ["커넥션 풀 설정", "Connection pool settings"],
  ["각 값의 기본값:", "Default values:"],
  ["- min: 1 (최소 연결 수)", "- min: 1 (minimum connections)"],
  ["- max: 10 (최대 연결 수)", "- max: 10 (maximum connections)"],
  [
    "- acquireTimeoutMillis: 30000 (연결 획득 타임아웃)",
    "- acquireTimeoutMillis: 30000 (connection acquire timeout)",
  ],
  [
    "- idleTimeoutMillis: 30000 (유휴 연결 타임아웃)",
    "- idleTimeoutMillis: 30000 (idle connection timeout)",
  ],
  ["최소 연결 수 (기본: 1)", "Minimum connections (default: 1)"],
  ["최대 연결 수 (기본: 10)", "Maximum connections (default: 10)"],
  ["연결 획득 타임아웃 (밀리초, 기본: 30000)", "Connection acquire timeout (ms, default: 30000)"],
  ["유휴 연결 타임아웃 (밀리초, 기본: 30000)", "Idle connection timeout (ms, default: 30000)"],
  ["DB 연결 설정 타입 (dialect별 분기)", "DB connection config type (per-dialect branching)"],
  ["MySQL 연결 설정", "MySQL connection config"],
  ["MSSQL 연결 설정", "MSSQL connection config"],
  ["PostgreSQL 연결 설정", "PostgreSQL connection config"],
  ["DbConnConfig에서 Dialect 추출", "Extract Dialect from DbConnConfig"],

  // node-db-context-executor.ts
  ["Node.js 환경용 DbContextExecutor", "DbContextExecutor for Node.js environment"],
  [
    "DbContext에서 사용하는 실행기로, 실제 DB 연결을 담당한다.",
    "Executor used by DbContext, responsible for actual DB connections.",
  ],
  [
    "커넥션 풀에서 연결을 획득하고 연결 상태를 활성화한다.",
    "Acquires a connection from the pool and activates connection state.",
  ],
  ["커넥션 풀에 연결을 반환한다.", "Returns connection to the connection pool."],
  ["@throws {Error} 연결되지 않은 상태일 때", "@throws {Error} When not connected"],
  [
    "@param isolationLevel - 트랜잭션 격리 수준",
    "@param isolationLevel - Transaction isolation level",
  ],
  ["@throws {Error} 연결되지 않은 상태일 때", "@throws {Error} When not connected"],
  ["@param query - SQL 쿼리 문자열", "@param query - SQL query string"],
  ["@param params - 쿼리 파라미터 배열", "@param params - Query parameter array"],
  ["@returns 쿼리 결과 배열", "@returns Query result array"],
  ["@param tableName - 대상 테이블명", "@param tableName - Target table name"],
  ["@param columnMetas - 컬럼 메타데이터", "@param columnMetas - Column metadata"],
  ["@param records - 삽입할 레코드 배열", "@param records - Array of records to insert"],
  ["@throws {Error} 연결되지 않은 상태일 때", "@throws {Error} When not connected"],
  ["QueryDef 배열 실행", "Execute QueryDef array"],
  [
    "QueryDef를 SQL로 변환하여 실행하고, ResultMeta를 사용하여 결과를 파싱한다.",
    "Converts QueryDef to SQL, executes it, and parses results using ResultMeta.",
  ],
  ["@param defs - 실행할 QueryDef 배열", "@param defs - QueryDef array to execute"],
  [
    "@param resultMetas - 결과 파싱용 메타데이터 배열 (타입 변환에 사용)",
    "@param resultMetas - Metadata array for result parsing (used for type conversion)",
  ],
  ["@returns 각 QueryDef의 실행 결과 배열", "@returns Array of execution results per QueryDef"],
  ["@throws {Error} 연결되지 않은 상태일 때", "@throws {Error} When not connected"],
  [
    "가져올 데이터가 없는 것으로 옵션 설정을 했을 때, 하나의 쿼리로 한번의 요청 보냄",
    "When options indicate no data to fetch, send a single request with one query",
  ],
  [
    "결과가 필요 없으므로 defs.length개의 빈 배열을 반환하여 인터페이스 계약 유지",
    "Return defs.length empty arrays to maintain interface contract since no results needed",
  ],
  ["각 def를 개별 실행", "Execute each def individually"],
  [
    "resultSetIndex가 지정된 경우 해당 인덱스의 결과셋 사용",
    "Use result set at specified index when resultSetIndex is set",
  ],

  // mssql-db-conn.ts
  ["MSSQL 데이터베이스 연결 클래스", "MSSQL database connection class"],
  [
    "tedious 라이브러리를 사용하여 MSSQL/Azure SQL 연결을 관리합니다.",
    "Manages MSSQL/Azure SQL connections using the tedious library.",
  ],
  ["진행 중인 요청 취소", "Cancel in-progress request"],
  ["연결 종료 대기", "Wait for connection close"],
  [
    "값의 타입을 추론하여 Tedious 데이터 타입 반환",
    "Infer value type and return Tedious data type",
  ],
  [
    "@param value - 타입을 추론할 값 (null/undefined 전달 시 오류 발생)",
    "@param value - Value to infer type from (throws on null/undefined)",
  ],
  ["@throws null/undefined가 전달되면 오류 발생", "@throws Throws on null/undefined input"],
  [
    "레코드를 row 배열로 변환 (컬럼 순서 유지, 값 변환 포함)",
    "Convert records to row arrays (maintaining column order, including value conversion)",
  ],
  [
    "// eslint-disable-next-line no-restricted-globals -- tedious 라이브러리가 Buffer를 요구함",
    "// eslint-disable-next-line no-restricted-globals -- tedious library requires Buffer",
  ],

  // postgresql-db-conn.ts
  ["PostgreSQL 데이터베이스 연결 클래스", "PostgreSQL database connection class"],
  [
    "pg 라이브러리를 사용하여 PostgreSQL 연결을 관리합니다.",
    "Manages PostgreSQL connections using the pg library.",
  ],
  ["// PostgreSQL은 단일 결과셋 반환", "// PostgreSQL returns single result set"],
  ["// COPY FROM STDIN 스트림 생성", "// Create COPY FROM STDIN stream"],
  ["// CSV 데이터 생성", "// Generate CSV data"],
  ["// 스트림으로 데이터 전송", "// Send data through stream"],
  ["PostgreSQL COPY CSV용 값 이스케이프", "Escape value for PostgreSQL COPY CSV"],
  ['return "\\\\N"; // NULL 표현', 'return "\\\\N"; // NULL representation'],
  [
    "// CSV 형식: 쌍따옴표로 감싸고, 내부 쌍따옴표는 두 번",
    "// CSV format: wrap in double quotes, double internal double quotes",
  ],
  [
    "PostgreSQL bytea hex 형식 (CSV 쌍따옴표로 감쌈)",
    "PostgreSQL bytea hex format (wrapped in CSV double quotes)",
  ],

  // mysql-db-conn.ts
  ["MySQL 데이터베이스 연결 클래스", "MySQL database connection class"],
  [
    "mysql2/promise 라이브러리를 사용하여 MySQL 연결을 관리합니다.",
    "Manages MySQL connections using the mysql2/promise library.",
  ],
  [
    "// root 사용자는 특정 database에 바인딩되지 않고 연결하여",
    "// Root user connects without binding to a specific database",
  ],
  [
    "// 모든 데이터베이스에 접근할 수 있도록 함 (관리 작업용)",
    "// to allow access to all databases (for admin tasks)",
  ],
  ["LOAD DATA LOCAL INFILE 지원", "LOAD DATA LOCAL INFILE support"],
  [
    "// 격리 수준을 먼저 설정 (다음 트랜잭션에 적용됨)",
    "// Set isolation level first (applies to next transaction)",
  ],
  ["// 그 다음 트랜잭션 시작", "// Then start transaction"],
  [
    "// MySQL은 INSERT/UPDATE/DELETE 문에 대해 ResultSetHeader를 반환함",
    "// MySQL returns ResultSetHeader for INSERT/UPDATE/DELETE statements",
  ],
  [
    "// SELECT 결과만 추출하기 위해 ResultSetHeader 객체를 필터링함",
    "// Filter out ResultSetHeader objects to extract only SELECT results",
  ],
  [
    "// ResultSetHeader는 affectedRows, fieldCount 등의 필드를 가지고 있음",
    "// ResultSetHeader has fields like affectedRows, fieldCount",
  ],
  ["// 임시 CSV 파일 생성", "// Create temporary CSV file"],
  ["// CSV 데이터 생성", "// Generate CSV data"],
  ["// 파일 쓰기", "// Write file"],
  [
    "// UUID/binary 컬럼은 임시 변수로 읽고 SET 절에서 UNHEX() 변환",
    "// UUID/binary columns read into temp variables and converted via UNHEX() in SET clause",
  ],
  ["// LOAD DATA LOCAL INFILE 실행", "// Execute LOAD DATA LOCAL INFILE"],
  ["// 임시 파일 삭제", "// Delete temporary file"],
  ["// 삭제 실패 무시", "// Ignore deletion failure"],
  ["MySQL LOAD DATA INFILE용 값 이스케이프", "Escape value for MySQL LOAD DATA INFILE"],
  ['return "\\\\N"; // MySQL NULL 표현', 'return "\\\\N"; // MySQL NULL representation'],
  ["// 탭, 줄바꿈, 백슬래시 이스케이프", "// Escape tab, newline, backslash"],
  ["BINARY(16) 저장용 hex", "Hex for BINARY(16) storage"],

  // Common logger patterns
  ["쿼리 실행", "Query execution"],
  ["DB 연결 오류", "DB connection error"],
  ["쿼리 수행중 오류발생", "Error during query execution"],
];

// Files to process
const rootDir = "D:/workspaces-13/simplysm/.claude/worktrees/agent-ab790434";
const filePaths = [
  "packages/orm-common/src/types/expr.ts",
  "packages/orm-common/src/types/query-def.ts",
  "packages/orm-common/src/schema/procedure-builder.ts",
  "packages/orm-common/src/schema/view-builder.ts",
  "packages/orm-common/src/schema/table-builder.ts",
  "packages/orm-common/src/schema/factory/column-builder.ts",
  "packages/orm-common/src/schema/factory/index-builder.ts",
  "packages/orm-common/src/schema/factory/relation-builder.ts",
  "packages/orm-common/src/query-builder/base/expr-renderer-base.ts",
  "packages/orm-common/src/query-builder/base/query-builder-base.ts",
  "packages/orm-common/src/query-builder/mssql/mssql-expr-renderer.ts",
  "packages/orm-common/src/query-builder/mssql/mssql-query-builder.ts",
  "packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts",
  "packages/orm-common/src/query-builder/mysql/mysql-query-builder.ts",
  "packages/orm-common/src/query-builder/postgresql/postgresql-expr-renderer.ts",
  "packages/orm-common/src/query-builder/postgresql/postgresql-query-builder.ts",
  "packages/orm-node/src/create-orm.ts",
  "packages/orm-node/src/create-db-conn.ts",
  "packages/orm-node/src/pooled-db-conn.ts",
  "packages/orm-node/src/node-db-context-executor.ts",
  "packages/orm-node/src/types/db-conn.ts",
  "packages/orm-node/src/connections/mssql-db-conn.ts",
  "packages/orm-node/src/connections/mysql-db-conn.ts",
  "packages/orm-node/src/connections/postgresql-db-conn.ts",
];

let totalReplacements = 0;

for (const relPath of filePaths) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${relPath}`);
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
      // Only replace if the Korean text exists
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
    console.log(`OK (${fileReplacements} replacements): ${relPath}`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`NO CHANGES: ${relPath}`);
  }
}

console.log(`\nTotal replacements: ${totalReplacements}`);
