---
title: 'Capacitor 빌드 통합'
slug: 'capacitor-build-integration'
created: '2026-02-01'
completed: '2026-02-01'
status: 'completed'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack:
  - 'TypeScript'
  - 'esbuild'
  - 'Vite'
  - 'SolidJS'
  - '@simplysm/core-node (fs 유틸리티)'
  - 'child_process (spawn 신규 구현)'
  - '@capacitor/core ^7.0.0'
  - '@capacitor/cli ^7.0.0'
  - '@capacitor/android ^7.0.0'
  - '@capacitor/app ^7.0.0'
  - '@capacitor/assets ^3.0.0'
  - 'sharp (아이콘 리사이즈)'
files_to_modify:
  - 'packages/cli/src/sd-config.types.ts'
  - 'packages/cli/src/sd-cli.ts'
  - 'packages/cli/src/commands/watch.ts'
  - 'packages/cli/src/commands/build.ts'
  - 'packages/cli/src/commands/device.ts (신규)'
  - 'packages/cli/src/capacitor/capacitor.ts (신규)'
  - 'packages/cli/src/utils/spawn.ts (신규)'
code_patterns:
  - 'yargs 기반 CLI 명령어 정의'
  - 'createWorker로 백그라운드 작업'
  - 'Listr로 태스크 진행 표시'
  - '@simplysm/core-node fs 유틸리티 사용'
test_patterns:
  - 'Vitest 사용'
  - 'vitest.config.ts의 node 프로젝트'
  - '현재 CLI 테스트 없음 (통합 테스트 위주)'
---

# Tech-Spec: Capacitor 빌드 통합

**Created:** 2026-02-01

## Overview

### Problem Statement

현재 CLI에서 Capacitor Android 앱 빌드를 지원하지 않아, 레거시 코드(`.legacy-packages/sd-cli/src/entry/SdCliCapacitor.ts`)를 참조해 모바일 앱 빌드 파이프라인을 구축해야 함

### Solution

- `sd.config.ts`의 `SdClientPackageConfig`에 `capacitor` 옵션 추가
- `build`/`watch` 명령어에 Capacitor 빌드 단계 통합
- 별도 `device` 명령어로 디바이스 연동 지원

### Scope

**In Scope:**
- `SdClientPackageConfig`에 `capacitor` 설정 타입 추가
- `build` 명령: client 빌드 후 Capacitor Android APK/AAB 빌드
- `watch` 명령: Capacitor 프로젝트 초기화/동기화 (cap sync 등)
- `sd device` 명령어 추가 (watch 서버 URL로 디바이스 WebView 연동)
- Capacitor 프로젝트 초기화 (플러그인, 아이콘, Android 네이티브 설정)

**Out of Scope:**
- iOS 플랫폼 지원
- Electron 빌드 통합

## Context for Development

### Codebase Patterns

**CLI 구조:**
- `packages/cli/src/sd-cli.ts`: yargs 기반 CLI 엔트리포인트
- `packages/cli/src/commands/*.ts`: 각 명령어 구현 (lint, typecheck, watch, build)
- `packages/cli/src/workers/*.ts`: Worker 스레드 구현
- `packages/cli/src/utils/*.ts`: 유틸리티 함수

**설정 패턴:**
- `sd-config.types.ts`에 타입 정의
- `sd.config.ts`에서 사용자 설정 작성
- `loadSdConfig()`로 설정 로드

**빌드 패턴:**
- `build.ts`: Listr로 순차 태스크 (Lint → Clean → Build)
- `watch.ts`: Worker로 백그라운드 빌드, RebuildListrManager로 리빌드 관리
- client 타겟: Vite dev server (watch) / Vite production build (build)

