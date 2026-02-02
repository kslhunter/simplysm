---
title: 'Capacitor FileSystem Plugin Migration'
slug: 'capacitor-plugin-file-system-migration'
created: '2026-02-02'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript
  - Capacitor 7
  - Android (Java)
  - IndexedDB (Web fallback)
files_to_modify:
  - packages/core-common/src/utils/bytes.ts
  - packages/core-common/src/index.ts
  - packages/capacitor-plugin-file-system/src/index.ts
  - packages/capacitor-plugin-file-system/src/FileSystem.ts
  - packages/capacitor-plugin-file-system/src/IFileSystemPlugin.ts
  - packages/capacitor-plugin-file-system/src/web/FileSystemWeb.ts
  - packages/capacitor-plugin-file-system/src/web/VirtualFileSystem.ts
  - packages/capacitor-plugin-file-system/package.json
  - sd.config.ts
code_patterns:
  - Bytes 타입 사용 (Uint8Array)
  - bytesToBase64/bytesFromBase64 유틸 사용 (순수 JS, neutral 호환)
  - ESM 모듈 시스템
test_patterns:
  - core-common 단위 테스트
---

# Tech-Spec: Capacitor FileSystem Plugin Migration

**Created:** 2026-02-02

## Overview

### Problem Statement

레거시 구조(`.legacy-packages/`)에 있는 `capacitor-plugin-file-system` 플러그인을 현재 모노레포 `packages/` 구조로 마이그레이션해야 함. 레거시 코드는 Node.js `Buffer`와 `path` 모듈을 사용하고 있어 프로젝트 컨벤션에 맞지 않음.

### Solution

플러그인을 `packages/capacitor-plugin-file-system`으로 이동하고, `Bytes`(Uint8Array) 타입 및 base64 유틸 사용, 브라우저 호환 코드로 변환, 현재 빌드 시스템(sd.config.ts)에 통합.

### Scope

**In Scope:**
- core-common에 base64 유틸리티 추가 (bytesToBase64, bytesFromBase64) - 순수 JS 구현
- TypeScript 소스 마이그레이션 (Buffer → Bytes, path → 브라우저 호환)
- VirtualFileSystem.listChildren 버그 수정
- Android 네이티브 코드 그대로 유지
- package.json 업데이트 (버전 13.0.0-beta.0)
- sd.config.ts에 빌드 타겟 추가

**Out of Scope:**
- iOS 플러그인 구현 (현재 없음)
- 새로운 기능 추가
- Android 코드 수정

## Context for Development

### Codebase Patterns

