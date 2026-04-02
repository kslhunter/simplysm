# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/capacitor-plugin-file-system` — Android 파일 시스템 접근 플러그인. 외부 저장소 전체 접근 및 앱 전용 디렉토리 접근을 제공하며, 브라우저 환경에서는 IndexedDB 기반 가상 파일 시스템으로 에뮬레이션한다. TypeScript 소스 5개 파일.

의존성:
- `@simplysm/core-browser` — `IndexedDbStore`, `IndexedDbVirtualFs`, `VirtualFsEntry`
- `@simplysm/core-common` — `bytes` (Base64 변환), `Bytes` 타입

## Architecture

```
src/
├── FileSystemPlugin.ts    ← Capacitor 플러그인 인터페이스 및 타입 (StorageType, FileInfo, FileSystemPlugin)
├── FileSystem.ts          ← 플러그인 등록 및 정적 파사드 클래스
├── web/
│   ├── FileSystemWeb.ts   ← 브라우저 폴백 (WebPlugin 상속, VirtualFileSystem 사용)
│   └── VirtualFileSystem.ts ← IndexedDB 기반 가상 파일 시스템 어댑터
└── index.ts               ← public API re-exports
android/
└── src/main/kotlin/kr/co/simplysm/capacitor/filesystem/
    ├── FileSystemPlugin.kt   ← Android 네이티브 구현 (Kotlin)
    └── FileSystemProvider.kt ← FileProvider 설정
```

## Key Patterns

### 레이어 구조 (이 패키지의 표준 패턴)

플러그인은 항상 3계층으로 구성된다:

1. **`*Plugin.ts`** — Capacitor 플러그인 인터페이스와 타입만 정의 (로직 없음)
2. **`*.ts` (파사드)** — `registerPlugin()`으로 플러그인을 등록하고, `abstract class`로 정적 메서드를 노출
3. **`web/*.ts`** — `WebPlugin`을 상속하는 브라우저 폴백

```typescript
// 1. 플러그인 인터페이스 (FileSystemPlugin.ts)
export interface FileSystemPlugin {
  readdir(options: { path: string }): Promise<{ files: FileInfo[] }>;
  writeFile(options: { path: string; data: string; encoding?: "utf8" | "base64" }): Promise<void>;
}

// 2. 파사드 (FileSystem.ts)
const fileSystemPlugin = registerPlugin<FileSystemPlugin>("FileSystem", {
  web: async () => {
    const { FileSystemWeb } = await import("./web/FileSystemWeb");
    return new FileSystemWeb();
  },
});

export abstract class FileSystem {
  static async readdir(dirPath: string): Promise<FileInfo[]> {
    const result = await fileSystemPlugin.readdir({ path: dirPath });
    return result.files;
  }
}
```

### Bytes 파일 읽기/쓰기

파일 데이터를 `Bytes`(Uint8Array)로 주고받을 때는 Base64를 중간 포맷으로 사용한다. `bytes.toBase64()`로 인코딩하여 플러그인에 전달하고, 플러그인에서 받은 Base64 문자열을 `bytes.fromBase64()`로 디코딩한다.

```typescript
// 쓰기: Bytes → Base64 → 플러그인
await fileSystemPlugin.writeFile({ path, data: bytes.toBase64(data), encoding: "base64" });

// 읽기: 플러그인 → Base64 → Bytes
const result = await fileSystemPlugin.readFile({ path, encoding: "base64" });
return bytes.fromBase64(result.data);
```

### 오버로드 패턴

`readFile()`은 `encoding` 파라미터에 따라 반환 타입이 달라지는 오버로드 시그니처를 사용한다:

```typescript
static async readFile(filePath: string): Promise<Bytes>;
static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
```

### VirtualFileSystem (브라우저 어댑터)

`VirtualFileSystem`은 `core-browser`의 `IndexedDbVirtualFs`를 파사드로 감싼다. IndexedDB 스토어명 `"capacitor_web_virtual_fs"`를 사용하며, `StorageType`별 경로는 `/webfs/{type}` 패턴으로 매핑한다.

`getUri()`가 반환하는 Blob URL은 사용 후 반드시 `URL.revokeObjectURL(uri)`로 해제해야 한다(메모리 누수 방지). 이 동작을 변경하거나 제거하지 않는다.

### StorageType 매핑

| TypeScript `StorageType` | Android 경로 |
|---|---|
| `external` | `Environment.getExternalStorageDirectory()` |
| `externalFiles` | `getExternalFilesDir(null)` |
| `externalCache` | `externalCacheDir` |
| `externalMedia` | `externalMediaDirs[0]` |
| `appData` | `applicationInfo.dataDir` |
| `appFiles` | `filesDir` |
| `appCache` | `cacheDir` |

## Android 네이티브

- 파일: `android/src/main/kotlin/kr/co/simplysm/capacitor/filesystem/FileSystemPlugin.kt`
- 권한:
  - Android 11+(API 30+): `MANAGE_EXTERNAL_STORAGE` — 설정 화면으로 이동하여 수동 허용
  - Android 10-(API 29-): `READ_EXTERNAL_STORAGE` + `WRITE_EXTERNAL_STORAGE` — 권한 대화상자
- `getUri()`: FileProvider authority는 `{packageName}.filesystem.provider`를 사용한다. `res/xml/file_provider_paths.xml`에 경로 설정이 필요하다.
- `remove()`: `deleteRecursively()` 재귀 삭제 구현을 사용한다.

## 컴파일러 설정 (패키지 고유)

`tsconfig.json`에 `"lib": ["ESNext", "DOM", "DOM.Iterable"]`이 설정되어 있다. `TextEncoder`, `TextDecoder`, `Blob`, `URL.createObjectURL` 등 DOM API를 직접 사용하므로 DOM lib가 필수다.