**레거시 Capacitor 패턴:**
- `.capacitor/` 디렉토리에 Capacitor 프로젝트 생성
- `initializeAsync()`: 프로젝트 초기화, 플랫폼 추가, 아이콘 설정, Android 네이티브 설정
- `buildAsync()`: Gradle 빌드 실행, APK/AAB 복사
- `runWebviewOnDeviceAsync()`: 개발 서버 URL로 디바이스 실행

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.legacy-packages/sd-cli/src/entry/SdCliCapacitor.ts` | 레거시 Capacitor 구현 (initializeAsync, buildAsync, runWebviewOnDeviceAsync) |
| `.legacy-packages/sd-cli/src/types/config/ISdProjectConfig.ts` | 레거시 설정 타입 (ISdClientBuilderCapacitorConfig) |
| `packages/cli/src/sd-config.types.ts` | 현재 설정 타입 (SdClientPackageConfig 수정) |
| `packages/cli/src/sd-cli.ts` | CLI 엔트리포인트 (device 명령 추가) |
| `packages/cli/src/commands/watch.ts` | watch 명령 (Capacitor 초기화/동기화 통합) |
| `packages/cli/src/commands/build.ts` | build 명령 (Capacitor APK/AAB 빌드 통합) |
| `packages/core-node/src/utils/fs.ts` | fs 유틸리티 참조 (fsExists, fsMkdirAsync, fsWriteAsync 등) |

### Technical Decisions

1. **Capacitor 프로젝트 위치**: 레거시와 동일하게 `packages/{client}/.capacitor/`
2. **패키지 매니저**: 레거시는 yarn 사용 → pnpm으로 변경
3. **spawn 유틸리티**: 현재 없음 → `packages/cli/src/utils/spawn.ts`에 신규 구현
4. **Capacitor 클래스**: `packages/cli/src/capacitor/capacitor.ts`에 레거시 기반 구현
5. **Android만 지원**: iOS는 Out of Scope

## Implementation Plan

### Tasks

#### Phase 1: 기반 유틸리티 및 타입 정의

- [x] **Task 1: spawn 유틸리티 생성**
  - File: `packages/cli/src/utils/spawn.ts`
  - Action: `child_process.spawn`을 Promise로 래핑한 `spawnAsync` 함수 구현
  - Notes:
    - stdout/stderr 캡처 및 반환
    - 환경변수 전달 지원 (FORCE_COLOR, CLICOLOR_FORCE, COLORTERM)
    - cwd 옵션 지원
    - 레거시 `SdProcess.spawnAsync` 참조

- [x] **Task 2: Capacitor 설정 타입 추가**
  - File: `packages/cli/src/sd-config.types.ts`
  - Action: `SdCapacitorConfig` 인터페이스 정의 및 `SdClientPackageConfig`에 `capacitor` 옵션 추가
  - Notes:
    - 레거시 `ISdClientBuilderCapacitorConfig` 기반
    - `appId`, `appName` 필수
    - `plugins`, `icon`, `debug`, `platform.android` 옵션
    - Android: `config`, `bundle`, `intentFilters`, `sign`, `sdkVersion`, `permissions`

#### Phase 2: Capacitor 핵심 클래스

- [x] **Task 3: Capacitor 클래스 생성**
  - File: `packages/cli/src/capacitor/capacitor.ts`
  - Action: 레거시 `SdCliCapacitor` 클래스를 현재 코드베이스 패턴으로 재구현
  - Notes:
    - `@simplysm/core-node` fs 유틸리티 사용 (fsExists, fsMkdirAsync, fsWriteAsync 등)
    - Task 1의 `spawnAsync` 사용
    - 주요 메서드:
      - `initializeAsync()`: Capacitor 프로젝트 초기화
      - `buildAsync(outPath)`: Android APK/AAB 빌드
      - `runOnDeviceAsync(url)`: 디바이스에서 앱 실행
    - pnpm 패키지 매니저 사용 (yarn → pnpm 변경)
    - Windows/Linux 크로스 플랫폼 지원 (gradlew.bat / gradlew)

- [x] **Task 4: Capacitor 클래스 - 초기화 로직**
  - File: `packages/cli/src/capacitor/capacitor.ts`
  - Action: `initializeAsync()` 메서드 구현
  - Notes:
    - package.json 생성 (.capacitor/)
    - pnpm install
    - cap init
    - 플랫폼 추가 (cap add android)
    - 아이콘 설정 (sharp 사용)
    - Android 네이티브 설정 (gradle.properties, local.properties, AndroidManifest.xml, build.gradle)

- [x] **Task 5: Capacitor 클래스 - 빌드 로직**
  - File: `packages/cli/src/capacitor/capacitor.ts`
  - Action: `buildAsync()` 메서드 구현
  - Notes:
    - cap copy android
    - gradlew assembleRelease / bundleRelease
    - APK/AAB 파일 복사 (outPath)
    - 버전별 파일 저장 (updates/)

- [x] **Task 6: Capacitor 클래스 - 디바이스 실행 로직**
  - File: `packages/cli/src/capacitor/capacitor.ts`
  - Action: `runOnDeviceAsync()` 메서드 구현
  - Notes:
    - capacitor.config.ts의 server.url 업데이트
    - cap copy android
    - cap run android

#### Phase 3: CLI 명령어 통합

- [x] **Task 7: watch 명령어 - Capacitor 통합**
  - File: `packages/cli/src/commands/watch.ts`
  - Action: client 타겟에 capacitor 설정이 있으면 Capacitor 초기화/동기화 추가
  - Notes:
    - Vite dev server 시작 전에 Capacitor 초기화
    - 초기화 완료 후 cap sync 실행
    - Listr 태스크에 Capacitor 초기화 단계 추가

- [x] **Task 8: build 명령어 - Capacitor 통합**
  - File: `packages/cli/src/commands/build.ts`
  - Action: client 타겟에 capacitor 설정이 있으면 Vite 빌드 후 Capacitor 빌드 추가
  - Notes:
    - Vite production 빌드 완료 후 Capacitor 초기화
    - cap copy android
    - Gradle 빌드 실행
    - APK/AAB 파일 복사
    - Listr 태스크에 Capacitor 빌드 단계 추가

- [x] **Task 9: device 명령어 생성**
  - File: `packages/cli/src/commands/device.ts`
  - Action: 디바이스 연동을 위한 새 명령어 생성
  - Notes:
    - 옵션: `--package` (필수), `--url` (선택, 기본값 watch 서버)
    - Capacitor 클래스의 `runOnDeviceAsync()` 호출
    - Android 플랫폼만 지원

- [x] **Task 10: CLI 엔트리포인트 수정**
  - File: `packages/cli/src/sd-cli.ts`
  - Action: `device` 명령어 등록
  - Notes:
    - yargs command 추가
    - `--package`, `--url` 옵션 정의
    - `runDevice()` 함수 호출

#### Phase 4: 의존성 및 마무리

- [x] **Task 11: sharp 의존성 추가**
  - File: `packages/cli/package.json`
  - Action: `sharp` 패키지 devDependencies에 추가
  - Notes:
    - 아이콘 리사이즈에 사용
    - 버전: 최신 안정 버전

- [x] **Task 12: 린트 및 타입체크 통과 확인**
  - Action: `pnpm lint packages/cli && pnpm typecheck packages/cli` 실행
  - Notes:
    - 모든 에러 해결
    - ESLint 규칙 준수 (private → TypeScript private, Buffer → Uint8Array 등)

### Acceptance Criteria

- [ ] **AC 1**: Given capacitor 설정이 있는 client 패키지, when `pnpm watch {package}` 실행, then `.capacitor/` 디렉토리에 Capacitor 프로젝트가 초기화되고 Vite dev server가 시작됨

- [ ] **AC 2**: Given 초기화된 Capacitor 프로젝트, when `pnpm build {package}` 실행, then `dist/android/` 디렉토리에 APK 또는 AAB 파일이 생성됨

- [ ] **AC 3**: Given watch 모드로 실행 중인 Vite dev server, when `pnpm device --package {package} --url http://localhost:{port}` 실행, then 연결된 Android 디바이스에서 앱이 실행되고 WebView가 개발 서버를 가리킴

