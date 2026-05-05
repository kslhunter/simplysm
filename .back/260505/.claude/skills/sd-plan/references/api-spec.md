# API/서비스 메서드 명세 작성 가이드

서비스 / API 섹션 안에 작성. 메서드별 요청·응답·에러·권한을 상세히 정리한다.

## 표현 형식

메서드별로 표 또는 정의 블록으로 작성한다.

| 항목 | 내용 |
|---|---|
| 메서드 | `WorkService.createWork(dto): Promise<Work>` |
| 요청 (CreateWorkDto) | 필드별 타입·필수·검증 규칙 |
| 응답 (성공) | 응답 타입의 모든 필드 |
| 에러 케이스 | 에러 타입 + 발생 조건 |
| 권한 | 호출 가능한 권한 |

## 작성 원칙

- 요청 스키마: 필드명·타입·필수/선택·검증 규칙(길이/범위/형식) 모두 명시.
- 응답 스키마: 모든 반환 필드. nullable 필드 표시.
- 에러 케이스: 발생 조건과 에러 타입을 짝으로. 사용자 메시지 또는 에러 코드 포함.
- 권한: Role 명시 + 조건부 권한(예: "본인 데이터만")이면 조건도 명시.
- 페이지네이션·정렬·필터가 있는 조회 메서드는 그 옵션도 명시.

## 좋은 예 (작업 등록)

| 항목 | 내용 |
|---|---|
| 메서드 | `WorkService.createWork(dto: CreateWorkDto): Promise<Work>` |
| 요청 | `title (string, 필수, 1~200자, trim)`, `dueDate (Date, 선택, 오늘 이후)`, `assigneeId (uuid, 필수)`, `description (string, 선택, 0~1000자)` |
| 응답 | `Work { id, title, dueDate (nullable), assigneeId, status: 'pending', createdAt }` |
| 에러 | `ValidationError` (title 빈/초과, dueDate 과거, description 초과), `NotFoundError` (assigneeId에 해당 User 없음), `PermissionError` (호출자가 ADMIN 아님) |
| 권한 | `ROLE.ADMIN` |

## 좋은 예 (조회 메서드 — 페이지네이션 포함)

| 항목 | 내용 |
|---|---|
| 메서드 | `WorkService.listWorks(query: ListWorksQuery): Promise<{ items: Work[], total: number }>` |
| 요청 | `status (Work.status, 선택, 다중 선택 가능)`, `assigneeId (uuid, 선택)`, `keyword (string, 선택, title 부분 일치)`, `page (number, 기본 1)`, `pageSize (number, 기본 20, 최대 100)`, `sort (Enum, 기본 'createdAt:desc')` |
| 응답 | `{ items: Work[], total: number }` |
| 에러 | `ValidationError` (pageSize 범위 초과) |
| 권한 | `ROLE.ADMIN` (전체 조회) / `ROLE.STAFF` (`assigneeId = self` 자동 적용) |

## 무엇을 잡아주나

- 검증 규칙 (길이·형식·범위) 명시 — Gherkin Scenario 작성의 기반
- 에러 케이스 누락 — 어떤 입력에 어떤 에러를 내는지
- 권한 요구사항 — 누가 호출할 수 있는지, 조건부 권한은 어떤 조건인지
- 응답 필드 누락 — 클라이언트가 어떤 필드를 받는지
- nullable·선택 필드 — 클라이언트의 처리 분기

## 나쁜 예

- "title을 받아서 Work 생성" — 검증 규칙·에러 누락
- 에러 케이스에 "ValidationError 발생"만 기록 (어떤 조건에 발생하는지 모호)
- 권한 누락 (누구나 호출 가능한지 ADMIN만인지 모호)
- 응답을 `Work` 한 단어로만 표현 (필드 정보 모호)
- 페이지네이션 메서드인데 `page`/`pageSize` 기본값·최대값 누락

## 기존 시그니처와의 차이

- 시그니처: `createWork(dto): Promise<Work>` — 함수의 형태만
- 명세: 검증 규칙 + 에러 케이스 + 권한 + 응답 필드까지 — 함수의 계약 전체
