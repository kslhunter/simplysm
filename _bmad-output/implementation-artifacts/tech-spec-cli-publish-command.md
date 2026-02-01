---
title: 'CLI Publish 명령어 구현'
slug: 'cli-publish-command'
created: '2026-02-01'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript (strict mode, ESM)
  - yargs (CLI 파서)
  - semver (버전 관리)
  - '@simplysm/storage' (StorageFactory - SFTP/FTP/FTPS)
  - '@simplysm/core-node' (fs 유틸리티)
  - 'child_process' (git/npm 명령 실행)
  - consola (로깅)
files_to_modify:
  - packages/cli/src/sd-cli.ts (명령어 등록)
  - packages/cli/src/sd-config.types.ts (publish 설정 타입 추가)
  - packages/cli/src/commands/publish.ts (신규 생성)
  - packages/cli/package.json (의존성 추가)
  - packages/cli/tests/sd-cli.spec.ts (테스트 추가)
code_patterns:
  - yargs command 패턴 (sd-cli.ts)
  - 비동기 명령어 핸들러 (async args => { ... })
  - consola.withTag() 로깅
  - process.exitCode = 1 에러 처리
test_patterns:
  - vitest + vi.mock 패턴
  - describe/it 구조
  - 명령어 모킹 후 createCliParser().parse() 호출
---

# Tech-Spec: CLI Publish 명령어 구현

**Created:** 2026-02-01

## Overview

### Problem Statement

현재 CLI에는 패키지를 npm/sftp/파일시스템으로 배포하는 명령어가 없어, 수동으로 배포해야 한다.

### Solution

레거시 `sd-cli`의 publish 로직을 참고하여 새로운 `publish` 명령어를 구현한다. 빌드 실패 시 배포를 중단하는 안전장치를 추가한다.

### Scope

**In Scope:**
1. `sd publish [targets..]` 명령어
2. 세 가지 배포 방식: `npm`, `sftp`/`ftp`/`ftps`, `local-directory`
3. 버전 자동 증가 (patch 또는 prerelease: alpha, beta 등)
4. Git 플로우: 미커밋 체크 → 빌드 → 버전 커밋/태그 → 푸시
5. `--noBuild` 옵션 (경고 대기 시간 포함)
6. `postPublish` 스크립트 실행
7. 빌드 실패 시 배포 중단 (레거시 문제점 개선)
8. `@simplysm/storage` 패키지 활용

**Out of Scope:**
- `--dry-run` 옵션
- Electron/Capacitor/Cordova 빌더 연동
- 병렬 배포 (순차 배포로 진행)

## Context for Development

### Codebase Patterns

**CLI 명령어 등록 (sd-cli.ts:36-67 참조):**
```typescript
.command(
  "publish [targets..]",
  "패키지를 배포한다.",
  (cmd) => cmd
    .positional("targets", { type: "string", array: true, default: [] })
    .options({
      noBuild: { type: "boolean", default: false },
      options: { type: "string", array: true, alias: "o", default: [] },
    }),
  async (args) => {
    await runPublish({ targets: args.targets, noBuild: args.noBuild, options: args.options });
  },
)
```

**파일시스템 유틸리티 (@simplysm/core-node):**
- `fsExists`, `fsExistsAsync` - 파일/디렉토리 존재 확인
- `fsReadJson`, `fsWriteJson` - JSON 읽기/쓰기
- `fsCopyAsync` - 디렉토리 복사 (local-directory 배포용)
- `fsGlob` - glob 패턴 검색

**Storage 패키지 (SFTP/FTP 배포):**
```typescript
await StorageFactory.connect("sftp", { host, port, user, pass }, async (storage) => {
  await storage.uploadDir(localPath, remotePath);
});
```

