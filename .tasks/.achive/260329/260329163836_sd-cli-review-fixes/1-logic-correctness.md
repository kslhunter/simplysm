# Feature 1 로직 정확성

## 참조 자료

- [wbs.md](wbs.md)
- [review.md](../260329162645_review-sd-cli-tasks/review.md)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | LOGIC-001 ts.Program 케이스 처리 방식 | tsc-build.ts와 동일 패턴 (전체 sourceFiles를 affected로 추가) | 이미 검증된 패턴이며 angular-compiler.ts에만 누락 |
| D2 | LOGIC-002 js.success 처리 방식 | dts.success와 동기화 | 단일 패스이므로 js/dts 분리가 무의미하며, 독립 참조 시 오판 방지 |
| D3 | LOGIC-003 dev 모드 초기 결과 보고 | buildStart 완료 시 dev/prod 모두 onBuild 호출 | client.worker.ts 이벤트 핸들러가 이미 build 이벤트 처리 가능 |

## 요구명세

```gherkin
Feature: 1 로직 정확성

  Background:
    Given sd-cli의 빌드/타입체크 파이프라인이 동작한다

  Rule: _findAffectedFiles는 ts.Program 반환 케이스를 처리한다

    Scenario: global scope 변경으로 ts.Program이 반환되면 전체 파일을 affected로 처리
      Given AngularCompiler가 incremental 모드로 초기화되었다
      And builderProgram.getSemanticDiagnosticsOfNextAffectedFile()이 ts.Program을 반환한다
      When _findAffectedFiles가 실행된다
      Then builderProgram.getSourceFiles()의 모든 소스 파일이 affectedFiles에 추가된다
      And collectDiagnostics에서 모든 파일의 Angular 진단이 갱신된다

    Scenario: 파일 수준 변경이면 기존 동작 유지
      Given builderProgram.getSemanticDiagnosticsOfNextAffectedFile()이 ts.SourceFile을 반환한다
      When _findAffectedFiles가 실행된다
      Then 해당 SourceFile만 affectedFiles에 추가된다

  Rule: runNgtscBuild의 js.success는 실제 빌드 상태를 반영한다

    Scenario: 컴파일 에러가 없으면 js.success가 true
      Given Angular 라이브러리 빌드가 에러 없이 완료된다
      When runNgtscBuild가 결과를 반환한다
      Then js.success가 true이다
      And dts.success가 true이다

    Scenario: 컴파일 에러가 있으면 js.success가 false
      Given Angular 라이브러리 빌드에 타입 에러가 존재한다
      When runNgtscBuild가 결과를 반환한다
      Then js.success가 false이다
      And dts.success가 false이다

  Rule: Vite dev 모드에서도 초기 빌드 결과가 보고된다

    Scenario: dev 모드 초기 빌드 완료 시 onBuild 콜백 호출
      Given sdAngularPlugin이 dev 모드로 설정되었다
      And onBuild 콜백이 등록되었다
      When buildStart 훅이 완료된다
      Then onBuild 콜백이 진단 결과와 린트 결과를 포함하여 호출된다

    Scenario: prod 모드 초기 빌드도 기존과 동일하게 동작
      Given sdAngularPlugin이 prod 모드로 설정되었다
      When buildStart 훅이 완료된다
      Then onBuild 콜백이 호출된다
```

## 구현계획

### 배경

sd-cli의 빌드 파이프라인은 `AngularCompiler`(angular-compiler.ts), `runNgtscBuild`(ngtsc-build-core.ts), `sdAngularPlugin`(vite-angular-plugin.ts) 세 모듈로 구성된다. 코드 리뷰에서 발견된 3건의 로직 이슈를 수정한다.

### 목표

- `_findAffectedFiles`에서 global change(ts.Program 반환) 시 전체 파일을 affected로 처리
- `runNgtscBuild`의 js.success를 실제 빌드 상태와 동기화
- Vite dev 모드 초기 빌드 시 onBuild 콜백 호출

### 비목표

- AngularCompiler의 API 변경 (인터페이스 유지)
- 테스트 추가 (내부 빌드 파이프라인은 통합 테스트 대상이며 단위 테스트 불가)

### 설계

#### LOGIC-001: `_findAffectedFiles` ts.Program 처리

`getSemanticDiagnosticsOfNextAffectedFile()`의 `result.affected`가 `ts.SourceFile`인지 `ts.Program`인지 `"fileName" in result.affected`로 분기. `ts.Program`이면 `builderProgram.getSourceFiles()`에서 `ignoreForDiagnostics` 대상을 제외한 모든 파일을 affectedFiles에 추가.

#### LOGIC-002: `runNgtscBuild` js.success 동기화

`js.success`를 `dts.success`와 동일 조건(`errorCount === 0 && scssErrors.length === 0 && globalScssErrors.length === 0`)으로 설정.

#### LOGIC-003: `buildStart` dev 모드 결과 보고

`if (!options.dev)` 가드를 제거하여 dev/prod 모두 onBuild 호출.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| LOGIC-001: affectedFiles를 undefined로 설정 (tsc-build 방식) | 미채택 | collectDiagnostics/emitAffectedFiles가 Set 타입을 기대하므로 undefined 분기를 모두 추가해야 함. 전체 파일을 Set에 추가하는 것이 변경 범위가 작음 |
| LOGIC-002: js/dts 구조 자체를 단일 result로 통합 | 미채택 | NgtscBuildResult 타입을 사용하는 모든 소비자 코드를 변경해야 함. 변경 범위 과다 |

### Vertical Slices

- [x] Slice 1: _findAffectedFiles ts.Program 처리
- [x] Slice 2: runNgtscBuild js.success 동기화
- [x] Slice 3: Vite dev 모드 초기 빌드 결과 보고

#### Slice 1: _findAffectedFiles ts.Program 처리

- **구현 내용:** `angular-compiler.ts` `_findAffectedFiles` 메서드에서 `result.affected`가 `ts.Program`인 경우를 분기 처리. builderProgram.getSourceFiles()의 non-ignored 파일을 전부 affectedFiles에 추가
- **파일:** `packages/sd-cli/src/utils/angular-compiler.ts`
- **Scenarios:**
  - Scenario: global scope 변경으로 ts.Program이 반환되면 전체 파일을 affected로 처리
  - Scenario: 파일 수준 변경이면 기존 동작 유지

#### Slice 2: runNgtscBuild js.success 동기화

- **구현 내용:** `ngtsc-build-core.ts` `runNgtscBuild`의 반환값에서 `js.success`를 `dts.success`와 동일 조건으로 설정
- **파일:** `packages/sd-cli/src/utils/ngtsc-build-core.ts`
- **Scenarios:**
  - Scenario: 컴파일 에러가 없으면 js.success가 true
  - Scenario: 컴파일 에러가 있으면 js.success가 false

#### Slice 3: Vite dev 모드 초기 빌드 결과 보고

- **구현 내용:** `vite-angular-plugin.ts` `buildStart` 훅에서 `if (!options.dev)` 가드를 제거하여 dev/prod 모두 onBuild 호출
- **파일:** `packages/sd-cli/src/angular/vite-angular-plugin.ts`
- **Scenarios:**
  - Scenario: dev 모드 초기 빌드 완료 시 onBuild 콜백 호출
  - Scenario: prod 모드 초기 빌드도 기존과 동일하게 동작
