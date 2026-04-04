# Feature sd-cli 리뷰 이슈 수정

## 참조 자료

- [review.md](../260401234734_review-cli/review.md)

### 대상 파일

| 이슈 | 파일 |
|------|------|
| LOGIC-001 | `packages/sd-cli/src/engines/ViteEngine.ts` |
| DESIGN-001 | `packages/sd-cli/src/engines/BaseEngine.ts` |
| CONSIST-001 | `packages/sd-cli/src/commands/typecheck.ts`, `packages/sd-cli/src/commands/lint.ts` |
| DESIGN-002 | `packages/sd-cli/src/workers/server-runtime.worker.ts` |
| DESIGN-003 | `packages/sd-cli/src/angular/vite-angular-plugin.ts` |

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | LOGIC-001: 초기 빌드 결과 중복 보고 수정 방향 | line 177-184 제거, "build" 이벤트 핸들러에서만 보고 | 단일 경로로 통일하여 덮어쓰기 원천 차단, BaseEngine과 동일 패턴 |
| D2 | CONSIST-001: typecheck/lint config 에러 처리 통일 | 둘 다 fail fast | 명확한 실패로 문제 조기 발견 |

## 요구명세

```gherkin
Feature: sd-cli 리뷰 이슈 수정

  Rule: ViteEngine 초기 빌드 결과는 단일 경로로 보고한다

    Scenario: Angular 컴파일 에러 발생 시 ResultCollector에 에러 상태 유지
      Given ViteEngine.startWatch()가 실행 중이다
      When Angular 초기 컴파일에 에러가 발생한다
      Then ResultCollector에 에러 상태가 기록된다
      And startWatch 반환 후에도 에러 상태가 유지된다

    Scenario: Angular 컴파일 성공 시 ResultCollector에 성공 상태
      Given ViteEngine.startWatch()가 실행 중이다
      When Angular 초기 컴파일이 성공한다
      Then ResultCollector에 성공 상태가 기록된다

  Rule: BaseEngine watch 모드에서 에러 시 resolver가 해제된다

    Scenario: Worker가 buildStart 후 에러 발생
      Given BaseEngine.startWatch()가 watch 모드로 실행 중이다
      And Worker가 "buildStart" 이벤트를 발행했다
      When Worker가 "error" 이벤트를 발행한다
      Then 등록된 resolver가 호출되어 RebuildManager 배치가 완료된다

    Scenario: 정상 빌드 흐름은 영향 없음
      Given BaseEngine.startWatch()가 watch 모드로 실행 중이다
      When Worker가 "buildStart" → "build" 순서로 이벤트를 발행한다
      Then resolver가 "build" 핸들러에서 정상 호출된다

  Rule: typecheck과 lint 모두 config 부재 시 fail fast한다

    Scenario: sd.config.ts 없이 typecheck 실행
      Given sd.config.ts가 존재하지 않는다
      When typecheck 커맨드를 실행한다
      Then 에러를 throw한다

    Scenario: sd.config.ts 없이 lint 실행
      Given sd.config.ts가 존재하지 않는다
      When lint 커맨드를 실행한다
      Then 에러를 throw한다 (기존 동작 유지)

  Rule: server-runtime 예외 핸들러는 충분한 대기 시간을 가진다

    Scenario: uncaughtException 발생 시 에러 메시지 전달
      Given server-runtime Worker가 실행 중이다
      When uncaughtException이 발생한다
      Then 에러 메시지가 부모 프로세스에 전달된 후 프로세스가 종료된다

  Rule: vite-angular-plugin close 핸들러는 성공/실패 무관하게 참조를 정리한다

    Scenario: disposal 성공 시 참조 정리
      Given Vite dev server가 실행 중이다
      When server close 이벤트가 발생하고 disposal이 성공한다
      Then jsTransformer, compiler, emittedFiles 참조가 정리된다

    Scenario: disposal 실패 시에도 참조 정리
      Given Vite dev server가 실행 중이다
      When server close 이벤트가 발생하고 disposal이 실패한다
      Then 에러가 로깅되고 jsTransformer, compiler, emittedFiles 참조가 정리된다
```

## 구현계획

### 배경

