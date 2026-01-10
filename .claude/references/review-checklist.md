# 리뷰 체크리스트

`/sd:review` 커맨드에서 관점별로 참조하는 상세 체크리스트입니다.

---

## 잠재적 버그 (`--bug`)

### 엣지케이스 미처리
- 빈 배열/객체 처리
- null/undefined 처리
- 경계값 (0, -1, MAX_VALUE 등)
- 빈 문자열 vs null vs undefined 구분

### 비동기 처리 문제
- Promise 누락 (floating promise)
- race condition 가능성
- 에러 전파 누락 (catch 없음)
- async 함수에서 await 누락
- 동시 실행 시 상태 충돌

### 리소스 누수
- 이벤트 리스너 해제 누락
- setInterval/setTimeout 정리 누락
- 스트림/커넥션 close 누락
- Angular: 구독 해제 누락

### 타입 관련 위험
- `as` 타입 단언으로 숨겨진 런타임 오류
- `any` 타입 사용으로 인한 타입 안전성 손실
- 타입 가드 없이 타입 좁히기

### 예시 코드
```typescript
// ❌ 버그 위험
const data = response as UserData; // 실제 타입 검증 없음
items.forEach(async (item) => process(item)); // floating promise

// ✅ 안전한 코드
if (isUserData(response)) { const data = response; }
await Promise.all(items.map(item => process(item)));
```

---

## 로직 이상 (`--logic`)

### 조건문 오류
- 부정 조건 오류 (`!` 누락/잘못된 위치)
- 복합 조건 우선순위 오류 (`&&`, `||` 혼합)
- 조건 분기 누락 (else 없음)
- 조기 반환 조건 오류

### 경계값 실수
- off-by-one 오류 (`<` vs `<=`)
- 배열 인덱스 범위 초과
- 문자열 slice/substring 경계

### 예외 상황 미처리
- throw 후 흐름 제어 누락
- try-catch 범위 부적절
- finally에서 반환값 덮어쓰기

### 잘못된 가정
- 입력 데이터 형식 가정
- 외부 API 응답 구조 가정
- 실행 순서 가정 (비동기)

---

## 설계 문제 (`--design`)

### 단일 책임 위반 (SRP)
- 한 클래스/함수가 여러 역할 수행
- 한 파일에 관련 없는 여러 기능
- 변경 이유가 여러 개인 모듈

### 과도한 결합
- 순환 의존성
- 구체 클래스에 직접 의존
- 전역 상태 공유
- 깊은 중첩 호출

### 추상화 수준 불일치
- 고수준/저수준 로직 혼재
- 도메인 로직에 인프라 코드 침투
- 추상화 누수 (구현 세부사항 노출)

### 아키텍처 레이어 위반
```
core-common (최하위)
    ↑
core-browser / core-node
    ↑
orm-common → orm-node
    ↑
service-common
    ↑
service-client / service-server
```
- 상위 레이어에서 하위 레이어만 의존해야 함
- 레이어 건너뛰기 금지

---

## 성능 최적화 (`--perf`)

### 불필요한 반복/재계산
- 루프 내 불변 계산
- 동일 데이터 반복 조회
- 메모이제이션 미적용

### 메모리 비효율
- 대용량 데이터 전체 메모리 로드
- 불필요한 복사 (spread 과다)
- 클로저로 인한 메모리 유지

### 동기 블로킹
- 큰 파일 동기 읽기
- 메인 스레드 블로킹 작업
- 무거운 계산 직접 수행

### N+1 쿼리 패턴
- 루프 내 개별 쿼리 실행
- 관계 데이터 lazy 로딩 남용
- 배치 처리 가능한 개별 요청

### 예시 코드
```typescript
// ❌ N+1 패턴
for (const user of users) {
  const orders = await db.query(`SELECT * FROM orders WHERE user_id = ?`, [user.id]);
}

// ✅ 배치 쿼리
const userIds = users.map(u => u.id);
const orders = await db.query(`SELECT * FROM orders WHERE user_id IN (?)`, [userIds]);
```

---

## 코드 일관성 (`--style`)

### CLAUDE.md 위반
- 네이밍 컨벤션 (kebab-case 파일명, 접두사 금지)
- `Buffer` 대신 `Uint8Array` 사용
- `#` private 필드 사용
- `null` 대신 `undefined` 미사용
- `any` 타입 사용
- `return await` 누락

### 패키지별 가이드라인 위반
- 패키지 CLAUDE.md 규칙 미준수
- 의존성 방향 위반

### 아키텍처 레이어 위반
- 잘못된 import 경로
- 레이어 건너뛰기
- 순환 참조

---

## 유지보수성 (`--maintain`)