**프로세스 실행 (child_process 직접 사용):**
- core-node에 spawnAsync 없음 → `child_process.spawn` 직접 사용
- 레거시의 `SdProcess.spawnAsync` 패턴 참조

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.legacy-packages/sd-cli/src/entry/SdCliProject.ts:125-285` | publishAsync 전체 로직 |
| `.legacy-packages/sd-cli/src/entry/SdCliProject.ts:287-345` | _publishPkgAsync (배포 방식별 처리) |
| `.legacy-packages/sd-cli/src/entry/SdCliProject.ts:360-418` | _upgradeVersion (버전 업그레이드) |
| `packages/cli/src/sd-cli.ts` | CLI 명령어 등록 패턴 |
| `packages/cli/src/commands/build.ts` | runBuild 구조 참조 |
| `packages/cli/src/sd-config.types.ts` | 설정 타입 정의 |
| `packages/storage/src/storage-factory.ts` | StorageFactory.connect() |
| `packages/core-node/src/utils/fs.ts` | 파일시스템 유틸리티 |

### Technical Decisions

1. **npm 사용**: `npm publish --access public` (pnpm 대신 npm 기반)
2. **workspace:* 자동 변환**: npm publish 시 자동으로 실제 버전으로 변환됨
3. **Storage 패키지 활용**: `@simplysm/storage`의 `StorageFactory.connect()` 사용
4. **빌드 실패 시 중단**: 레거시와 달리 빌드 에러 발생 시 즉시 롤백 및 중단
5. **child_process 직접 사용**: spawnAsync 헬퍼 함수를 publish.ts 내부에 구현
6. **현재 버전**: `13.0.0-beta.0` (prerelease 버전 → semver.inc("prerelease") 사용)

## Implementation Plan

### Tasks

- [x] **Task 1: 의존성 추가**
  - File: `packages/cli/package.json`
  - Action: `dependencies`에 `semver`, `@simplysm/storage` 추가
  - Notes: `@types/semver`는 devDependencies에 추가

- [x] **Task 2: Publish 설정 타입 정의**
  - File: `packages/cli/src/sd-config.types.ts`
  - Action: 다음 타입 추가
    ```typescript
    // 패키지 publish 설정
    export type SdPublishConfig =
      | "npm"
      | SdLocalDirectoryPublishConfig
      | SdStoragePublishConfig;

    export interface SdLocalDirectoryPublishConfig {
      type: "local-directory";
      path: string;  // 환경변수 치환 지원: %SD_VERSION%, %SD_PROJECT_PATH%
    }

    export interface SdStoragePublishConfig {
      type: "ftp" | "ftps" | "sftp";
      host: string;
      port?: number;
      path?: string;
      user?: string;
      pass?: string;
    }

    // postPublish 스크립트 설정
    export interface SdPostPublishScriptConfig {
      type: "script";
      cmd: string;
      args: string[];  // 환경변수 치환 지원
    }

    // SdConfig 확장
    export interface SdConfig {
      packages: Record<string, SdPackageConfig | undefined>;
      postPublish?: SdPostPublishScriptConfig[];
    }
    ```
  - Action: `SdBuildPackageConfig`, `SdClientPackageConfig`에 `publish?: SdPublishConfig` 필드 추가

- [x] **Task 3: spawnAsync 헬퍼 함수 구현**
  - File: `packages/cli/src/commands/publish.ts` (신규)
  - Action: child_process.spawn 래퍼 함수 구현
    ```typescript
    async function spawnAsync(
      cmd: string,
      args: string[],
      options?: { cwd?: string }
    ): Promise<string>
    ```
  - Notes: stdout 캡처, 에러 시 reject

- [x] **Task 4: 버전 업그레이드 함수 구현**
  - File: `packages/cli/src/commands/publish.ts`
  - Action: `upgradeVersion(cwd: string, allPkgPaths: string[])` 함수 구현
    - 루트 package.json 버전 읽기
    - `semver.prerelease()` 확인하여 prerelease면 `semver.inc(version, "prerelease")`, 아니면 `semver.inc(version, "patch")`
    - 루트 및 모든 패키지 package.json 버전 업데이트
    - workspace:* 의존성은 npm publish 시 자동 변환되므로 별도 처리 불필요
  - Notes: 레거시 `_upgradeVersion` 참조

- [x] **Task 5: 패키지별 배포 함수 구현**
  - File: `packages/cli/src/commands/publish.ts`
  - Action: `publishPackage(pkgPath: string, publishConfig: SdPublishConfig)` 함수 구현
    - `"npm"`: `npm publish --access public` 실행, prerelease면 `--tag {prerelease-id}` 추가
    - `"local-directory"`: `fsCopyAsync(dist, targetPath)` 사용, 환경변수 치환
    - `"ftp"|"ftps"|"sftp"`: `StorageFactory.connect()` + `uploadDir()` 사용
  - Action: `replaceEnvVariables(str: string, version: string)` 헬퍼 함수 구현
    - `%SD_VERSION%`, `%SD_PROJECT_PATH%` 및 `process.env` 치환
    - **치환 결과가 빈 문자열이면 에러 throw** (Pre-mortem 개선)
  - Notes: 레거시 `_publishPkgAsync` 참조

- [x] **Task 6: 대기 메시지 함수 구현**
  - File: `packages/cli/src/commands/publish.ts`
  - Action: `waitWithCountdown(message: string, seconds: number)` 함수 구현
    - `process.stdout.cursorTo(0)` + `process.stdout.write()` 사용
    - 1초 간격 카운트다운
  - Notes: 레거시 `_waitSecMessageAsync` 참조

- [x] **Task 7: runPublish 메인 함수 구현**
  - File: `packages/cli/src/commands/publish.ts`
  - Action: `runPublish(options: PublishOptions)` 함수 구현
    - **Phase 1: 사전 검증**
      - npm publish 설정 패키지가 있으면 `npm whoami`로 인증 확인
      - `--noBuild`가 아니면 `.git` 존재 시 `git diff`로 미커밋 변경사항 확인
    - **Phase 2: 빌드** (noBuild가 아닌 경우)
      - `upgradeVersion()` 호출
      - `runBuild()` 호출 (기존 build.ts import)
      - 빌드 실패 시 `git checkout .`으로 롤백 후 중단
    - **Phase 3: Git 커밋/태그/푸시** (noBuild가 아니고 .git 존재 시)
      - `git add .` → `git commit -m "v{version}"` → `git tag -a v{version} -m v{version}`
      - `git push` → `git push --tags`
      - **Git 실패 시 롤백 후 중단** (배포 전에 Git 완료 보장 - Pre-mortem 개선)
    - **Phase 4: 배포** (Git 성공 후 실행)
      - 각 패키지별 `publishPackage()` 호출 (순차)
      - **배포 중 실패 시:** 이미 배포된 패키지 목록 출력 + 수동 복구 안내 (Pre-mortem 개선)
    - **Phase 5: postPublish**
      - `config.postPublish` 스크립트들 순차 실행
      - 환경변수 치환: `%SD_VERSION%`, `%SD_PROJECT_PATH%`
      - **postPublish 실패 시 경고만 출력** (배포 롤백 불가하므로 계속 진행)
    - **noBuild 경로**
      - 경고 메시지 + `waitWithCountdown(5초)` 후 Phase 4, 5만 실행
  - Notes: 레거시 `publishAsync` 참조, 빌드 실패 시 process.exitCode 확인하여 중단

- [x] **Task 8: CLI 명령어 등록**
  - File: `packages/cli/src/sd-cli.ts`
  - Action:
    - `import { runPublish } from "./commands/publish"` 추가
    - `.command("publish [targets..]", ...)` 추가 (build 명령어 다음에)
    - 옵션: `targets`, `--noBuild`, `--options` (또는 `-o`)

- [x] **Task 9: publish 명령어 테스트 추가**
  - File: `packages/cli/tests/sd-cli.spec.ts`
  - Action:
    - `vi.mock("../src/commands/publish")` 추가
    - `describe("publish 명령어", ...)` 블록 추가
    - 테스트 케이스: 기본 호출, targets 전달, --noBuild 옵션, --options 옵션

### Acceptance Criteria

- [ ] **AC 1:** Given CLI가 설치되어 있을 때, when `sd publish --help`를 실행하면, then publish 명령어의 도움말이 출력된다.

- [ ] **AC 2:** Given npm에 로그인되어 있지 않을 때, when npm publish 설정이 있는 패키지에 `sd publish`를 실행하면, then 인증 오류 메시지가 출력되고 배포가 중단된다.

- [ ] **AC 3:** Given 커밋되지 않은 변경사항이 있을 때, when `sd publish`를 실행하면 (noBuild 없이), then 미커밋 변경사항 오류가 출력되고 배포가 중단된다.

- [ ] **AC 4:** Given 빌드가 성공할 때, when `sd publish`를 실행하면, then 버전이 자동 증가하고, Git 커밋/태그가 생성되고, 패키지가 배포된다.

- [ ] **AC 5:** Given 빌드가 실패할 때, when `sd publish`를 실행하면, then `git checkout .`으로 변경사항이 롤백되고 배포가 중단된다.

- [ ] **AC 6:** Given `--noBuild` 옵션이 주어졌을 때, when `sd publish --noBuild`를 실행하면, then 5초 카운트다운 경고 후 빌드 없이 배포만 진행된다.

- [ ] **AC 7:** Given npm publish 설정이 있는 패키지가 있을 때, when 배포하면, then `npm publish --access public`이 실행되고 prerelease 버전이면 적절한 태그(`--tag beta` 등)가 추가된다.

- [ ] **AC 8:** Given local-directory publish 설정이 있는 패키지가 있을 때, when 배포하면, then dist 폴더가 지정된 경로로 복사되고 환경변수(`%SD_VERSION%` 등)가 치환된다.

- [ ] **AC 9:** Given sftp publish 설정이 있는 패키지가 있을 때, when 배포하면, then `@simplysm/storage`를 통해 원격 서버에 업로드된다.

- [ ] **AC 10:** Given postPublish 스크립트가 설정되어 있을 때, when 배포가 완료되면, then 스크립트가 순차적으로 실행되고 환경변수가 치환된다.

- [ ] **AC 11:** Given 특정 패키지만 지정했을 때, when `sd publish solid core-common`을 실행하면, then 지정된 패키지만 배포된다.

- [ ] **AC 12:** Given npm publish가 중간에 실패할 때, when 에러가 발생하면, then 이미 배포된 패키지 목록과 수동 복구 안내가 출력된다. (Pre-mortem 개선)

- [ ] **AC 13:** Given 환경변수 치환 결과가 빈 문자열일 때, when 경로를 생성하면, then 에러가 발생하고 배포가 중단된다. (Pre-mortem 개선)

## Additional Context

### Dependencies

**신규 추가 필요 (packages/cli/package.json):**
- `semver`: ^7.x - 버전 파싱 및 증가
- `@simplysm/storage`: workspace:* - SFTP/FTP 배포
- `@types/semver`: ^7.x (devDependencies) - 타입 정의

**기존 사용:**
- `@simplysm/core-node`: 파일시스템 유틸리티
- `consola`: 로깅
- `yargs`: CLI 파싱

### Testing Strategy

**Unit Tests (sd-cli.spec.ts):**
- publish 명령어 파싱 테스트
- 옵션 전달 테스트 (targets, --noBuild, --options)

**Manual Testing:**
1. npm publish 테스트: 테스트 패키지로 npm publish 실행
2. local-directory 테스트: 로컬 경로로 복사 확인
3. sftp 테스트: 테스트 서버로 업로드 확인
4. Git 플로우 테스트: 커밋/태그 생성 확인
5. 빌드 실패 테스트: 의도적 빌드 오류 시 롤백 확인

**Integration Tests (향후):**
- Docker 기반 SFTP 서버로 E2E 테스트
- npm registry mock으로 publish 테스트

### Notes

**배포 순서 (안전성 우선 - Pre-mortem 분석 결과):**
1. 사전 검증 (npm 인증, Git 상태)
2. 버전 업그레이드
3. 빌드 (실패 시 롤백)
4. **Git 커밋/태그/푸시 (실패 시 롤백)** ← 배포 전에 완료
5. npm/sftp/local 배포 (실패 시 수동 복구 안내)
6. postPublish (실패해도 계속)

**고위험 항목:**
- Git 롤백 실패 시 복구 어려움 → 사용자에게 수동 복구 안내 메시지 출력
- npm 인증 만료 → 배포 전 whoami로 사전 검증
- 배포 중간 실패 → 이미 배포된 패키지 목록 출력 + 수동 복구 안내

**알려진 제한사항:**
- 병렬 배포 미지원 (순차 배포)
- dry-run 미지원

**향후 고려사항:**
- `--dry-run` 옵션 추가
- 배포 롤백 기능 (이전 버전으로 복구)
- 병렬 배포 지원

## Review Notes

- Adversarial review 완료
- Findings: 10 total, 5 fixed, 5 skipped (noise/complexity)
- Resolution approach: auto-fix

**Fixed:**
- F1: 빈 환경변수 이름 처리 개선
- F2: JSON 쓰기 후 newline 추가
- F3: staged 파일 확인 추가
- F5: 롤백 안내에 untracked 파일 언급 추가
- F6: npm unpublish 72시간 안내 추가

**Skipped:**
- F4: shell: true 유지 (실제 위험 낮음, 복잡도 대비 효과 낮음)
- F7, F8: 타입 관련 (TypeScript가 올바르게 처리함)
- F9: PATH 문제 (shell: true로 해결됨)
- F10: TTY 체크 (이미 적절히 처리됨)
