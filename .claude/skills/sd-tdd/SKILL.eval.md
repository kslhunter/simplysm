# Eval: sd-tdd

## 행동 Eval

### 시나리오 1: 기본 TDD 개발

- 입력: "/sd-tdd .tasks/test-project/1.1-book-loan.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md`:
    ```markdown
    # WBS: test-project

    ## 참조 자료
    - src/models/book.ts — Book 인터페이스
    - src/models/loan.ts — Loan 인터페이스

    ## Feature Breakdown
    - [ ] 1.1 도서 대출
    ```
  - `.tasks/test-project/1.1-book-loan.md`:
    ```markdown
    # Feature 1.1: 도서 대출

    ## 참조 자료
    - src/models/book.ts — Book 인터페이스
    - src/models/loan.ts — Loan 인터페이스
    - src/services/loan-service.ts — LoanService 클래스

    ## 설계 결정

    | ID | 결정 | 근거 |
    |----|------|------|
    | D1 | 대출 기간은 14일로 고정한다 | MVP에서는 고정 기간으로 충분 |

    ## 요구명세

    Feature: 도서 대출

      Rule: 도서 대출 처리
        # 근거: 대출 가능 여부를 상태로 판단한다

        Scenario: 대출 가능한 도서를 대출한다
          Given 도서 "TypeScript 입문"이 "available" 상태이다
          When 사용자가 해당 도서를 대출 신청한다
          Then 도서 상태가 "loaned"로 변경된다
          And 대출 기록이 생성된다
          And 반납 예정일은 대출일로부터 14일 후이다

        Scenario: 이미 대출중인 도서를 대출 시도한다
          Given 도서 "TypeScript 입문"이 "loaned" 상태이다
          When 사용자가 해당 도서를 대출 신청한다
          Then "이미 대출중인 도서입니다" 에러가 발생한다

    ## 구현계획

    ### Tech Design Doc

    #### 배경
    도서 대출/반납 관리 시스템의 대출 기능을 구현한다.

    #### 목표
    도서 상태 기반 대출 처리 및 대출 기록 생성.

    #### 설계
    LoanService에 loanBook 메서드를 추가. Book 상태를 확인 후 Loan 기록 생성.

    ### Vertical Slices

    - [ ] Slice 1: 도서 대출 처리 — Scenario "대출 가능한 도서를 대출한다"
    - [ ] Slice 2: 대출 불가 처리 — Scenario "이미 대출중인 도서를 대출 시도한다"
    ```
  - `src/models/book.ts`:
    ```typescript
    export interface Book {
      id: string;
      title: string;
      author: string;
      status: "available" | "loaned";
    }
    ```
  - `src/models/loan.ts`:
    ```typescript
    export interface Loan {
      id: string;
      bookId: string;
      userId: string;
      loanDate: Date;
      returnDate: Date;
    }
    ```
  - `src/services/loan-service.ts`:
    ```typescript
    export class LoanService {}
    ```
  - `package.json`: `{ "name": "test-project", "type": "module" }`
  - `tsconfig.json`: `{ "compilerOptions": { "target": "ES2022", "module": "Node16", "moduleResolution": "Node16", "strict": true, "outDir": "dist", "rootDir": "src", "verbatimModuleSyntax": true } }`
- 체크리스트:
  - [ ] 구현된 LoanService에 대출 기간 14일(설계 결정 D1)이 반영되어 있다
  - [ ] Acceptance Test 파일(.acc.spec.ts)이 workspace에 존재한다
  - [ ] Acceptance Test가 LoanService를 import하여 메서드를 호출·단언하는 형태이다
  - [ ] Unit Test 파일(.spec.ts)이 Acceptance Test와 별도 파일로 존재한다
  - [ ] Unit Test에 Acceptance Test에 없는 추가 케이스(경계값, 에러 등)가 최소 1개 포함되어 있다
  - [ ] 테스트 파일명에 Slice/Scenario 번호(예: 1.1-, 2-)가 포함되지 않았다
  - [ ] LoanService에 대출 가능/불가 분기 로직이 구현되어 있다
  - [ ] Feature 문서(.tasks/test-project/1.1-book-loan.md)의 Slice 체크박스가 `[x]`로 갱신되어 있다
  - [ ] wbs.md의 Feature 1.1 체크박스가 `[x]`로 갱신되어 있다

### 시나리오 2: Feature 문서 경로 누락

