---
title: 'Capacitor USB Storage 플러그인 마이그레이션'
slug: 'capacitor-plugin-usb-storage-migration'
created: '2026-02-02'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript
  - Capacitor 7.x
  - Android (Java)
  - IndexedDB (Web)
  - '@simplysm/core-common (Bytes 유틸리티)'
files_to_modify:
  - 'packages/capacitor-plugin-usb-storage/package.json (신규)'
  - 'packages/capacitor-plugin-usb-storage/tsconfig.json (신규)'
  - 'packages/capacitor-plugin-usb-storage/src/index.ts (신규)'
  - 'packages/capacitor-plugin-usb-storage/src/IUsbStoragePlugin.ts (신규)'
  - 'packages/capacitor-plugin-usb-storage/src/UsbStorage.ts (신규)'
  - 'packages/capacitor-plugin-usb-storage/src/web/UsbStorageWeb.ts (신규)'
  - 'packages/capacitor-plugin-usb-storage/src/web/VirtualUsbStorage.ts (신규)'
  - 'packages/capacitor-plugin-usb-storage/android/ (복사)'
  - 'sd.config.ts (수정)'
code_patterns:
  - 'Capacitor registerPlugin 패턴'
  - 'WebPlugin 상속 패턴'
  - 'IndexedDB VirtualFileSystem 패턴'
  - '@simplysm/core-common bytesToBase64/bytesFromBase64'
  - 'abstract class로 static 메서드 래퍼 제공'
test_patterns:
  - '현재 capacitor 플러그인 테스트 없음'
---

# Tech-Spec: Capacitor USB Storage 플러그인 마이그레이션

**Created:** 2026-02-02

## Overview

### Problem Statement

`.legacy-packages/capacitor-plugin-usb-storage`가 레거시 상태로 남아있으며, `Buffer` 타입 사용과 Web 미지원 등 현재 프로젝트 표준에 맞지 않음

### Solution

`packages/capacitor-plugin-file-system` 패턴을 따라 마이그레이션
- `Buffer` → `Bytes` (Uint8Array) 변환
- `@simplysm/core-common`의 `bytesToBase64`/`bytesFromBase64` 사용
- Web 구현에 IndexedDB 기반 가상 USB 저장소 에뮬레이션 추가

### Scope

**In Scope:**
- `packages/capacitor-plugin-usb-storage/` 신규 패키지 생성
- TypeScript 소스 마이그레이션 (`Buffer` → `Bytes`)
- Android 네이티브 코드 복사 (변경 없음)
- Web 구현: IndexedDB 기반 가상 USB 장치 에뮬레이션
- `sd.config.ts` 빌드 설정 추가

**Out of Scope:**
- 파일 쓰기 기능 추가
- iOS 지원

## Context for Development

### Codebase Patterns

**Capacitor 플러그인 구조:**
- `registerPlugin<IPlugin>("PluginName", { web: ... })` 패턴
- `WebPlugin` 상속하여 Web 구현
- `abstract class`로 static 메서드 래퍼 제공 (직접 Plugin 호출 숨김)

**타입 변환:**
- `Buffer` 대신 `Bytes` (Uint8Array) 사용
- Base64 인코딩: `bytesToBase64()`, 디코딩: `bytesFromBase64()`