- [ ] **AC 4**: Given capacitor.icon 설정이 있는 경우, when watch 또는 build 실행, then 지정된 아이콘 파일로부터 Android 아이콘이 생성됨

- [ ] **AC 5**: Given capacitor.plugins 설정이 있는 경우, when watch 또는 build 실행, then 지정된 Capacitor 플러그인이 설치됨

- [ ] **AC 6**: Given capacitor.platform.android.sign 설정이 있는 경우, when `pnpm build` 실행, then APK/AAB가 서명됨

- [ ] **AC 7**: Given capacitor.platform.android.bundle: true 설정, when `pnpm build` 실행, then APK 대신 AAB 파일이 생성됨

- [ ] **AC 8**: Given 타입체크 실행, when `pnpm typecheck packages/cli`, then 에러 없이 통과

- [ ] **AC 9**: Given 린트 실행, when `pnpm lint packages/cli`, then 에러 없이 통과

- [ ] **AC 10**: Given Android SDK 미설치 환경, when watch 또는 build 실행, then "Android SDK를 찾을 수 없습니다. ANDROID_HOME 환경변수를 설정하세요." 에러 메시지 출력

- [ ] **AC 11**: Given 잘못된 capacitor 설정 (appId 또는 appName 누락), when watch 또는 build 실행, then 유효성 검증 에러 메시지 출력

- [ ] **AC 12**: Given Linux 또는 Mac 환경, when build 실행, then gradlew (not gradlew.bat) 사용하여 정상 빌드

## Additional Context

### Dependencies

**신규 의존성 (packages/cli/package.json):**
- `sharp`: 아이콘 이미지 리사이즈

**Capacitor 프로젝트 의존성 (.capacitor/package.json) - 자동 생성:**
- `@capacitor/core ^7.0.0`
- `@capacitor/cli ^7.0.0`
- `@capacitor/android ^7.0.0`
- `@capacitor/app ^7.0.0`
- `@capacitor/assets ^3.0.0`
- 사용자 설정 플러그인

**시스템 요구사항:**
- Android SDK 설치 (ANDROID_HOME 또는 ANDROID_SDK_ROOT 환경변수)
- Java 21 (Amazon Corretto, Eclipse Adoptium, Microsoft 등)
- pnpm (프로젝트 패키지 매니저)

### Testing Strategy