- 입력: "/sd-tdd"
- 사전 조건: 없음
- 체크리스트:
  - [ ] 텍스트 출력에 Feature 문서 경로가 필요하다는 내용이 포함되어 있다
  - [ ] 텍스트 출력에 `/sd-plan` 안내가 포함되어 있다
  - [ ] workspace에 소스 코드 파일(.ts)이나 테스트 파일(.spec.ts)이 생성되지 않았다

### 시나리오 3: 혼합 검증 항목 분류

- 입력: "/sd-tdd .tasks/test-project/1.1-usb-sync.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md`:
    ```markdown
    # WBS: test-project

    ## Feature Breakdown
    - [ ] 1.1 USB 파일 동기화
    ```
  - `.tasks/test-project/1.1-usb-sync.md`:
    ```markdown
    # Feature 1.1: USB 파일 동기화

    ## 참조 자료
    - src/sync/file-comparator.ts — 날짜 비교 함수
    - src/sync/sync-logger.ts — 동기화 로그
    - src/sync/usb-connector.ts — USB 연결

    ## 설계 결정

    | ID | 결정 | 근거 |
    |----|------|------|
    | D1 | 동기화 충돌 시 최신 파일을 우선한다 | 사용자 요구 |

    ## 요구명세

    Feature: USB 파일 동기화

      Rule: 파일 동기화 처리
        # 근거: USB 연결 상태에서 날짜 기반으로 최신 파일을 선택

        Scenario: USB 연결 후 최신 파일로 동기화한다
          Given USB 장치가 물리적으로 연결되어 있다
          And 로컬 파일 "report.xlsx"의 수정일이 2024-01-15이다
          And USB 파일 "report.xlsx"의 수정일이 2024-01-20이다
          When 동기화를 실행한다
          Then "report.xlsx"은 USB 버전(2024-01-20)으로 교체된다
          And 동기화 로그에 "report.xlsx: USB → 로컬" 기록이 남는다

    ## 구현계획

    ### Tech Design Doc

    #### 배경
    USB 장치 연결 시 파일을 자동 동기화한다.

    #### 설계
    FileComparator로 날짜 비교, SyncLogger로 로그 기록, UsbConnector로 장치 연결.

    ### Vertical Slices

    - [ ] Slice 1: USB 파일 동기화 — Scenario "USB 연결 후 최신 파일로 동기화한다"
    ```
  - `src/sync/file-comparator.ts`:
    ```typescript
    export function compareByDate(localDate: Date, remoteDate: Date): "local" | "remote" {
      return localDate >= remoteDate ? "local" : "remote";
    }
    ```
  - `src/sync/sync-logger.ts`:
    ```typescript
    export class SyncLogger {
      private entries: string[] = [];
      log(entry: string): void { this.entries.push(entry); }
      getEntries(): string[] { return [...this.entries]; }
    }
    ```
  - `src/sync/usb-connector.ts`:
    ```typescript
    export class UsbConnector {
      async connect(): Promise<void> { /* USB 장치 연결 */ }
      async listFiles(): Promise<string[]> { /* USB 파일 목록 */ return []; }
    }
    ```
  - `package.json`: `{ "name": "test-project", "type": "module" }`
  - `tsconfig.json`: `{ "compilerOptions": { "target": "ES2022", "module": "Node16", "moduleResolution": "Node16", "strict": true, "outDir": "dist", "rootDir": "src", "verbatimModuleSyntax": true } }`
- 체크리스트:
  - [ ] 순수 로직(날짜 비교, 동기화 방향 결정)에 대한 자동 테스트 파일(.spec.ts)이 workspace에 존재한다
  - [ ] USB 물리 연결/파일 교체에 대한 수동 검증 문서(.spec.md) 또는 LLM 검증 문서(.verify.md)가 workspace에 존재한다
  - [ ] 텍스트 출력에 검증 항목별 분류(자동 테스트/LLM 검증/수동 검증)가 명시되어 있다

## 안티패턴 Eval

- [ ] Feature 문서(요구명세·구현계획·설계 결정)의 내용이 선택지 제시 텍스트 없이 변경되어 있다
- [ ] 순수 로직이 포함된 Scenario에서 .spec.ts 없이 .spec.md만 존재한다 (Scenario 전체를 수동 테스트로 처리)
- [ ] 테스트 코드가 readFileSync로 소스 파일을 읽어 toContain/toMatch로만 검증한다
- [ ] 테스트 파일명에 Slice/Scenario 번호(예: 1.1-, 2-)가 포함되어 있다
