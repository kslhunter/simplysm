# SQL 이스케이프 보안 강화 설계

**작성일**: 2026-02-10
**목적**: orm-common의 SQL 이스케이프 방식 강화 및 보안 가이드 문서화

---

## 1. 현황 분석

### 현재 이스케이프 방식

orm-common의 QueryBuilder는 **문자열 이스케이프 방식**을 사용하여 SQL 생성:

- 값을 SQL 문자열에 직접 포함
- 파라미터 바인딩 미사용 (ORM의 동적 쿼리 특성상 불가능)

### 발견된 취약점

**MySQL** (`mysql-expr-renderer.ts`):

- `escapeString()`: `\` → `\\`, `'` → `''` ✓
- `escapeValue()`: `'` → `''` 만 처리 ✗ (백슬래시 누락)
- 불일치로 인한 혼란 및 잠재적 취약점

**MSSQL** (`mssql-expr-renderer.ts`):

- `'` → `''` 처리
- MSSQL은 백슬래시를 특수 문자로 취급하지 않으므로 안전 ✓

**PostgreSQL** (`postgresql-expr-renderer.ts`):

- `'` → `''` 처리
- `standard_conforming_strings=on` (기본) 환경에서 안전 ✓

### 보안 맥락

- ORM은 애플리케이션 레이어에서 호출
- 사용자 입력이 직접 들어오지 않음 (일반적 사용)
- 그러나 애플리케이션에서 검증 없이 사용자 입력을 전달하면 위험

---

## 2. 강화 전략

### MySQL 이스케이프 규칙

**현재 연결 설정** (`mysql-db-conn.ts:58`):

- `charset: "utf8mb4"` → 멀티바이트 공격 방어됨 ✓

**강화할 이스케이프:**

```typescript
escapeString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')   // 백슬래시 (최우선)
    .replace(/'/g, "''")      // 따옴표
    .replace(/\0/g, '\\0')    // NULL 바이트
    .replace(/\n/g, '\\n')    // 줄바꿈
    .replace(/\r/g, '\\r')    // 캐리지 리턴
    .replace(/\t/g, '\\t');   // 탭
}

escapeValue(value: unknown): string {
  if (value == null) return "NULL";
  if (typeof value === "string") {
    return `'${this.escapeString(value)}'`;  // 통일!
  }
  // ... 나머지 동일
}
```

**추가 고려사항:**

- `\x1a` (Ctrl+Z, EOF): Windows 환경 고려 시 이스케이프
- 단, 현재까지 실무에서 문제된 사례 없음 → YAGNI 원칙으로 제외

### MSSQL 이스케이프 규칙

**현재 구현 유지:**