- `@simplysm/core-common`의 `Bytes` 타입 사용 (`type Bytes = Uint8Array`)
- `@simplysm/core-common`의 `bytesToBase64`, `bytesFromBase64` 유틸 사용 (순수 JS, btoa/atob 미사용)
- 메서드 네이밍: `readFileBytesAsync` 형식
- 브라우저 타겟: DOM API만 사용, Node.js 모듈 금지
- ESM 모듈 시스템 (`"type": "module"`)
- 에러는 명확한 메시지와 함께 `Error`를 throw

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.legacy-packages/capacitor-plugin-file-system/src/FileSystem.ts` | 마이그레이션 원본 - Buffer 사용 (71, 97-99행) |
| `.legacy-packages/capacitor-plugin-file-system/src/web/FileSystemWeb.ts` | 마이그레이션 원본 - path 모듈 사용 (4, 75행) |
| `.legacy-packages/capacitor-plugin-file-system/src/web/VirtualFileSystem.ts` | 마이그레이션 원본 - listChildren 버그 (111-112행) |
| `.legacy-packages/capacitor-plugin-file-system/android/` | Android 네이티브 코드 (그대로 복사) |
| `packages/core-common/src/utils/bytes.ts` | base64 유틸 추가 위치 |
| `packages/core-common/src/common.types.ts` | `Bytes` 타입 정의 (11행) |

### Technical Decisions

1. **base64 유틸을 core-common에 추가 (순수 JS 구현)**
   - `btoa`/`atob` 미사용 (neutral 타겟 호환 - Node.js/Browser 모두 동작)
   - 대용량 파일 안전 (문자열 연결 방식)
   - 디코딩 성능 최적화: 룩업 테이블 사용 (O(1) 조회)
   - 재사용 가능, 테스트 용이
   - 네이밍: `bytesToBase64`, `bytesFromBase64` (기존 `bytesToHex`, `bytesFromHex` 패턴)
   - 유효하지 않은 base64 입력 시 `ArgumentError` throw
   - 빈 입력 안전 처리 (빈 배열/문자열)

2. **Buffer → Bytes 변환**
   - `Buffer.isBuffer(data)` → `data instanceof Uint8Array`
   - `data.toString("base64")` → `bytesToBase64(data)`
   - `Buffer.from(result.data, "base64")` → `bytesFromBase64(result.data)`

3. **path.dirname() 대체**
   - 인라인 문자열 처리: `path.lastIndexOf("/")`

4. **메서드명 변경**
   - `readFileBufferAsync()` → `readFileBytesAsync()`
   - `writeFileAsync(data: string | Buffer)` → `writeFileAsync(data: string | Bytes)`

5. **VirtualFileSystem.listChildren 버그 수정**
   - `rest.includes("/")` 체크로 중첩 디렉토리 정확히 판별
   - trailing slash 처리: `rest`에서 빈 문자열 세그먼트 무시

6. **에러 처리**
   - 모든 에러는 명확한 메시지와 함께 `Error` throw
   - 파일 경로, 작업 종류를 에러 메시지에 포함

## Implementation Plan

### Tasks

- [x] Task 1: core-common에 base64 유틸리티 추가
  - File: `packages/core-common/src/utils/bytes.ts`
  - Action: 다음 함수 추가 (순수 JS, btoa/atob 미사용, 룩업 테이블로 성능 최적화)
    ```typescript
    /** base64 인코딩 테이블 */
    const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    /** base64 디코딩 룩업 테이블 (O(1) 조회) */
    const BASE64_LOOKUP: number[] = Array.from({ length: 128 }, (_, i) => {
      const idx = BASE64_CHARS.indexOf(String.fromCharCode(i));
      return idx === -1 ? 0 : idx;
    });

    /**
     * Bytes를 base64 문자열로 변환
     * @param bytes 변환할 Uint8Array
     * @returns base64 인코딩된 문자열
     * @example
     * bytesToBase64(new Uint8Array([72, 101, 108, 108, 111]));
     * // "SGVsbG8="
     */
    export function bytesToBase64(bytes: Bytes): string {
      let result = "";
      const len = bytes.length;
      for (let i = 0; i < len; i += 3) {
        const b1 = bytes[i];
        const b2 = i + 1 < len ? bytes[i + 1] : 0;
        const b3 = i + 2 < len ? bytes[i + 2] : 0;
        result += BASE64_CHARS[b1 >> 2];
        result += BASE64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
        result += i + 1 < len ? BASE64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : "=";
        result += i + 2 < len ? BASE64_CHARS[b3 & 63] : "=";
      }
      return result;
    }

    /**
     * base64 문자열을 Bytes로 변환
     * @param base64 변환할 base64 문자열
     * @returns 디코딩된 Uint8Array
     * @throws {ArgumentError} 유효하지 않은 base64 문자가 포함된 경우
     * @example
     * bytesFromBase64("SGVsbG8=");
     * // Uint8Array([72, 101, 108, 108, 111])
     */
    export function bytesFromBase64(base64: string): Bytes {
      // 공백 제거 및 패딩 정규화
      const cleanBase64 = base64.replace(/\s/g, "").replace(/=+$/, "");

      // 빈 문자열 처리
      if (cleanBase64.length === 0) {
        return new Uint8Array(0);
      }

      // 유효성 검사
      if (!/^[A-Za-z0-9+/]+$/.test(cleanBase64)) {
        throw new ArgumentError("유효하지 않은 base64 문자가 포함되어 있습니다", { base64: base64.substring(0, 20) });
      }

      const len = cleanBase64.length;
      const byteLen = Math.floor((len * 3) / 4);
      const bytes = new Uint8Array(byteLen);

      let byteIdx = 0;
      for (let i = 0; i < len; i += 4) {
        const c1 = BASE64_LOOKUP[cleanBase64.charCodeAt(i)];
        const c2 = i + 1 < len ? BASE64_LOOKUP[cleanBase64.charCodeAt(i + 1)] : 0;
        const c3 = i + 2 < len ? BASE64_LOOKUP[cleanBase64.charCodeAt(i + 2)] : 0;
        const c4 = i + 3 < len ? BASE64_LOOKUP[cleanBase64.charCodeAt(i + 3)] : 0;

        bytes[byteIdx++] = (c1 << 2) | (c2 >> 4);
        if (byteIdx < byteLen) bytes[byteIdx++] = ((c2 & 15) << 4) | (c3 >> 2);
        if (byteIdx < byteLen) bytes[byteIdx++] = ((c3 & 3) << 6) | c4;
      }

      return bytes;
    }
    ```
  - File: `packages/core-common/src/index.ts`
  - Action: export 확인 (이미 `export * from "./utils/bytes"` 있으면 자동 포함)

- [x] Task 2: 패키지 디렉토리 구조 생성
  - Action: `packages/capacitor-plugin-file-system/` 디렉토리 생성
  - Subfolders: `src/`, `src/web/`, `android/`

- [x] Task 3: Android 네이티브 코드 복사
  - Source: `.legacy-packages/capacitor-plugin-file-system/android/`
  - Target: `packages/capacitor-plugin-file-system/android/`
  - Action: 전체 디렉토리 그대로 복사 (변경 없음)

- [x] Task 4: package.json 생성
  - File: `packages/capacitor-plugin-file-system/package.json`
  - Action: 레거시 package.json 기반으로 생성
  - Changes:
    - `version`: `"13.0.0-beta.0"`
    - `dependencies` 추가: `"@simplysm/core-common": "workspace:*"`
    - 나머지 구조 유지

- [x] Task 5: IFileSystemPlugin.ts 복사
  - Source: `.legacy-packages/capacitor-plugin-file-system/src/IFileSystemPlugin.ts`
  - Target: `packages/capacitor-plugin-file-system/src/IFileSystemPlugin.ts`
  - Action: 그대로 복사 (변경 없음)

- [x] Task 6: VirtualFileSystem.ts 마이그레이션
  - Source: `.legacy-packages/capacitor-plugin-file-system/src/web/VirtualFileSystem.ts`
  - Target: `packages/capacitor-plugin-file-system/src/web/VirtualFileSystem.ts`
  - Changes:
    - 106-115행 버그 수정 (listChildren 내부):
      ```typescript
      // Before
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        if (rest) {
          const firstSeg = rest.split("/")[0];
          if (firstSeg && !map.has(firstSeg)) {
            const value = cursor.value as FsEntry;
            map.set(firstSeg, value.kind === "dir");
          }
        }
      }

      // After
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        if (rest) {
          const segments = rest.split("/").filter(Boolean); // 빈 세그먼트 제거 (trailing slash 대응)
          if (segments.length > 0) {
            const firstSeg = segments[0];
            if (!map.has(firstSeg)) {
              // 하위 경로가 더 있으면 디렉토리, 없으면 엔트리 타입 따름
              const isDir = segments.length > 1 || (cursor.value as FsEntry).kind === "dir";
              map.set(firstSeg, isDir);
            }
          }
        }
      }
      ```

- [x] Task 7: FileSystemWeb.ts 마이그레이션
  - Source: `.legacy-packages/capacitor-plugin-file-system/src/web/FileSystemWeb.ts`
  - Target: `packages/capacitor-plugin-file-system/src/web/FileSystemWeb.ts`
  - Changes:
    - 1행: import 추가 `import { bytesToBase64 } from "@simplysm/core-common";`
    - 4행: `import path from "path";` 삭제
    - 클래스 상단에 TextEncoder 캐시 추가:
      ```typescript
      private readonly _textEncoder = new TextEncoder();
      ```
    - 75-77행: path.dirname 대체 및 UTF-8 안전 base64 변환
      ```typescript
      const idx = options.path.lastIndexOf("/");
      const dir = idx === -1 ? "." : options.path.substring(0, idx) || "/";
      await this._fs.ensureDir(dir);
      const dataBase64 = options.encoding === "base64"
        ? options.data
        : bytesToBase64(this._textEncoder.encode(options.data));
      ```

- [x] Task 8: FileSystem.ts 마이그레이션
  - Source: `.legacy-packages/capacitor-plugin-file-system/src/FileSystem.ts`
  - Target: `packages/capacitor-plugin-file-system/src/FileSystem.ts`
  - Changes:
    - 1행: import 추가
      ```typescript
      import type { Bytes } from "@simplysm/core-common";
      import { bytesToBase64, bytesFromBase64 } from "@simplysm/core-common";
      ```
    - 70행: 시그니처 변경 `data: string | Buffer` → `data: string | Bytes`
    - 71행: `Buffer.isBuffer(data)` → `data instanceof Uint8Array`
    - 73행: `data.toString("base64")` → `bytesToBase64(data)`
    - 95행: 메서드명 변경 `readFileBufferAsync` → `readFileBytesAsync`
    - 96행: JSDoc 수정 "Buffer" → "Bytes"
    - 97행: 반환 타입 `Promise<Buffer>` → `Promise<Bytes>`
    - 99행: `Buffer.from(result.data, "base64")` → `bytesFromBase64(result.data)`

- [x] Task 9: index.ts 복사
  - Source: `.legacy-packages/capacitor-plugin-file-system/src/index.ts`
  - Target: `packages/capacitor-plugin-file-system/src/index.ts`
  - Action: 그대로 복사 (변경 없음)

- [x] Task 10: sd.config.ts 업데이트
  - File: `sd.config.ts`
  - Action: packages 객체에 추가
    ```typescript
    "capacitor-plugin-file-system": { target: "browser" },
    ```

- [x] Task 11: 검증
  - Action: `pnpm install && pnpm typecheck && pnpm lint`
  - Expected: 에러 없음

### Acceptance Criteria

- [x] AC 1: Given 마이그레이션 완료, when `pnpm typecheck` 실행, then 타입 에러 없음
- [x] AC 2: Given 마이그레이션 완료, when `pnpm lint` 실행, then 린트 에러 없음
- [x] AC 3: Given 마이그레이션 완료, when `pnpm build capacitor-plugin-file-system` 실행, then dist/ 폴더에 빌드 결과물 생성
- [x] AC 4: Given `bytesToBase64` 함수에 1MB Uint8Array 전달, when 호출, then 스택 오버플로우 없이 정상 반환 (테스트: `pnpm vitest packages/core-common/tests/bytes.spec.ts --project=node`)
- [x] AC 5: Given UTF-8 한글 문자열 "안녕하세요", when FileSystemWeb.writeFile 호출, then 에러 없이 저장 성공
- [x] AC 6: Given VirtualFileSystem에 "/a/b/c.txt" 저장, when listChildren("/a") 호출, then "b"가 isDirectory: true로 반환
- [x] AC 7: Given 유효하지 않은 base64 "!!invalid!!", when bytesFromBase64 호출, then ArgumentError throw

## Additional Context

### Dependencies

- `@capacitor/core: ^7.4.4` (peerDependency)
- `@simplysm/core-common: workspace:*` (dependency - Bytes 타입 + base64 유틸)

### Testing Strategy

**core-common 단위 테스트 (`packages/core-common/tests/bytes.spec.ts`):**
```typescript
describe("bytesToBase64", () => {
  it("빈 배열", () => {
    expect(bytesToBase64(new Uint8Array([]))).toBe("");
  });

  it("일반 데이터", () => {
    expect(bytesToBase64(new Uint8Array([72, 101, 108, 108, 111]))).toBe("SGVsbG8=");
  });

  it("대용량 데이터 (1MB)", () => {
    const data = new Uint8Array(1024 * 1024);
    expect(() => bytesToBase64(data)).not.toThrow();
  });
});

describe("bytesFromBase64", () => {
  it("빈 문자열", () => {
    expect(bytesFromBase64("")).toEqual(new Uint8Array([]));
  });

  it("일반 데이터", () => {
    expect(bytesFromBase64("SGVsbG8=")).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("유효하지 않은 base64", () => {
    expect(() => bytesFromBase64("!!invalid!!")).toThrow(ArgumentError);
  });
});
```

**수동 테스트:**
1. `pnpm typecheck` - 타입 검증
2. `pnpm lint` - 코드 스타일 검증
3. `pnpm build capacitor-plugin-file-system` - 빌드 검증

### Notes

- Android 네이티브 코드는 변경 없이 그대로 복사
- base64 유틸은 순수 JS 구현 (btoa/atob 미사용) - neutral 타겟 호환
- UTF-8 문자열은 TextEncoder로 Bytes 변환 후 base64 인코딩
- TextEncoder 인스턴스는 FileSystemWeb 클래스에서 재사용
- VirtualFileSystem.listChildren 버그 수정: trailing slash 및 중첩 디렉토리 정확히 처리
