# Plan 작성 예시

`/sd:plan` 커맨드에서 Plan 유형별로 참조하는 예시입니다.

---

## 기능 추가 Plan

새로운 기능을 구현할 때 사용합니다.

```markdown
# Plan: ORM 트랜잭션 지원 추가

## 요구사항
ORM에 트랜잭션 지원 기능을 추가하여 여러 DB 작업을 원자적으로 처리할 수 있게 한다.

## 분석 결과

### 영향 범위
| 패키지 | 파일 | 변경 유형 |
|--------|------|-----------|
| orm-common | src/db-context.ts | 수정 |
| orm-common | src/types/db.ts | 수정 |
| orm-node | src/connections/*.ts | 수정 |
| orm-node | src/pooled-db-conn.ts | 수정 |

### 주의사항
- 기존 DbContext API에 backward compatible 유지
- 각 DB 벤더별 트랜잭션 문법 차이 처리

## 구현 단계

### Phase 1: 타입 정의
**목표**: 트랜잭션 관련 인터페이스 정의

- [ ] `orm-common/src/types/db.ts`에 TransactionOptions 타입 추가
- [ ] `orm-common/src/db-context.ts`에 transaction() 메서드 시그니처 추가

### Phase 2: 연결별 구현
**목표**: 각 DB 연결에 트랜잭션 지원 추가

- [ ] MssqlDbConn에 beginTransaction/commit/rollback 구현
- [ ] MysqlDbConn에 beginTransaction/commit/rollback 구현
- [ ] PostgresqlDbConn에 beginTransaction/commit/rollback 구현

**검증**: `/sd:check orm-node --type`

### Phase 3: DbContext 통합
**목표**: 상위 API에서 트랜잭션 사용 가능하게

- [ ] DbContext.transaction() 구현
- [ ] 중첩 트랜잭션 처리 (savepoint)

**검증**: `/sd:check orm-common`

### Phase 4: 테스트
**목표**: 트랜잭션 동작 검증

- [ ] 단위 테스트 작성 (mock 사용)
- [ ] 통합 테스트 작성 (실제 DB)

**검증**: `/sd:check orm-node --test`

## 최종 검증
- [ ] 전체 타입 체크
- [ ] 전체 테스트

## 문서 업데이트
- [ ] orm-common/CLAUDE.md 트랜잭션 섹션 추가
- [ ] orm-node/README.md 사용법 추가
```

---

## 리팩토링 Plan

기존 코드 구조를 개선할 때 사용합니다.

```markdown
# Plan: Array Extension 모듈 분리

## 요구사항
array.ext.ts 파일(500줄+)을 역할별로 분리하여 유지보수성을 높인다.

## 분석 결과

### 영향 범위
| 패키지 | 파일 | 변경 유형 |
|--------|------|-----------|
| core-common | src/extensions/array.ext.ts | 삭제 |
| core-common | src/extensions/array-ext.helpers.ts | 신규 |
| core-common | src/extensions/array-ext.types.ts | 신규 |
| core-common | src/extensions/array.ext.ts | 신규 (re-export) |
| core-common | src/index.ts | 수정 |

### 주의사항
- 외부 API 변경 없음 (re-export로 호환성 유지)
- 기존 import 경로 유지

## 구현 단계

### Phase 1: 파일 분리
**목표**: 역할별 파일 생성

- [ ] array-ext.types.ts 생성 (타입 정의)
- [ ] array-ext.helpers.ts 생성 (유틸 함수)
- [ ] array.ext.ts는 re-export만

### Phase 2: 검증
**목표**: 기존 동작 유지 확인

- [ ] 기존 테스트 통과 확인
- [ ] import 경로 문제 없는지 확인

**검증**: `/sd:check core-common`

## 최종 검증
- [ ] 전체 타입 체크
- [ ] 전체 테스트

## 문서 업데이트
- [ ] core-common/CLAUDE.md 구조 섹션 업데이트
```

---

## 버그 수정 Plan

