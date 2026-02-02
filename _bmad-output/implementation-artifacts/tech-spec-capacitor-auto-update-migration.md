---
title: 'Capacitor Auto Update 플러그인 마이그레이션'
slug: 'capacitor-auto-update-migration'
created: '2026-02-02'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript
  - Capacitor 7.x
  - Android Java
  - fetch API (ReadableStream)
files_to_modify:
  - packages/core-common/src/utils/path.ts (신규)
  - packages/core-common/src/index.ts (export 추가)
  - packages/core-browser/src/utils/download.ts (신규)
  - packages/core-browser/src/index.ts (export 추가)
  - packages/capacitor-plugin-auto-update/package.json
  - packages/capacitor-plugin-auto-update/src/index.ts
  - packages/capacitor-plugin-auto-update/src/IApkInstallerPlugin.ts
  - packages/capacitor-plugin-auto-update/src/ApkInstaller.ts
  - packages/capacitor-plugin-auto-update/src/AutoUpdate.ts
  - packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts
  - packages/capacitor-plugin-auto-update/android/** (복사)
  - sd.config.ts (패키지 등록 확인)
code_patterns:
  - Capacitor registerPlugin 패턴
  - abstract class로 static 메서드 래퍼
  - WebPlugin 기반 웹 fallback
  - fetch + ReadableStream 진행률 다운로드
test_patterns:
  - 현재 프로젝트에 Capacitor 플러그인 테스트 패턴 없음
  - 수동 테스트 권장
---

# Tech-Spec: Capacitor Auto Update 플러그인 마이그레이션

**Created:** 2026-02-02

## Overview

### Problem Statement

`.legacy-packages/capacitor-plugin-auto-update`가 레거시 의존성(`@simplysm/sd-core-common`, `@simplysm/sd-service-client`, `@simplysm/sd-service-common`)을 사용하고 있어 새로운 패키지 구조(`@simplysm/*`)로 마이그레이션이 필요하다.

### Solution

`packages/capacitor-plugin-auto-update`로 마이그레이션하고, 모든 의존성을 새로운 패키지 네이밍 컨벤션으로 변경한다. 기존 `capacitor-plugin-broadcast` 등 이미 마이그레이션된 패키지의 패턴을 따른다.

### Scope

**In Scope:**
- `ApkInstaller` Capacitor 플러그인 마이그레이션 (TypeScript)
- `AutoUpdate` 비즈니스 로직 클래스 마이그레이션
- `ApkInstallerWeb` 웹 fallback 구현 마이그레이션
- Android native 코드 복사 (수정 없음)
- 의존성 변경: `@simplysm/sd-*` → `@simplysm/*`
- path 유틸리티 → `@simplysm/core-common`에 추가
- download 유틸리티 → `@simplysm/core-browser`에 추가
- `Async` 접미사 제거 (`runAsync` → `run` 등)

**Out of Scope:**
- Android native 코드 수정 (이미 완성됨)
- 서버 측 AutoUpdateService 구현
- iOS 지원

## Context for Development

### Codebase Patterns

1. **Capacitor 플러그인 등록 패턴:**
   ```typescript
   const Plugin = registerPlugin<IPluginInterface>("PluginName", {
     web: async () => {
       const { PluginWeb } = await import("./web/PluginWeb");
       return new PluginWeb();
     },
   });
   ```

2. **래퍼 클래스 패턴:** `abstract class`로 static 메서드만 제공
3. **웹 fallback:** `WebPlugin`을 extends하여 브라우저 환경 지원
4. **패키지 의존성:** `workspace:*` 사용, peerDependencies로 `@capacitor/core`
5. **네이밍:** `Async` 접미사 사용하지 않음 (async 함수라도 그냥 `run`, `download` 등)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.legacy-packages/capacitor-plugin-auto-update/src/*` | 원본 소스 코드 |
| `.legacy-packages/capacitor-plugin-auto-update/android/*` | Android native 코드 (복사 대상) |
| `packages/capacitor-plugin-broadcast/package.json` | 마이그레이션된 패키지 구조 참조 |
| `packages/capacitor-plugin-broadcast/src/Broadcast.ts` | 플러그인 래퍼 패턴 참조 |
| `packages/core-common/src/utils/wait.ts` | 유틸리티 함수 패턴 참조 |
| `packages/core-browser/src/utils/blob.ts` | 브라우저 유틸리티 패턴 참조 |
| `packages/service-client/src/service-client.ts` | ServiceClient API 참조 |
| `packages/service-common/src/service-types/auto-update-service.types.ts` | AutoUpdateService 타입 |

### Technical Decisions

1. **의존성 매핑:**
   - `@simplysm/sd-core-common` → `@simplysm/core-common`
   - `@simplysm/sd-service-client` → `@simplysm/service-client`
   - `@simplysm/sd-service-common` → `@simplysm/service-common`
   - `@simplysm/capacitor-plugin-file-system` → `@simplysm/capacitor-plugin-file-system` (동일)
   - 추가: `@simplysm/core-browser` (download 유틸리티)

2. **API 변경:**
   - `Wait.until()` → `waitUntil()` (함수로 변경)
   - `ISdAutoUpdateService` → `AutoUpdateService` (이미 존재하는 타입 사용)
   - `SdServiceClient` → `ServiceClient`

3. **`Async` 접미사 제거:**
   - `runAsync` → `run`
   - `runByExternalStorageAsync` → `runByExternalStorage`

4. **유틸리티 함수 네이밍 (접두사 패턴, tree-shaking 지원):**
   - `@simplysm/core-common`: `pathJoin`, `pathBasename`, `pathExtname`
   - `@simplysm/core-browser`: `downloadBytes` (Uint8Array 반환)

5. **버전 정보 조회:**
   - `process.env["SD_VERSION"]` → `ApkInstaller.getVersionInfo().versionName` 사용

## Implementation Plan

### Tasks

- [x] **Task 1: core-common에 path 유틸리티 추가**
  - File: `packages/core-common/src/utils/path.ts`
  - Action: 새 파일 생성
  - Details:
    ```typescript
    /**
     * 경로 조합 (path.join 대체)
     */
    export function pathJoin(...segments: string[]): string {
      return segments
        .map((s, i) => (i === 0 ? s.replace(/\/+$/, "") : s.replace(/^\/+|\/+$/g, "")))
        .filter(Boolean)
        .join("/");
    }

    /**
     * 파일명 추출 (path.basename 대체)
     */
    export function pathBasename(filePath: string, ext?: string): string {
      const name = filePath.split("/").pop() ?? "";
      if (ext && name.endsWith(ext)) {
        return name.slice(0, -ext.length);
      }
      return name;
    }

    /**
     * 확장자 추출 (path.extname 대체)
     */
    export function pathExtname(filePath: string): string {
      const name = filePath.split("/").pop() ?? "";
      const dotIndex = name.lastIndexOf(".");
      return dotIndex > 0 ? name.slice(dotIndex) : "";
    }
    ```
  - File: `packages/core-common/src/index.ts`
  - Action: export 추가
    ```typescript
    export * from "./utils/path";
    ```

- [x] **Task 2: core-browser에 download 유틸리티 추가**
  - File: `packages/core-browser/src/utils/download.ts`
  - Action: 새 파일 생성
  - Details:
    ```typescript
    export interface DownloadProgress {
      receivedLength: number;
      contentLength: number;
    }

    /**
     * URL에서 바이너리 데이터 다운로드 (진행률 콜백 지원)
     */
    export async function downloadBytes(
      url: string,
      options?: { onProgress?: (progress: DownloadProgress) => void },
    ): Promise<Uint8Array> {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const contentLength = Number(response.headers.get("Content-Length") ?? 0);
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Content-Length가 있을 때만 진행률 콜백 호출 (chunked encoding 대응)
        if (contentLength > 0) {
          options?.onProgress?.({ receivedLength, contentLength });
        }
      }

      // 청크 병합
      const result = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        result.set(chunk, position);
        position += chunk.length;
      }

      return result;
    }
    ```
  - File: `packages/core-browser/src/index.ts`
  - Action: export 추가
    ```typescript
    export * from "./utils/download";
    ```

- [x] **Task 3: 패키지 디렉토리 및 package.json 생성**
  - File: `packages/capacitor-plugin-auto-update/package.json`
  - Action: 새 파일 생성
  - Details:
    ```json
    {
      "name": "@simplysm/capacitor-plugin-auto-update",
      "version": "13.0.0-beta.0",
      "description": "심플리즘 패키지 - Capacitor Auto Update Plugin",
      "author": "김석래",
      "repository": {
        "type": "git",
        "url": "https://github.com/kslhunter/simplysm.git",
        "directory": "packages/capacitor-plugin-auto-update"
      },
      "license": "MIT",
      "type": "module",
      "main": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "capacitor": { "android": { "src": "android" } },
      "dependencies": {
        "@simplysm/core-common": "workspace:*",
        "@simplysm/core-browser": "workspace:*",
        "@simplysm/capacitor-plugin-file-system": "workspace:*",
        "@simplysm/service-client": "workspace:*",
        "@simplysm/service-common": "workspace:*",
        "semver": "^7.7.3"
      },
      "peerDependencies": {
        "@capacitor/core": "^7.4.4"
      },
      "devDependencies": {
        "@capacitor/core": "^7.4.4",
        "@types/semver": "^7.7.1"
      }
    }
    ```

- [x] **Task 4: Android native 코드 복사**
  - File: `packages/capacitor-plugin-auto-update/android/`
  - Action: 레거시에서 전체 디렉토리 복사
  - Command: `cp -r .legacy-packages/capacitor-plugin-auto-update/android packages/capacitor-plugin-auto-update/`
  - Notes: 수정 없이 그대로 복사 (패키지명 `kr.co.simplysm.capacitor.apkinstaller` 유지)

- [x] **Task 5: IApkInstallerPlugin 인터페이스 마이그레이션**
  - File: `packages/capacitor-plugin-auto-update/src/IApkInstallerPlugin.ts`
  - Action: 레거시에서 복사 (변경 없음)
  - Source: `.legacy-packages/capacitor-plugin-auto-update/src/IApkInstallerPlugin.ts`

- [x] **Task 6: ApkInstaller 클래스 마이그레이션**
  - File: `packages/capacitor-plugin-auto-update/src/ApkInstaller.ts`
  - Action: 레거시에서 복사 (변경 없음 - import 경로가 상대 경로이므로)
  - Source: `.legacy-packages/capacitor-plugin-auto-update/src/ApkInstaller.ts`

- [x] **Task 7: ApkInstallerWeb 클래스 마이그레이션**
  - File: `packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts`
  - Action: 레거시에서 복사 (변경 없음)
  - Source: `.legacy-packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts`
  - Notes: 레거시에 이미 `process.env["SD_VERSION"] ?? "0.0.0"` fallback이 있음

- [x] **Task 8: AutoUpdate 클래스 마이그레이션**
  - File: `packages/capacitor-plugin-auto-update/src/AutoUpdate.ts`
  - Action: 레거시에서 복사 후 대폭 수정
  - Changes:
    1. Import 변경:
       - `import { FileSystem } from "@simplysm/capacitor-plugin-file-system";` (동일)
       - `import { html, Wait } from "@simplysm/sd-core-common";` → `import { html, waitUntil, pathJoin, pathBasename, pathExtname } from "@simplysm/core-common";`
       - `import type { SdServiceClient } from "@simplysm/sd-service-client";` → `import type { ServiceClient } from "@simplysm/service-client";`
       - `import type { ISdAutoUpdateService } from "@simplysm/sd-service-common";` → `import type { AutoUpdateService } from "@simplysm/service-common";`
       - `import path from "path";` → 삭제
       - 추가: `import { downloadBytes } from "@simplysm/core-browser";`
    2. 타입 변경:
       - `SdServiceClient` → `ServiceClient`
       - `ISdAutoUpdateService` → `AutoUpdateService`
       - 서비스명: `"SdAutoUpdateService"` → `"AutoUpdateService"`
    3. 메서드명 변경 (Async 접미사 제거):
       - `runAsync` → `run`
       - `runByExternalStorageAsync` → `runByExternalStorage`
    4. API 변경:
       - `Wait.until(async () => {...}, 1000)` → `waitUntil(async () => {...}, 1000)`
       - `NetUtils.downloadBufferAsync(url, { progressCallback })` → `downloadBytes(url, { onProgress })`
    5. path 변경:
       - `path.join(a, b)` → `pathJoin(a, b)`
       - `path.basename(file, ext)` → `pathBasename(file, ext)`
       - `path.extname(file)` → `pathExtname(file)`
    6. 버전 비교 변경:
       - `process.env["SD_VERSION"]` → `(await ApkInstaller.getVersionInfo()).versionName`
    7. **FileSystem API 메서드 Async 접미사 제거:**
       - `FileSystem.getStoragePathAsync()` → `FileSystem.getStoragePath()`
       - `FileSystem.writeFileAsync()` → `FileSystem.writeFile()`
       - `FileSystem.readdirAsync()` → `FileSystem.readdir()`
       - `FileSystem.getFileUriAsync()` → `FileSystem.getFileUri()`

- [x] **Task 9: index.ts 생성**
  - File: `packages/capacitor-plugin-auto-update/src/index.ts`
  - Action: 새 파일 생성
  - Details:
    ```typescript
    export * from "./ApkInstaller";
    export * from "./AutoUpdate";
    export * from "./IApkInstallerPlugin";
    ```

- [x] **Task 10: sd.config.ts에 패키지 등록 확인**
  - File: `sd.config.ts`
  - Action: capacitor-plugin-auto-update 패키지가 빌드 대상에 포함되어 있는지 확인
  - Notes: 다른 capacitor-plugin-* 패키지들과 동일한 패턴으로 등록 (target: "browser")

- [x] **Task 11: 의존성 설치 및 검증**
  - Action: 터미널에서 실행
  - Commands:
    ```bash
    pnpm install
    pnpm lint packages/core-common
    pnpm lint packages/core-browser
    pnpm lint packages/capacitor-plugin-auto-update
    pnpm typecheck packages/core-common
    pnpm typecheck packages/core-browser
    pnpm typecheck packages/capacitor-plugin-auto-update
    pnpm build capacitor-plugin-auto-update
    ```

### Acceptance Criteria

- [x] **AC1: core-common path 유틸리티**
  - Given: `pathJoin("a", "b", "c")` 호출
  - When: 함수 실행
  - Then: `"a/b/c"` 반환

- [x] **AC2: core-browser download 유틸리티**
  - Given: `downloadBytes(url, { onProgress })` 호출
  - When: 유효한 URL 전달
  - Then: `Uint8Array` 반환, `onProgress`가 `{ receivedLength, contentLength }`와 함께 호출

- [x] **AC3: 패키지 구조**
  - Given: `packages/capacitor-plugin-auto-update/` 디렉토리가 존재할 때
  - When: `pnpm install` 실행
  - Then: 의존성이 정상 설치됨

- [x] **AC4: 타입 체크 통과**
  - Given: 모든 소스 파일이 마이그레이션 완료
  - When: `pnpm typecheck packages/capacitor-plugin-auto-update` 실행
  - Then: 타입 에러 없이 성공

- [x] **AC5: 빌드 성공**
  - Given: 타입 체크 통과
  - When: `pnpm build capacitor-plugin-auto-update` 실행
  - Then: `dist/` 디렉토리에 `.js`, `.d.ts` 파일 생성

- [x] **AC6: 버전 비교 로직**
  - Given: `AutoUpdate.run` 내부 로직
  - When: 서버 버전과 앱 버전 비교 시
  - Then: `ApkInstaller.getVersionInfo().versionName`으로 현재 앱 버전 조회

- [x] **AC7: Async 접미사 제거**
  - Given: 마이그레이션된 `AutoUpdate` 클래스
  - When: 메서드 호출
  - Then: `run()`, `runByExternalStorage()` 등 Async 없이 호출 가능

- [x] **AC8: FileSystem API 호환**
  - Given: `AutoUpdate` 클래스 내부
  - When: FileSystem 메서드 호출
  - Then: `getStoragePath`, `writeFile`, `readdir`, `getFileUri` 등 Async 접미사 없이 호출

- [x] **AC9: Lint 통과**
  - Given: 모든 소스 파일 작성 완료
  - When: `pnpm lint packages/capacitor-plugin-auto-update` 실행
  - Then: lint 에러 없음

## Additional Context

### Dependencies

**런타임 의존성:**
- `@simplysm/core-common` - html, waitUntil, pathJoin, pathBasename, pathExtname
- `@simplysm/core-browser` - downloadBytes
- `@simplysm/capacitor-plugin-file-system` - 파일 시스템 접근
- `@simplysm/service-client` - ServiceClient 클래스
- `@simplysm/service-common` - AutoUpdateService 타입
- `semver` - 버전 비교

**Peer 의존성:**
- `@capacitor/core` (^7.4.4) - Capacitor 코어

**Dev 의존성:**
- `@capacitor/core` - 타입 정의용
- `@types/semver` - semver 타입

### Testing Strategy

**자동 테스트:**
- `pathJoin`, `pathBasename`, `pathExtname`: 순수 함수, 단위 테스트 용이 (`packages/core-common/tests/`)
- `downloadBytes`: mock fetch로 단위 테스트 가능 (`packages/core-browser/tests/`)

**수동 테스트:**
- Android 에뮬레이터 또는 실제 디바이스에서:
  1. 앱 설치 후 `AutoUpdate.run` 호출
  2. 서버에 새 버전 APK 등록
  3. 업데이트 다운로드 및 설치 프로세스 확인

### Notes

**위험 요소:**
- `AutoUpdate` 클래스의 버전 비교 로직이 동기 → 비동기로 변경됨 (영향도 낮음)
- 웹 환경에서 `ApkInstallerWeb.getVersionInfo()`가 항상 `"0.0.0"` 반환 (의도된 동작)

**향후 고려 사항:**
- iOS 지원 시 별도 플러그인 구현 필요
- 서버 측 `AutoUpdateService` 구현은 `service-server` 패키지에서 담당

**참고:**
- Android native 코드는 패키지명 `kr.co.simplysm.capacitor.apkinstaller` 유지
- Capacitor 7.x의 플러그인 등록 방식 사용
- `Async` 접미사는 프로젝트 컨벤션에 따라 제거
- 서비스명이 `"SdAutoUpdateService"` → `"AutoUpdateService"`로 변경됨. 서버 측 배포 시 동일하게 변경 필요

## Review Notes

- Adversarial review 완료
- Findings: 12개 총, 10개 수정, 1개 스킵 (Noise), 1개 문서화 대응
- Resolution approach: auto-fix

### 수정된 발견 사항:
- F1: `pathJoin` POSIX 경로만 지원함을 문서화
- F2: `pathExtname` 숨김 파일 동작 문서화
- F3: `downloadBytes` Content-Length 있을 때 미리 할당하여 메모리 효율성 향상
- F4: `downloadBytes`에서 reader.releaseLock() 추가
- F5: 빈 catch 블록에 에러 로깅 추가
- F6: `waitUntil`에 maxCount(300) 추가하여 최대 5분 대기
- F7: `_installApk` 반환값 제거 (void로 변경)
- F8: `semver.maxSatisfying` null 체크 추가
- F9: `env.d.ts` 주석으로 스코프 명시
- F10: `requestPermission`에 await 추가

### 스킵된 발견 사항:
- F11 (Noise): 단위 테스트 부재 - tech-spec에서 수동 테스트 권장으로 명시됨
- F12 (Real, 문서화): 경쟁 조건 가능성 - 설계상 허용 가능한 수준, 버전 체크와 다운로드 사이 간격이 짧음
