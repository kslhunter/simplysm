---
title: 'Capacitor Broadcast Plugin 마이그레이션'
slug: 'capacitor-broadcast-migration'
created: '2026-02-02'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript
  - Capacitor 7.x
  - Android (Java)
files_to_modify:
  - packages/capacitor-plugin-broadcast/src/index.ts (신규)
  - packages/capacitor-plugin-broadcast/src/Broadcast.ts (신규 - onNewIntent 래퍼 추가)
  - packages/capacitor-plugin-broadcast/src/IBroadcastPlugin.ts (신규 - addListener 타입 추가)
  - packages/capacitor-plugin-broadcast/src/web/BroadcastWeb.ts (신규 - alert→console.warn)
  - packages/capacitor-plugin-broadcast/package.json (신규)
  - packages/capacitor-plugin-broadcast/android/build.gradle (신규)
  - packages/capacitor-plugin-broadcast/android/src/main/AndroidManifest.xml (신규)
  - packages/capacitor-plugin-broadcast/android/src/main/java/kr/co/simplysm/capacitor/broadcast/BroadcastPlugin.java (신규)
  - sd.config.ts (수정 - 패키지 추가)
code_patterns:
  - abstract class + static 메서드 패턴
  - registerPlugin으로 플러그인 등록
  - WebPlugin 상속 웹 구현체
  - Async 접미사 없는 메서드명
test_patterns: []
---

# Tech-Spec: Capacitor Broadcast Plugin 마이그레이션

**Created:** 2026-02-02

## Overview

### Problem Statement

`.legacy-packages/capacitor-plugin-broadcast`에 있는 레거시 Capacitor Broadcast 플러그인을 현재 모노레포의 패키지 구조(`packages/`)로 마이그레이션해야 함.

### Solution

1. `.legacy-packages/capacitor-plugin-broadcast`를 `packages/capacitor-plugin-broadcast`로 마이그레이션
2. `capacitor-plugin-usb-storage` 패턴을 따름
3. `onNewIntent` 이벤트 리스너 TypeScript 타입 추가

### Scope

**In Scope:**
- TypeScript 소스 코드 마이그레이션
- Android 네이티브 코드 복사
- package.json 생성 (버전 13.0.0-beta.0, core-common 의존성 제외)
- 웹 fallback (console.warn으로 개선)
- `sd.config.ts`에 새 패키지 등록
- `onNewIntent` 이벤트 리스너 TypeScript 타입 정의 추가

**Out of Scope:**
- iOS 지원
- 브라우저 완전한 에뮬레이션 (Android Broadcast는 브라우저에서 구현 불가)

## Context for Development

### Codebase Patterns

**참조 패턴: `capacitor-plugin-usb-storage`**
```typescript
// abstract class + static 메서드
export abstract class UsbStorage {
  static async getDevices(): Promise<IUsbDeviceInfo[]> { ... }
  static async requestPermission(filter: IUsbDeviceFilter): Promise<boolean> { ... }
}
```