버그를 분석하고 수정할 때 사용합니다.

```markdown
# Plan: DateTime 파싱 오류 수정

## 요구사항
DateTime.parse()에서 특정 포맷(ISO 8601 with offset)이 잘못 파싱되는 버그 수정

## 분석 결과

### 문제 원인
`DateTime.ts:145`에서 offset 파싱 시 `+` 기호를 누락 처리

### 영향 범위
| 패키지 | 파일 | 변경 유형 |
|--------|------|-----------|
| core-common | src/types/DateTime.ts | 수정 |
| core-common | tests/types/date-time.spec.ts | 수정 |

### 주의사항
- 기존 정상 케이스 깨지지 않도록 주의
- 관련 Time 클래스에도 동일 이슈 있는지 확인

## 구현 단계

### Phase 1: 테스트 추가
**목표**: 실패하는 테스트로 버그 재현

- [ ] ISO 8601 offset 포맷 테스트 케이스 추가
- [ ] 테스트 실패 확인

### Phase 2: 버그 수정
**목표**: 파싱 로직 수정

- [ ] `DateTime.ts:145` offset 파싱 로직 수정
- [ ] Time 클래스 동일 이슈 확인 및 수정

**검증**: `/sd:check core-common`

## 최종 검증
- [ ] 전체 테스트 (회귀 테스트)
```

---

## 마이그레이션 Plan

레거시 코드를 새 구조로 마이그레이션할 때 사용합니다.

```markdown
# Plan: service-client 마이그레이션

## 요구사항
`.legacy-packages/sd-service-client`를 `packages/service-client`로 마이그레이션

## 분석 결과

### 영향 범위
| 패키지 | 파일 | 변경 유형 |
|--------|------|-----------|
| service-client | package.json | 신규 |
| service-client | src/**/*.ts | 신규 |
| service-client | tests/**/*.spec.ts | 신규 |

### 주의사항
- 레거시 코드 직접 복사 금지
- 최신 TypeScript/패턴 적용
- CLAUDE.md 규칙 준수

## 구현 단계

### Phase 1: 프로젝트 설정
**목표**: 패키지 구조 생성

- [ ] package.json 생성
- [ ] tsconfig.json 생성
- [ ] 디렉토리 구조 생성

### Phase 2: 핵심 기능 구현
**목표**: 주요 클래스 마이그레이션

- [ ] ServiceClient 클래스
- [ ] 프로토콜 래퍼
- [ ] 트랜스포트 레이어

**검증**: `/sd:check service-client --type`

### Phase 3: 부가 기능 구현
**목표**: 나머지 기능 구현

- [ ] ORM 클라이언트
- [ ] 파일 클라이언트

**검증**: `/sd:check service-client`

### Phase 4: 테스트 작성
**목표**: 테스트 커버리지 확보

- [ ] 단위 테스트
- [ ] 통합 테스트 (mock)

**검증**: `/sd:check service-client --test`

## 최종 검증
- [ ] 전체 타입 체크
- [ ] 전체 테스트
- [ ] 통합 테스트

## 문서 업데이트
- [ ] CLAUDE.md 작성
- [ ] README.md 작성
- [ ] 루트 CLAUDE.md 패키지 목록 추가
```

---

## Plan 작성 팁

### 좋은 Phase 구분
- 독립적으로 검증 가능한 단위로 분리
- 의존성 순서대로 배치
- 한 Phase에 너무 많은 작업 X (3-5개 적정)

### 검증 배치 기준
| 상황 | 검증 위치 |
|------|----------|
| API 시그니처 변경 | Phase 완료 시 |
| 내부 리팩토링만 | Phase 완료 시 (빠르게) |
| 여러 패키지 연계 | Plan 완료 시 통합 테스트 |

### 작업 항목 작성
```markdown
# ✅ 좋은 예
- [ ] `src/types/db.ts`에 TransactionOptions 인터페이스 추가

# ❌ 나쁜 예
- [ ] 타입 정의 (어디에? 무슨 타입?)
```
