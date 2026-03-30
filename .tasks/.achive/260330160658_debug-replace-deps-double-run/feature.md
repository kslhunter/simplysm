# Feature 1.1 replace-deps 중복 실행 방지

## 참조 자료

- [debug.md](debug.md)
- 수정 대상: `packages/sd-cli/src/sd-cli.ts` Phase 1 (라인 29-39)
- 근본 원인: Phase 1이 커맨드 종류와 무관하게 `setupReplaceDeps`를 실행하여, `replace-deps` 커맨드가 Phase 2에서 다시 실행됨

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 중복 방지 방법 | Phase 1에서 커맨드명 체크 | debug.md 방안 A. 최소 변경으로 근본 원인 제거 |

## 요구명세

```gherkin
Feature: 1.1 replace-deps 중복 실행 방지

  Background:
    Given sd.config.ts에 replaceDeps 설정이 있다

  Rule: replace-deps 커맨드 실행 시 Phase 1에서 setupReplaceDeps를 skip한다

    Scenario: replace-deps 커맨드 실행 시 1회만 실행
      When sd-cli replace-deps를 실행한다
      Then Phase 1에서 setupReplaceDeps가 실행되지 않는다
      And Phase 2(sd-cli-entry)에서 setupReplaceDeps가 1회 실행된다

    Scenario: dev 커맨드 실행 시 Phase 1에서 정상 실행
      When sd-cli dev를 실행한다
      Then Phase 1에서 setupReplaceDeps가 실행된다

    Scenario: build 커맨드 실행 시 Phase 1에서 정상 실행
      When sd-cli build를 실행한다
      Then Phase 1에서 setupReplaceDeps가 실행된다

    Scenario: replaceDeps 설정이 없을 때
      Given sd.config.ts에 replaceDeps 설정이 없다
      When sd-cli replace-deps를 실행한다
      Then Phase 2에서 "설정이 없습니다" 경고가 출력된다
```

## 구현계획

### 배경

`sd-cli.ts`는 프로덕션 모드에서 2단계로 실행된다:
- Phase 1: `setupReplaceDeps`를 inline 실행 (모듈 캐시 리셋 전 소스 교체)
- Phase 2: `sd-cli-entry.js`를 새 프로세스로 spawn하여 실제 CLI 커맨드 실행

Phase 1은 `dev`, `build` 등의 커맨드에서 새 프로세스가 최신 소스를 참조하도록 하기 위한 것이다. 그러나 커맨드 종류를 체크하지 않아, `replace-deps` 커맨드 자체를 실행할 때 Phase 2에서 동일 작업이 중복 실행된다.

### 목표

- `replace-deps` 커맨드 실행 시 `setupReplaceDeps`가 1회만 실행되도록 한다

### 비목표

- 다른 커맨드(`dev`, `build` 등)의 Phase 1 동작 변경

### 설계

`sd-cli.ts` Phase 1에서 `process.argv[2]`를 확인하여, `replace-deps` 커맨드일 때 `setupReplaceDeps` 호출을 skip한다.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| Phase 1에서 커맨드명 체크 후 skip | 채택 | 최소 변경, Phase 2가 정상 담당 |
| Phase 1에서 처리하고 Phase 2 spawn 생략 | 미채택 | CLI 옵션 파싱 우회, 로직 분산 |

### Vertical Slices

- [x] Slice 1: Phase 1에서 replace-deps 커맨드 skip
  - **구현 내용:** `sd-cli.ts` Phase 1의 조건문에 `process.argv[2] !== "replace-deps"` 체크 추가
  - **Scenarios:**
    - Scenario: replace-deps 커맨드 실행 시 1회만 실행
    - Scenario: dev 커맨드 실행 시 Phase 1에서 정상 실행
    - Scenario: build 커맨드 실행 시 Phase 1에서 정상 실행
    - Scenario: replaceDeps 설정이 없을 때