**IndexedDB 가상 파일시스템:**
- `VirtualFileSystem` 클래스가 IndexedDB 래핑
- `FsEntry` 인터페이스: `{ path, kind: "file"|"dir", dataBase64? }`
- `ensureDir()`, `getEntry()`, `putEntry()`, `listChildren()` 메서드

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/capacitor-plugin-file-system/src/FileSystem.ts` | static 메서드 래퍼 패턴 |
| `packages/capacitor-plugin-file-system/src/IFileSystemPlugin.ts` | 플러그인 인터페이스 패턴 |
| `packages/capacitor-plugin-file-system/src/web/FileSystemWeb.ts` | WebPlugin 구현 패턴 |
| `packages/capacitor-plugin-file-system/src/web/VirtualFileSystem.ts` | IndexedDB 래퍼 패턴 |
| `packages/capacitor-plugin-file-system/package.json` | package.json 구조 |
| `.legacy-packages/capacitor-plugin-usb-storage/src/` | 마이그레이션 원본 TypeScript |
| `.legacy-packages/capacitor-plugin-usb-storage/android/` | 마이그레이션 원본 Android |
| `sd.config.ts` | 빌드 설정 (target: "browser" 추가 필요) |

### Technical Decisions

1. **`Buffer` → `Bytes` 변환**: 프로젝트 표준에 따라 Node.js `Buffer` 대신 `Uint8Array` 기반 `Bytes` 타입 사용
2. **Web 에뮬레이션**: 가상 USB 장치를 IndexedDB로 시뮬레이션하여 개발/테스트 지원
3. **Android 코드 유지**: libaums 라이브러리 기반 네이티브 코드는 변경 없이 복사
4. **빌드 타겟**: `browser` (Capacitor 플러그인은 브라우저 환경에서 동작)
5. **Web 권한 에뮬레이션**: 브라우저에서는 실제 USB 없으므로 권한 항상 granted 반환
6. **장치별 파일시스템 격리**: IndexedDB 키 구조 `{vendorId}:{productId}:{path}`로 장치별 데이터 분리
7. **에러 처리 원칙**: 예외(throw) 대신 빈값/undefined 반환으로 일관성 유지
   - 존재하지 않는 장치로 `readdir`/`read` 호출 → 빈 배열 `[]` / `undefined` 반환
   - 존재하지 않는 경로로 `readdir`/`read` 호출 → 빈 배열 `[]` / `undefined` 반환
   - 레거시 Android 동작과 일관성 유지

## Implementation Plan

### Tasks

- [x] **Task 1: 패키지 디렉토리 및 설정 파일 생성**
  - Files:
    - `packages/capacitor-plugin-usb-storage/package.json`
    - `packages/capacitor-plugin-usb-storage/tsconfig.json`
  - Action: `capacitor-plugin-file-system/` 패키지를 참조하여 생성
  - Notes:
    - name: `@simplysm/capacitor-plugin-usb-storage`
    - dependencies: `@simplysm/core-common: workspace:*`
    - peerDependencies/devDependencies: `@capacitor/core: ^7.4.4`
    - capacitor.android.src: `android`
    - tsconfig.json은 기존 패키지 패턴 따름 (실제로는 불필요하여 생성 안 함)

- [x] **Task 2: Android 네이티브 코드 복사**
  - File: `packages/capacitor-plugin-usb-storage/android/`
  - Action: `.legacy-packages/capacitor-plugin-usb-storage/android/` 전체 복사
  - Notes: 변경 없이 그대로 복사 (build.gradle, AndroidManifest.xml, UsbStoragePlugin.java)

- [x] **Task 3: IUsbStoragePlugin.ts 마이그레이션**
  - File: `packages/capacitor-plugin-usb-storage/src/IUsbStoragePlugin.ts`
  - Action: 레거시에서 복사, 인터페이스는 그대로 유지
  - Notes: `IUsbDeviceInfo`, `IUsbDeviceFilter`, `IUsbStoragePlugin` 인터페이스 정의

- [x] **Task 4: VirtualUsbStorage.ts 생성**
  - File: `packages/capacitor-plugin-usb-storage/src/web/VirtualUsbStorage.ts`
  - Action: `VirtualFileSystem.ts` 패턴을 참조하여 가상 USB 저장소 클래스 생성
  - Notes:
    - IndexedDB 기반 가상 파일 시스템
    - **데이터 모델 설계:**
      - DB 이름: `capacitor_usb_virtual_storage`
      - Object Store 1: `devices` - 가상 USB 장치 목록 (key: `{vendorId}:{productId}`)
      - Object Store 2: `files` - 파일/디렉토리 (key: `{vendorId}:{productId}:{path}`)
    - **인터페이스:**
      ```typescript
      interface VirtualDevice {
        key: string;  // "{vendorId}:{productId}" - keyPath
        vendorId: number;
        productId: number;
        deviceName: string;
        manufacturerName: string;
        productName: string;
      }
      interface VirtualEntry {
        fullKey: string;  // "{vendorId}:{productId}:{path}" - keyPath (복합 키)
        deviceKey: string;  // "{vendorId}:{productId}"
        path: string;
        kind: "file" | "dir";
        dataBase64?: string;
      }
      ```
    - **메서드:**
      - `addDevice(device: VirtualDevice): Promise<void>`
      - `getDevices(): Promise<VirtualDevice[]>`
      - `getEntry(deviceKey: string, path: string): Promise<VirtualEntry | undefined>`
      - `putEntry(entry: VirtualEntry): Promise<void>`
      - `listChildren(deviceKey: string, dirPath: string): Promise<string[]>` - 파일/폴더 이름 배열 반환
      - `ensureDir(deviceKey: string, dirPath: string): Promise<void>`

- [x] **Task 5: UsbStorageWeb.ts 마이그레이션**
  - File: `packages/capacitor-plugin-usb-storage/src/web/UsbStorageWeb.ts`
  - Action: 레거시 코드를 IndexedDB 기반 에뮬레이션으로 재작성
  - Notes:
    - `WebPlugin` 상속
    - `VirtualUsbStorage` 사용하여 가상 USB 장치 에뮬레이션
    - alert 대신 실제 가상 데이터 반환
    - **권한 에뮬레이션:**
      - `requestPermission()`: 항상 `{ granted: true }` 반환 (실제 USB 없음)
      - `hasPermission()`: 항상 `{ granted: true }` 반환
    - `bytesToBase64`/`bytesFromBase64` 사용

- [x] **Task 6: UsbStorage.ts 마이그레이션**
  - File: `packages/capacitor-plugin-usb-storage/src/UsbStorage.ts`
  - Action: 레거시 코드에서 `Buffer` → `Bytes` 변환
  - Notes:
    - `import type { Bytes } from "@simplysm/core-common"`
    - `import { bytesFromBase64 } from "@simplysm/core-common"`
    - `read()` 반환 타입: `Buffer | undefined` → `Bytes | undefined`
    - `Buffer.from(data, "base64")` → `bytesFromBase64(data)`

- [x] **Task 7: index.ts 생성**
  - File: `packages/capacitor-plugin-usb-storage/src/index.ts`
  - Action: export 파일 생성
  - Notes:
    ```typescript
    export * from "./IUsbStoragePlugin";
    export * from "./UsbStorage";
    ```

- [x] **Task 8: sd.config.ts 빌드 설정 추가**
  - File: `sd.config.ts`
  - Action: `capacitor-plugin-usb-storage` 패키지 설정 추가
  - Notes:
    ```typescript
    "capacitor-plugin-usb-storage": { target: "browser" },
    ```

- [x] **Task 9: 빌드 및 검증**
  - Action:
    ```bash
    pnpm install
    pnpm build capacitor-plugin-usb-storage
    pnpm typecheck packages/capacitor-plugin-usb-storage
    pnpm lint packages/capacitor-plugin-usb-storage
    ```
  - Notes: 빌드, 타입체크, 린트 모두 통과 확인

### Acceptance Criteria

- [x] **AC 1**: Given 패키지가 생성되었을 때, When `pnpm typecheck packages/capacitor-plugin-usb-storage` 실행, Then 타입 에러 없이 통과
- [x] **AC 2**: Given 패키지가 생성되었을 때, When `pnpm build capacitor-plugin-usb-storage` 실행, Then 빌드 성공 및 `dist/` 디렉토리에 결과물 생성
- [x] **AC 3**: Given Web 환경에서, When `UsbStorage.getDevices()` 호출, Then 가상 USB 장치 목록 반환 (빈 배열 또는 mock 데이터)
- [x] **AC 4**: Given Web 환경에서 가상 장치가 등록되었을 때, When `UsbStorage.readdir(filter, path)` 호출, Then 해당 경로의 파일/폴더 목록 반환
- [x] **AC 5**: Given Web 환경에서 가상 파일이 존재할 때, When `UsbStorage.read(filter, path)` 호출, Then `Bytes` (Uint8Array) 타입으로 파일 데이터 반환
- [x] **AC 6**: Given `UsbStorage.read()` 결과가 있을 때, When 반환 타입 확인, Then `Bytes | undefined` 타입 (Buffer가 아님)
- [x] **AC 7**: Given Android 빌드 환경에서, When Capacitor 앱 빌드, Then 플러그인이 정상적으로 포함되고 libaums 라이브러리 의존성 해결
- [x] **AC 8**: Given 패키지가 생성되었을 때, When `pnpm lint packages/capacitor-plugin-usb-storage` 실행, Then 린트 에러 없이 통과

## Additional Context

### Dependencies

**NPM 패키지:**
- `@simplysm/core-common`: workspace:* (Bytes 유틸리티)
- `@capacitor/core`: ^7.4.4 (peer/dev dependency)

**Android:**
- `me.jahnen.libaums:core:0.9.1` (USB Mass Storage 접근)

**빌드 도구:**
- pnpm workspace
- sd.config.ts 빌드 시스템

### Testing Strategy

**자동 테스트:**
- 현재 capacitor 플러그인 테스트 패턴 없음
- 필요 시 Web 구현에 대한 단위 테스트 추가 가능 (vitest browser 환경)

**수동 테스트:**
1. **CLI 검증 (AC 1, 2, 8):**
   ```bash
   pnpm build capacitor-plugin-usb-storage  # dist/ 생성 확인
   pnpm typecheck packages/capacitor-plugin-usb-storage  # 에러 없음
   pnpm lint packages/capacitor-plugin-usb-storage  # 에러 없음
   ```

2. **Web 에뮬레이션 검증 (AC 3~6):**
   - solid-demo에서 테스트 페이지 생성 또는 브라우저 콘솔에서 직접 테스트:
   ```typescript
   import { UsbStorage } from "@simplysm/capacitor-plugin-usb-storage";

   // AC 3: 장치 목록
   const devices = await UsbStorage.getDevices();
   console.log(devices);  // [] 또는 mock 데이터

   // AC 5, 6: 파일 읽기 (가상 데이터 등록 후)
   const data = await UsbStorage.read({ vendorId: 1, productId: 1 }, "/test.txt");
   console.log(data instanceof Uint8Array);  // true
   ```

3. **Android 검증 (AC 7):**
   - Capacitor 앱 프로젝트에서 플러그인 추가 후 빌드 성공 확인
   - (실제 USB 장치 테스트는 물리적 환경 필요)

### Notes

**타입 변경 사항:**
- 레거시 `read()` 반환: `Buffer | undefined`
- 신규 `read()` 반환: `Bytes | undefined`
- 기존 사용처에서 `Buffer` 의존 코드가 있다면 `Bytes`로 수정 필요

**Web 에뮬레이션 한계:**
- 실제 USB 장치 접근 불가 (브라우저 제약)
- 개발/테스트용 가상 데이터로만 동작
- `VirtualUsbStorage`에 mock 데이터 추가하여 테스트 가능

**향후 고려사항 (Out of Scope):**
- iOS 지원 (현재 Android만 지원)
- 파일 쓰기 기능
- USB 장치 연결/해제 이벤트 리스너