```typescript
escapeValue(value: string): string {
  return `N'${value.replace(/'/g, "''")}'`;
}
```

- MSSQL은 따옴표 두 배만으로 충분
- 백슬래시는 일반 문자로 취급
- **변경 불필요** ✓

### PostgreSQL 이스케이프 규칙

**현재 구현 유지:**

```typescript
escapeValue(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
```

- `standard_conforming_strings=on` (기본값) 환경
- 백슬래시는 일반 문자로 취급
- E'...' 구문 미사용
- **변경 불필요** ✓

### 통일성 확보

**`escapeString()`과 `escapeValue()` 일치:**

- MySQL: `escapeValue`가 `escapeString` + 따옴표 감싸기로 통일
- 혼란 제거 및 재사용성 향상

---

## 3. 구현 계획

### 코드 수정 위치

**1. MySQL ExprRenderer** (`packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts`):

```typescript
// 82-84행: escapeString() - 강화
escapeString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// 87-116행: escapeValue() - escapeString() 활용하도록 수정
escapeValue(value: unknown): string {
  if (value == null) return "NULL";
  if (typeof value === "string") {
    return `'${this.escapeString(value)}'`;  // 통일!
  }
  // ... 나머지 동일
}
```

**2. MSSQL & PostgreSQL** - 변경 없음

### 테스트 계획

**테스트 파일 위치:**

- `packages/orm-common/tests/escape.spec.ts` (신규 생성)

**테스트 케이스:**

1. 기본 이스케이프: `'`, `\`, `\0`
2. 제어 문자: `\n`, `\r`, `\t`
3. 조합 공격: `\' OR 1=1 --`
4. NULL 바이트 삽입: `admin\0-- `
5. 멀티바이트 (이미 방어됨 확인)

**통합 테스트:**

- `tests/orm/` - 실제 DB 연결하여 INSERT/SELECT 검증
- 이스케이프된 값이 올바르게 저장/조회되는지 확인

### 구현 순서

1. MySQL `escapeString()` 강화
2. MySQL `escapeValue()`가 `escapeString()` 사용하도록 수정
3. 단위 테스트 작성 및 실행
4. 통합 테스트 실행 (Docker DB)
5. 타입체크 및 린트

---

## 4. 문서화 계획

### 보안 가이드 추가 위치

**CLAUDE.md** - 프로젝트 전반 가이드에 추가:

```markdown
## ORM 보안 가이드

### SQL 인젝션 방지

orm-common은 문자열 이스케이프 방식으로 SQL을 생성합니다.
다음 규칙을 준수하세요:

#### ✓ 안전한 사용

- 애플리케이션 코드에서 값 검증 후 ORM 사용
- 타입이 보장된 값 (number, boolean, DateTime 등)
- 신뢰할 수 있는 내부 데이터

#### ✗ 위험한 사용

- 사용자 입력을 검증 없이 WHERE 조건에 직접 사용
- 외부 API 응답을 검증 없이 사용
- 파일 업로드 내용을 검증 없이 사용

#### 권장 패턴

\`\`\`typescript
// 나쁜 예: 사용자 입력 직접 사용
const userInput = req.query.name; // "'; DROP TABLE users; --"
await db.user().where((u) => [expr.eq(u.name, userInput)]).result();

// 좋은 예: 검증 후 사용
const userName = validateUserName(req.query.name); // 검증 실패 시 예외
await db.user().where((u) => [expr.eq(u.name, userName)]).result();

// 더 좋은 예: 타입 강제
const userId = Number(req.query.id); // NaN 체크 필수
if (Number.isNaN(userId)) throw new Error("Invalid ID");
await db.user().where((u) => [expr.eq(u.id, userId)]).result();
\`\`\`
```

### 기술적 제약 명시

**README.md 또는 docs/security.md**:

```markdown
## 기술적 제약사항

### 파라미터 바인딩 미지원

orm-common은 동적 쿼리 빌딩 특성상 파라미터 바인딩을 사용하지 않습니다.
대신 강화된 문자열 이스케이프를 사용합니다.

**이유:**

- WHERE 조건, JOIN이 런타임에 동적으로 결정됨
- 표현식이 중첩되고 조합됨
- 파라미터 바인딩 전환 시 전체 아키텍처 재설계 필요

**완화 조치:**

- MySQL: 백슬래시, 따옴표, NULL 바이트, 제어 문자 이스케이프
- utf8mb4 charset 강제로 멀티바이트 공격 방어
- 애플리케이션 레벨 입력 검증 필수
```

### 변경 이력 기록

**CHANGELOG.md**:

```markdown
## [Unreleased]

### Security

- MySQL ExprRenderer의 문자열 이스케이프 강화
  - 백슬래시, NULL 바이트, 제어 문자 이스케이프 추가
  - escapeString()과 escapeValue() 동작 통일
```

---

## 5. 구현 불가능한 부분

다음 사항은 ORM 레벨에서 기술적으로 완벽히 방어할 수 없으며, **애플리케이션 책임**입니다:

1. **검증되지 않은 사용자 입력**
   - 애플리케이션에서 입력 검증을 건너뛰고 ORM에 직접 전달하는 경우
   - 해결: 애플리케이션 레벨 검증 필수 (문서화)

2. **신뢰할 수 없는 외부 데이터**
   - 외부 API 응답, 파일 내용 등을 검증 없이 사용
   - 해결: 사용 전 검증 필수 (문서화)

3. **동적 테이블/컬럼명**
   - 사용자 입력으로 테이블명이나 컬럼명을 결정하는 경우
   - 해결: 화이트리스트 검증 필수 (문서화)

---

## 6. 향후 고려사항

- **파라미터 바인딩 전환 연구**: 장기적으로 아키텍처 재설계 고려
- **보안 감사**: 정기적인 보안 리뷰 및 테스트
- **사용자 피드백**: 실제 사용 사례에서 발견되는 이슈 수집