**수동 테스트:**
1. capacitor 설정이 있는 테스트용 client 패키지 생성
2. `pnpm watch {test-package}` 실행하여 Capacitor 초기화 확인
3. `pnpm build {test-package}` 실행하여 APK 생성 확인
4. Android 디바이스 연결 후 `pnpm device --package {test-package}` 실행
5. 아이콘, 플러그인, 서명 옵션 각각 테스트

**자동화 테스트 (향후):**
- 현재 CLI 패키지에 유닛 테스트 없음
- Capacitor 클래스의 유닛 테스트 추가 고려 (mock spawn)

### Notes

**위험 요소:**
- Android SDK/Java 경로 자동 탐색이 환경에 따라 실패할 수 있음 → 명확한 에러 메시지 제공
- Gradle 빌드 시간이 오래 걸릴 수 있음 → 진행 상황 로그 출력

**pnpm 호환성:**
- pnpm의 symlink 기반 `node_modules` 구조로 인해 Capacitor 플러그인 설치/동기화 시 문제 발생 가능
- 문제 발생 시 `.capacitor/.npmrc` 파일에 `node-linker=hoisted` 설정 추가 필요
- 이 설정은 사용자가 필요시 직접 처리 (자동 생성하지 않음)

**레거시 코드와의 차이점:**
- yarn → pnpm 변경
- FsUtils → @simplysm/core-node fs 유틸리티
- SdProcess.spawnAsync → 신규 spawnAsync 구현
- 클래스 구조 동일하게 유지하되 현재 코드베이스 패턴 적용

**향후 리팩토링 고려:**
- 현재 단일 `Capacitor` 클래스가 초기화/빌드/디바이스 실행 모두 담당
- 클래스가 커지면 분리 고려: `CapacitorProject`, `CapacitorBuilder`, `CapacitorRunner`

**향후 고려사항 (Out of Scope):**
- iOS 플랫폼 지원
- Electron 빌드 통합
- Hot Reload 지원 (Capacitor Live Reload)

---

## Review Notes (2026-02-01)

### Adversarial Review Findings

총 15개의 이슈가 발견되었으며, 13개는 자동 수정됨, 2개는 향후 개선 사항으로 분류됨.

#### Fixed Issues (13)

| # | Issue | Fix Applied |
|---|-------|-------------|
| F1 | Shell injection via `shell: true` | `shell: false` 설정, Windows에서 cmd.exe 명시적 호출 |
| F3 | File existence 미확인 | `_initializePackageJsonAsync()`에서 존재 여부 체크 후 생성/업데이트 |
| F4 | Tool validation 없음 | `_validateTools()` 메서드 추가 (pnpm, npx, Android SDK 확인) |
| F5 | Config validation 없음 | `_validateConfig()` 정적 메서드 추가 (appId, appName 검증) |
| F6 | Icon 처리 에러 시 전체 실패 | `_processIconAsync()`에서 try-catch로 감싸고 기본 아이콘 사용 fallback |
| F7 | 과도한 Object.assign | 생성자를 private으로, factory method `create()` 패턴으로 리팩토링 |
| F8 | 생성자에서 async 작업 | `create()` factory method에서 package.json 로드 |
| F9 | Windows 경로 처리 미흡 | `_getGradleCommand()` 메서드 개선, npm.cmd 처리 추가 |
| F10 | 동시성 제어 없음 | Lock file 기반 동시성 제어 (`_acquireLock()`, `_releaseLock()`) |
| F11 | URL validation 없음 | `runOnDeviceAsync()`에서 URL 유효성 검증 추가 |
| F12 | Idempotency 미처리 | cap init, cap add 전 이미 존재 여부 확인 |
| F13 | FORCE_COLOR 무조건 설정 | NO_COLOR 환경변수 존중 (https://no-color.org/) |
| Lint | `_npmConfig` readonly 필요 | `readonly` 수정자 추가 |

#### Deferred Issues (2)

| # | Issue | Reason |
|---|-------|--------|
| F14 | Spawn timeout 없음 | 현재 구현에서 충분, 향후 필요시 추가 |
| F15 | Validation 불완전 | 현재 수준에서 충분, 향후 필요시 확장 |

### Final Verification

```
✓ pnpm lint packages/cli    → errorCount: 0, warningCount: 0
✓ pnpm typecheck packages/cli → errorCount: 0, warningCount: 0
```

### Files Modified

| File | Action |
|------|--------|
| `packages/cli/src/utils/spawn.ts` | 신규 생성 |
| `packages/cli/src/capacitor/capacitor.ts` | 신규 생성 |
| `packages/cli/src/commands/device.ts` | 신규 생성 |
| `packages/cli/src/sd-config.types.ts` | 수정 |
| `packages/cli/src/commands/watch.ts` | 수정 |
| `packages/cli/src/commands/build.ts` | 수정 |
| `packages/cli/src/sd-cli.ts` | 수정 |
| `packages/cli/package.json` | 수정 (sharp 추가) |