**Broadcast 플러그인 API:**
- `subscribe(filters, callback)` → 해제 함수 반환
- `unsubscribeAll()`
- `send(options)`
- `getLaunchIntent()`
- `addListener("onNewIntent", callback)` → 앱 실행 중 새 Intent 수신 (신규 타입 추가)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/capacitor-plugin-usb-storage/src/UsbStorage.ts` | 참조 패턴 |
| `packages/capacitor-plugin-usb-storage/package.json` | package.json 구조 참조 |
| `packages/capacitor-plugin-usb-storage/android/build.gradle` | build.gradle 구조 참조 |
| `.legacy-packages/capacitor-plugin-broadcast/src/*` | 마이그레이션 원본 TypeScript |
| `.legacy-packages/capacitor-plugin-broadcast/android/*` | 마이그레이션 원본 Android |

### Technical Decisions

1. **core-common 의존성 제외**: Broadcast 플러그인은 core-common 유틸리티 불필요
2. **웹 fallback**: `alert()` 대신 `console.warn()`으로 변경 (프로덕션 환경 고려)
3. **Android 코드**: 레거시에서 그대로 복사 (이미 Android 13 RECEIVER_EXPORTED 대응됨)
4. **onNewIntent 타입**: `IBroadcastPlugin`에 `addListener` 타입 추가하여 TypeScript 지원

## Implementation Plan

### Tasks

- [x] **Task 1: Broadcast 패키지 디렉토리 구조 생성**
  - Action: 다음 디렉토리 구조 생성
    ```
    packages/capacitor-plugin-broadcast/
    ├── src/
    │   └── web/
    └── android/
        └── src/main/java/kr/co/simplysm/capacitor/broadcast/
    ```

- [x] **Task 2: package.json 생성**
  - File: `packages/capacitor-plugin-broadcast/package.json`
  - Action: 다음 내용으로 생성
    ```json
    {
      "name": "@simplysm/capacitor-plugin-broadcast",
      "version": "13.0.0-beta.0",
      "description": "심플리즘 패키지 - Capacitor Broadcast Plugin",
      "author": "김석래",
      "repository": {
        "type": "git",
        "url": "https://github.com/kslhunter/simplysm.git",
        "directory": "packages/capacitor-plugin-broadcast"
      },
      "license": "MIT",
      "type": "module",
      "main": "./dist/index.js",
      "types": "./dist/index.d.ts",
      "capacitor": {
        "android": {
          "src": "android"
        }
      },
      "peerDependencies": {
        "@capacitor/core": "^7.4.4"
      },
      "devDependencies": {
        "@capacitor/core": "^7.4.4"
      }
    }
    ```

- [x] **Task 3: IBroadcastPlugin.ts 작성**
  - File: `packages/capacitor-plugin-broadcast/src/IBroadcastPlugin.ts`
  - Action: `.legacy-packages/capacitor-plugin-broadcast/src/IBroadcastPlugin.ts`에서 복사 후 수정
  - **수정 사항**: `onNewIntent` 이벤트 리스너 타입 추가
    ```typescript
    import type { PluginListenerHandle } from "@capacitor/core";

    // 기존 인터페이스 내용 유지...

    // 인터페이스 끝에 추가:
    addListener(
      eventName: "onNewIntent",
      listenerFunc: (data: IBroadcastResult) => void,
    ): Promise<PluginListenerHandle>;
    ```

- [x] **Task 4: Broadcast.ts 작성**
  - File: `packages/capacitor-plugin-broadcast/src/Broadcast.ts`
  - Action: `.legacy-packages/capacitor-plugin-broadcast/src/Broadcast.ts`에서 복사 후 수정
  - **수정 사항**: `onNewIntent` 리스너 래퍼 메서드 추가
    ```typescript
    import type { PluginListenerHandle } from "@capacitor/core";

    // Broadcast 클래스 내에 추가:
    /**
     * 앱 실행 중 새 Intent 수신 리스너 등록
     * @returns 리스너 핸들 (remove()로 해제)
     */
    static async addNewIntentListener(
      callback: (result: IBroadcastResult) => void,
    ): Promise<PluginListenerHandle> {
      return await BroadcastPlugin.addListener("onNewIntent", callback);
    }
    ```

- [x] **Task 5: BroadcastWeb.ts 작성**
  - File: `packages/capacitor-plugin-broadcast/src/web/BroadcastWeb.ts`
  - Action: `.legacy-packages/capacitor-plugin-broadcast/src/web/BroadcastWeb.ts`에서 복사 후 수정
  - **수정 사항**: 모든 `alert()` 호출(2곳)을 `console.warn()`으로 변경
    - 9행 (`subscribe` 메서드 내): `alert(...)` → `console.warn(...)`
    - 22행 (`send` 메서드 내): `alert(...)` → `console.warn(...)`

- [x] **Task 6: index.ts 작성**
  - File: `packages/capacitor-plugin-broadcast/src/index.ts`
  - Action: `.legacy-packages/capacitor-plugin-broadcast/src/index.ts`에서 복사 (변경 없음)

- [x] **Task 7: Android build.gradle 생성**
  - File: `packages/capacitor-plugin-broadcast/android/build.gradle`
  - Action: `.legacy-packages/capacitor-plugin-broadcast/android/build.gradle`에서 복사 (변경 없음)

- [x] **Task 8: Android AndroidManifest.xml 생성**
  - File: `packages/capacitor-plugin-broadcast/android/src/main/AndroidManifest.xml`
  - Action: `.legacy-packages/capacitor-plugin-broadcast/android/src/main/AndroidManifest.xml`에서 복사 (변경 없음)

- [x] **Task 9: Android BroadcastPlugin.java 생성**
  - File: `packages/capacitor-plugin-broadcast/android/src/main/java/kr/co/simplysm/capacitor/broadcast/BroadcastPlugin.java`
  - Action: `.legacy-packages/capacitor-plugin-broadcast/android/src/main/java/kr/co/simplysm/capacitor/broadcast/BroadcastPlugin.java`에서 복사 (변경 없음)

- [x] **Task 10: sd.config.ts 업데이트**
  - File: `sd.config.ts`
  - Action: packages 객체에 `"capacitor-plugin-broadcast": { target: "browser" }` 추가 (알파벳 순서 유지)

- [x] **Task 11: 의존성 설치 및 검증**
  - Action: `pnpm install` 실행
  - Verify: 오류 없이 설치 완료

- [x] **Task 12: 빌드 및 검증**
  - Action: `pnpm build capacitor-plugin-broadcast` 실행
  - Verify: dist 폴더에 빌드 결과물 생성

- [x] **Task 13: lint/typecheck 검증**
  - Action: `pnpm lint packages/capacitor-plugin-broadcast && pnpm typecheck packages/capacitor-plugin-broadcast` 실행
  - Verify: 오류 없음

### Acceptance Criteria

- [x] **AC1**: Given `packages/capacitor-plugin-broadcast/` 디렉토리, When `ls -la` 실행, Then 모든 필수 파일이 존재함 (package.json, src/, android/)

- [x] **AC2**: Given 모든 변경 완료, When `pnpm install` 실행, Then 오류 없이 의존성 설치됨

- [x] **AC3**: Given 모든 변경 완료, When `pnpm build capacitor-plugin-broadcast` 실행, Then `dist/` 폴더에 `index.js`, `index.d.ts` 등 빌드 결과물 생성됨

- [x] **AC4**: Given 모든 변경 완료, When `pnpm lint && pnpm typecheck` 실행, Then 오류 없음

- [x] **AC5**: Given `sd.config.ts` 파일, When 내용 확인, Then `capacitor-plugin-broadcast` 패키지가 `target: "browser"`로 등록되어 있음

- [x] **AC6**: Given `BroadcastWeb.ts` 파일, When 내용 확인, Then 모든 `alert()` 호출(2곳)이 `console.warn()`으로 변경됨

- [x] **AC7**: Given `IBroadcastPlugin.ts` 파일, When 내용 확인, Then `addListener("onNewIntent", ...)` 타입이 정의되어 있음

- [x] **AC8**: Given `Broadcast.ts` 파일, When 내용 확인, Then `addNewIntentListener()` 메서드가 존재함

## Additional Context

### Dependencies

**Broadcast 플러그인:**
- `@capacitor/core`: ^7.4.4 (peerDependency)

**Android:**
- `capacitor-android` (프로젝트 의존성)
- `androidx.appcompat:appcompat` (기존 의존성)

### Testing Strategy

1. **정적 검증**
   - `pnpm lint` - ESLint 규칙 통과
   - `pnpm typecheck` - TypeScript 타입 검사 통과

2. **빌드 검증**
   - `pnpm build capacitor-plugin-broadcast` - 빌드 성공
   - `dist/` 폴더에 결과물 확인

3. **수동 테스트 (선택)**
   - Android 기기에서 Broadcast 송수신 테스트
   - onNewIntent 이벤트 수신 테스트

### Notes

- Android 13(Tiramisu, API 33)부터 `Context.RECEIVER_EXPORTED` 플래그 필요 - 레거시 코드에 이미 구현됨
- 레거시 패키지의 `dist/` 폴더는 마이그레이션 불필요 (빌드로 생성됨)
- 웹 환경에서는 Android Broadcast가 물리적으로 불가능하므로 console.warn stub 사용
- **onNewIntent 이벤트**: 앱이 이미 실행 중일 때 새 Intent 수신 시 발생. `Broadcast.addNewIntentListener(callback)`으로 수신 가능.
- **WebPlugin addListener**: `BroadcastWeb`은 `WebPlugin`을 상속하며, `addListener`는 부모 클래스에서 기본 제공되므로 별도 구현 불필요.

## Review Notes

- Adversarial review 완료
- Findings: 10개 발견, 2개 수정, 8개 skip (noise/적절한 설계)
- Resolution approach: auto-fix
- 수정 내용:
  - F4: `BroadcastWeb`의 불필요한 `await Promise.resolve()` 제거
  - F7: `BroadcastPlugin.java`의 미사용 `Set` import 제거