sd-cli 패키지의 코드 리뷰에서 발견된 5건의 이슈를 수정한다. 모든 이슈는 기존 코드의 로직 버그, 설계 결함, 일관성 문제이며, 새로운 기능 추가가 아닌 기존 코드의 개선이다.

### 목표

- ViteEngine 초기 빌드 결과 덮어쓰기 버그 수정
- BaseEngine watch 모드 resolver 미해제 수정
- typecheck 커맨드의 config 에러 처리를 fail fast로 변경
- server-runtime 예외 핸들러 대기 시간 증가
- vite-angular-plugin close 핸들러의 참조 정리 일관성 확보

### 비목표

- 새로운 기능 추가
- 테스트 구조 변경
- 리팩토링

### 설계

각 이슈별로 최소 범위의 코드 수정을 적용한다.

| 이슈 | 수정 내용 |
|------|----------|
| LOGIC-001 | ViteEngine.startWatch()에서 line 177-184 (초기 빌드 결과 보고) 제거 |
| DESIGN-001 | BaseEngine "error" 핸들러에서 resolver 호출 추가 |
| CONSIST-001 | typecheck.ts의 loadSdConfig try-catch 제거 (에러 전파) |
| DESIGN-002 | server-runtime.worker.ts의 setTimeout 100ms → 500ms |
| DESIGN-003 | vite-angular-plugin.ts의 .then() 참조 정리를 .finally()로 이동 |

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| LOGIC-001: startWatch 반환값에 컴파일 결과 포함 | 미채택 | Worker 인터페이스 변경 필요, 영향 범위 확대 |
| DESIGN-001: registerBuild에 타임아웃 추가 | 미채택 | 적절한 타임아웃 값 결정 어려움, error 핸들러에서 resolver 호출이 더 직접적 |
| CONSIST-001: 둘 다 graceful fallback | 미채택 | 사용자 선택에 따라 fail fast로 통일 |

### Vertical Slices

#### Slice 1: ViteEngine 초기 빌드 결과 중복 보고 수정 + BaseEngine resolver 미해제 수정
- [x] 완료
- **구현 내용:** ViteEngine.startWatch()에서 초기 빌드 결과 보고 코드 제거, BaseEngine "error" 핸들러에 resolver 호출 추가
- **호출 그래프:**
  ```mermaid
  flowchart TD
    SW[ViteEngine.startWatch] --> EH["on('build') 핸들러"]
    EH --> RC[ResultCollector.add]
    SW -.->|제거| IR[초기 결과 보고 line 177-184]

    BSW[BaseEngine.startWatch] --> BEH["on('error') 핸들러"]
    BEH --> RES["resolver?.()"]
    BEH --> RC2[ResultCollector.add]
  ```
- **Scenarios:**
  - Scenario: Angular 컴파일 에러 발생 시 ResultCollector에 에러 상태 유지
  - Scenario: Angular 컴파일 성공 시 ResultCollector에 성공 상태
  - Scenario: Worker가 buildStart 후 에러 발생
  - Scenario: 정상 빌드 흐름은 영향 없음

#### Slice 2: typecheck fail fast + server-runtime 대기 시간 + angular-plugin close 핸들러
- [x] 완료
- **구현 내용:** typecheck.ts의 try-catch 제거, server-runtime.worker.ts 타임아웃 증가, vite-angular-plugin.ts close 핸들러 .finally() 적용
- **의존:** 없음 (Slice 1과 독립)
- **호출 그래프:**
  ```mermaid
  flowchart TD
    TC[executeTypecheck] --> LSC[loadSdConfig]
    LSC -->|실패 시 throw 전파| ERR[에러]

    UE[uncaughtException 핸들러] --> SS[sender.send]
    SS --> TO["setTimeout 500ms"]
    TO --> EXIT[process.exit]

    CS[server.httpServer close] --> PA[Promise.all disposal]
    PA --> FIN[".finally() 참조 정리"]
    PA --> CATCH[".catch() 에러 로깅"]
  ```
- **Scenarios:**
  - Scenario: sd.config.ts 없이 typecheck 실행
  - Scenario: uncaughtException 발생 시 에러 메시지 전달
  - Scenario: disposal 성공 시 참조 정리
  - Scenario: disposal 실패 시에도 참조 정리