### 복잡한 로직
- 긴 함수 (50줄+)
- 깊은 중첩 (4단계+)
- 복잡한 조건 (3개+ AND/OR 조합)
- 복잡한 삼항 연산자 중첩

### 중복 코드
- 유사한 로직 반복
- 복사-붙여넣기 패턴
- 추출 가능한 공통 로직

### 매직 넘버/하드코딩
- 의미 없는 숫자 리터럴
- 하드코딩된 문자열
- 설정값 코드 내 직접 작성

### 가독성 문제
- 의미 없는 변수명
- 과도한 약어
- 주석 없는 복잡한 로직

---

## 구조적 최적화 (`--structure`)

### 파일/모듈 분리
- 한 파일에 너무 많은 코드 (300줄+)
- 관련 없는 기능이 한 파일에
- 재사용 가능한 로직 미분리

### API 설계 개선
- 불일치하는 함수 시그니처
- 부적절한 파라미터 순서
- 반환 타입 불명확

### export 구조 최적화
- index.ts에서 미export
- 불필요한 public export
- 순환 export 의존

### 패키지 책임 분석 (전체 분석 시)

**하위 레이어 이동 후보**:
- 상위 패키지의 순수 유틸 함수 (환경 의존성 없음)
- 여러 패키지에서 import하는 범용 로직
- 도메인 무관한 범용 헬퍼 (문자열 처리, 날짜 포맷 등)

**상위 레이어 이동 후보**:
- common 패키지의 Node/Browser 특정 코드 (fs, DOM 등)
- 인프라 레이어에 섞인 도메인 로직

**분석 방법**:
```
1. 각 패키지 src/index.ts export 목록 확인
2. cross-package import 빈도 측정 (grep "@simplysm/{패키지}")
3. 환경 의존성 체크:
   - Node: fs, path, child_process, worker_threads 등
   - Browser: document, window, DOM API 등
4. 의존성 최소화 원칙 적용
```

**예시**:
```
❌ service-client에 있는 순수 문자열 유틸 → core-common으로 이동
❌ orm-node에 있는 SQL 문자열 빌더 로직 → orm-common으로 이동
❌ core-common에 있는 fs 관련 코드 → core-node로 이동
```

---

## 테스트 필요성 (`--test`)

### 테스트 제안 대상
- 복잡한 조건 분기 (3개+ 분기)
- 엣지케이스 처리 로직
- 타입 단언 (`as`) 사용 부분
- 비동기 에러 처리
- 외부 의존성 모킹 필요 부분

### 미완성 테스트 탐지
- `it.skip()` / `describe.skip()`
- `it.todo()` / `test.todo()`
- `// TODO: test` 주석
- `// FIXME` 테스트 관련 주석

### 커버리지 갭
- 테스트 없는 public 함수
- 에러 케이스 미테스트
- 경계값 미테스트

---

## 불필요한 파일 (`--cleanup`)

### 삭제 대상 패턴
| 패턴 | 설명 |
|------|------|
| `PLAN*.md`, `*_PLAN.md` | 완료된 계획 파일 |
| `MIGRATION*.md` | 완료된 마이그레이션 계획 |
| `*.tmp`, `*.bak`, `*.old` | 임시/백업 파일 |
| `*.log` | 로그 파일 (gitignore 대상) |

### 검토 필요 대상
- 빈 파일 또는 의미 없는 파일
- 더 이상 참조되지 않는 문서
- 중복 설정 파일
- 사용되지 않는 유틸 함수 파일

### 제외 대상
- 프로젝트 루트 `.*` 폴더 (`.claude/`, `.git/` 등)
- `node_modules/`
- 빌드 출력물

---

## 문서 적절성 (`--docs`)

### 루트 문서
| 파일 | 확인 항목 |
|------|----------|
| `CLAUDE.md` | 프로젝트 컨벤션, 규칙, 패키지 구조 최신성 |
| `README.md` | 프로젝트 소개, 설치/사용법 정확성 |

### 패키지 문서
| 파일 | 확인 항목 |
|------|----------|
| `packages/*/CLAUDE.md` | 가이드라인과 실제 구현 일치 |
| `packages/*/README.md` | API 문서, 사용 예시 정확성 |

### 검토 체크리스트
| 항목 | 확인 내용 |
|------|----------|
| 최신성 | 코드 변경사항 문서 반영 여부 |
| 정확성 | 예시 코드, API 설명이 실제 구현과 일치 |
| 완성도 | 필수 섹션 누락 (개요, 사용법, API) |
| 일관성 | 다른 패키지 문서와 형식/스타일 통일 |
| 중복/불일치 | 루트-패키지 CLAUDE.md 간 정보 충돌 |
| 누락 | CLAUDE.md/README.md 없는 패키지 |
