# Feature 1 dev 모드 네이티브 앱 실행 수정 + device 명령어 추가

## 참조 자료

### 원인
- v14 마이그레이션 시 `DevWatchOrchestrator.ts:403-443`에서 dev 모드에 Capacitor `run()` + Electron `initialize()`/`run()` 호출이 잘못 포함됨
- v13에서는 dev 시 Capacitor `initialize()`만 호출, Electron은 아예 처리 안 함
- 디바이스/Electron 실행은 v13의 별도 `device` 명령어(`commands/device.ts`)에서만 수행
- 마이그레이션 문서에서도 Capacitor device 실행은 Feature 6.5(별도 명령어)로 분리 예정이었음

### v13 동작 정리

| 명령어 | Capacitor | Electron |
|--------|-----------|----------|
| dev | `initialize()`만 | 없음 |
| device | `create()` → `runOnDevice(url)` | `create()` → `run(url)` (run 내부에서 initialize 자동 호출) |
| build | `initialize()` + `build()` | `initialize()` + `build()` |

### v14 현재 상태 (잘못됨)

| 명령어 | Capacitor | Electron |
|--------|-----------|----------|
| dev | `create()` → `initialize()` → `run()` | `create()` → `initialize()` → `run()` |
| device | 없음 | 없음 |

### 관련 파일
- 수정 대상: `packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts` (라인 403-443)
- 생성 대상: `packages/sd-cli/src/commands/device.ts`
- 수정 대상: `packages/sd-cli/src/sd-cli-entry.ts` (명령어 등록)
- v13 원본: `D:\workspaces-13\simplysm\packages\sd-cli\src\orchestrators\DevOrchestrator.ts`
- v13 device 명령어: `D:\workspaces-13\simplysm\packages\sd-cli\src\commands\device.ts`

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | dev 모드에서 cap.run() 제거 | 제거 | v13 동작 복원 |
| D2 | dev 모드에서 cap.initialize() 유지 | 유지 | v13에서도 dev 시 initialize 수행 |
| D3 | dev 모드에서 Electron 블록 전체 제거 | 제거 | v13에서 dev 시 Electron 처리 없었음 |
| D4 | v14에 device 명령어 추가 | 추가 | v13의 device 명령어 복원 |

## 요구명세

Feature: 1 dev 모드 네이티브 앱 실행 수정 + device 명령어 추가

  Background:
    Given sd-cli가 설치되어 있다

  Rule: dev 모드에서 cap run을 실행하지 않는다

    Scenario: capacitor 설정이 있는 클라이언트 패키지의 dev 실행
      Given sd.config.ts에 capacitor 설정이 있는 클라이언트 패키지가 있다
      When sd-cli dev를 실행한다
      Then Capacitor initialize()는 수행된다
      And cap run은 실행되지 않는다

  Rule: dev 모드에서 Electron을 처리하지 않는다

    Scenario: electron 설정이 있는 클라이언트 패키지의 dev 실행
      Given sd.config.ts에 electron 설정이 있는 클라이언트 패키지가 있다
      When sd-cli dev를 실행한다
      Then Electron 관련 동작이 수행되지 않는다

  Rule: device 명령어로 네이티브 앱을 실행한다

    Scenario: device 명령어로 Capacitor 앱 실행
      Given sd.config.ts에 capacitor 설정이 있는 클라이언트 패키지가 있다
      And dev 서버가 실행 중이다
      When sd-cli device --package {패키지명}을 실행한다
      Then Capacitor run()이 실행되어 기기에서 앱이 실행된다

    Scenario: device 명령어로 Electron 앱 실행
      Given sd.config.ts에 electron 설정이 있는 클라이언트 패키지가 있다
      And dev 서버가 실행 중이다
      When sd-cli device --package {패키지명}을 실행한다
      Then Electron run()이 실행되어 데스크톱 앱이 실행된다

    Scenario: device 명령어에 URL 옵션 지정
      Given sd.config.ts에 capacitor 설정이 있는 클라이언트 패키지가 있다
      When sd-cli device --package {패키지명} --url http://localhost:4200을 실행한다
      Then 지정된 URL로 Capacitor run()이 실행된다

## 구현계획

### 배경

v14 `DevWatchOrchestrator._startDevMode()`의 네이티브 앱 시작 블록(라인 403-443)에서 Capacitor `initialize()` + `run()`, Electron `initialize()` + `run()`을 모두 호출한다. v13에서는 dev 시 Capacitor `initialize()`만 호출하고, Electron은 처리하지 않았으며, 디바이스/Electron 실행은 별도 `device` 명령어에서 수행했다.

### 목표

- dev 모드에서 `cap.run()` 제거, Electron 블록 전체 제거하여 v13 동작 복원
- v14에 `device` 명령어 추가하여 디바이스/Electron 실행 기능 복원

### 비목표

- 없음

### 설계

#### Slice 1: dev 모드 수정

`DevWatchOrchestrator.ts`에서:
- Capacitor 블록: `await cap.run(devServerUrl)` 제거, `initialize()`만 유지
- Electron 블록(라인 423-442): 전체 제거

#### Slice 2: device 명령어 추가

v13 `commands/device.ts`를 기반으로 v14에 맞게 구현:
- `sd-cli-entry.ts`에 `device` 명령어 등록 (`--package` 필수, `--url` 선택, `--opt` 옵션)
- `commands/device.ts`에 `runDevice()` 함수 구현
- 로직: config 로드 → 패키지 검증 → URL 결정 → Electron/Capacitor 분기 실행

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| dev에서 제거 + device 명령어 추가 | 채택 | v13 동작과 일치 |
| dev에 --device 플래그 추가 | 미채택 | v13 구조와 다르고, 관심사 분리 위반 |

### Vertical Slices

- [x] Slice 1: dev 모드에서 Capacitor run() 제거 + Electron 블록 제거
  - **구현 내용:** `DevWatchOrchestrator._startDevMode()`에서 `cap.run()` 라인 제거, Electron 블록 전체 제거
  - **호출 그래프:**
    ```mermaid
    flowchart TD
      A[_startDevMode] --> B[Capacitor.create]
      B --> C[cap.initialize]
    ```
  - **Scenarios:**
    - Scenario: capacitor 설정이 있는 클라이언트 패키지의 dev 실행
    - Scenario: electron 설정이 있는 클라이언트 패키지의 dev 실행

- [x] Slice 2: device 명령어 추가
  - **구현 내용:** `commands/device.ts` 생성, `sd-cli-entry.ts`에 명령어 등록
  - **의존:** Slice 1
  - **호출 그래프:**
    ```mermaid
    flowchart TD
      A[sd-cli-entry.ts] --> B[runDevice]
      B --> C[loadSdConfig]
      B --> D{electron config?}
      D -->|Yes| E[Electron.create]
      E --> F[electron.run]
      D -->|No| G{capacitor config?}
      G -->|Yes| H[Capacitor.create]
      H --> I[cap.run]
    ```
  - **Scenarios:**
    - Scenario: device 명령어로 Capacitor 앱 실행
    - Scenario: device 명령어로 Electron 앱 실행
    - Scenario: device 명령어에 URL 옵션 지정
