# Eval: sd-plan

## 행동 Eval

### 시나리오 1: 기본 Feature 설계

- 입력: "/sd-plan .tasks/test-project/wbs.md 1.1"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature 1.1 "도서 대출" (범위: 대출 신청, 대출 승인/반려, 반납 처리, 연체 확인 — 4개 세부 기능). 경계: "예약 기능은 이 Feature에서 다루지 않음, 도서 등록/삭제는 Feature 1.2에서 다룸". 근거: "요구사항: 도서 대출/반납 관리"
  - `src/models/book.ts` — Book 인터페이스 (id, title, author, status 필드)
  - `src/models/loan.ts` — Loan 인터페이스 (id, bookId, userId, loanDate, returnDate 필드)
  - `src/services/book-service.ts` — BookService 클래스 (getBooks 메서드만 존재)
  - `package.json` — 기본 TypeScript 프로젝트 설정
- 체크리스트:
  - [ ] wbs의 범위(4개 세부 기능)를 구체적 동작 수준으로 세분화했다
  - [ ] 범위의 세부 기능에 대해 Rule(비즈니스 규칙)을 도출했다
  - [ ] Rule에 대한 Example(구체 사례: 입력 → 기대 결과)을 도출했다
  - [ ] 불확실한 사항에 대한 Question을 도출했다
  - [ ] Question 도출 시 적용한 기법명(Decision Table, Boundary Value Analysis 등)을 표기했다
  - [ ] 불명확한 부분에 대해 선택지를 제시했다
  - [ ] 해소된 결정사항이 설계 결정 테이블(D1, D2, ...)에 기록되었다
  - [ ] Gherkin Feature/Rule:/Scenario 구조가 생성되었다
  - [ ] Gherkin의 Rule: 그룹에 `# 근거:` 주석이 포함되었다
  - [ ] 기존 소스 코드(Book, Loan, BookService)를 파악하고 출력에 반영했다
  - [ ] Tech Design Doc에 배경, 목표, 비목표, 설계, 대안 검토가 포함되었다
  - [ ] Tech Design Doc의 항목에 `[근거: ...]` 태그가 포함되었다
  - [ ] Vertical Slicing으로 Scenario가 Slice에 매핑되었다
  - [ ] Feature 문서가 `.tasks/test-project/` 디렉토리에 생성되었다
  - [ ] Feature 문서 파일명이 `1.1-` 접두사를 포함한다
  - [ ] Feature 문서에 참조 자료, 설계 결정, 요구명세(Gherkin), 구현계획(Tech Design + Slicing)이 포함되었다
  - [ ] 정보 유실 방지 검증을 수행했다 (수행 내용이 출력에 기록됨)
  - [ ] wbs.md에 역방향 피드백을 반영했다

### 시나리오 2: 입력 누락 시 안내

- 입력: "/sd-plan"
- 사전 조건: 없음
- 체크리스트:
  - [ ] wbs 문서 경로 또는 Feature 번호가 필요함을 출력에서 언급했다
  - [ ] `/sd-wbs` 실행을 안내했다
  - [ ] Feature 문서 파일을 생성하지 않았다

### 시나리오 3: SPIDR 분리 제안

- 입력: "/sd-plan .tasks/test-project/wbs.md 1.1"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature 1.1 "사용자 관리" (범위: 회원가입, 로그인, 로그아웃, 비밀번호 변경, 프로필 수정, 역할 관리, 권한 설정 — 7개 세부 기능). 경계: "SSO 연동은 이 Feature에서 다루지 않음". 근거: "요구사항: 사용자 관리 기능 일체"
  - 사용자 응답: 분리안 수락
- 체크리스트:
  - [ ] 세부 기능을 구체적 동작 수준으로 재나열했다
  - [ ] 재나열 결과가 5개를 초과함을 인지했다
  - [ ] SPIDR 축으로 분리안을 제시했다
  - [ ] "그대로 진행" 옵션이 분리안에 포함되었다
  - [ ] 분리 수락 후 wbs 문서를 수정했다
  - [ ] wbs 수정 후 Step 3(Gherkin 생성) 이후로 진행하지 않고 종료했다
  - [ ] 분리된 각 Feature별 `/sd-plan` 재호출을 안내했다

## 안티패턴 Eval

- [ ] 기술적 구현 방법(How)에 대한 결정을 확인 없이 내린다
- [ ] Question 도출 시 기법명을 표기하지 않는다
- [ ] 코드베이스를 탐색하지 않고 구현계획을 작성한다
- [ ] Gherkin Rule: 그룹에 근거 주석이 없다
- [ ] Tech Design Doc 항목에 [근거: ...] 태그가 없다
- [ ] 정보 유실 방지 검증을 수행하지 않는다
- [ ] wbs 역방향 피드백을 수행하지 않는다
- [ ] Feature 문서에 설계 결정 테이블이 없다
- [ ] SPIDR 분리 수락 후 Step 3 이후(Gherkin 생성, 구현계획 등)를 계속 진행한다
