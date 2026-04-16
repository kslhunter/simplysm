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
├── FileSystemPlugin.ts    ← Capacitor 플러그인 인터페이스 및 타입 정의
├── FileSystem.ts          ← 플러그인 등록 및 정적 파사드 클래스 (public API)
├── web/
│   ├── FileSystemWeb.ts   ← 브라우저 폴백 구현 (WebPlugin 상속)
│   └── VirtualFileSystem.ts ← IndexedDB 기반 가상 파일 시스템 어댑터
└── index.ts               ← public API re-exports (FileSystem, FileSystemPlugin, StorageType, FileInfo)
```

## Key Patterns

### 플러그인 아키텍처 (Capacitor 표준)

패키지는 3계층 구조를 따른다:

1. **`FileSystemPlugin.ts`** — Capacitor 플러그인 인터페이스와 타입 정의 (로직 없음)
   - `FileSystemPlugin` interface: 네이티브 메서드 시그니처
   - `StorageType` type: 저장소 유형 (external, externalFiles, externalCache, externalMedia, appData, appFiles, appCache)
   - `FileInfo` interface: 파일 정보 (name, isDirectory)

2. **`FileSystem.ts`** — public API 파사드
   - `registerPlugin()`으로 플러그인 등록 (native 또는 web 구현으로 자동 분기)
   - `abstract class FileSystem`의 정적 메서드로 모든 기능 노출
   - 모든 메서드는 `fileSystemPlugin`를 통해 플러그인 호출

3. **`web/FileSystemWeb.ts`** — 브라우저 폴백 구현
   - `WebPlugin` 상속
   - `FileSystemPlugin` interface 구현
   - `VirtualFileSystem` 사용하여 IndexedDB 기반 에뮬레이션

### 정적 메서드 패턴 (FileSystem.ts)

모든 public API는 `FileSystem` abstract class의 정적 메서드로 제공된다:
- `checkPermissions()` — 권한 확인
- `requestPermissions()` — 권한 요청
- `readdir(dirPath)` — 디렉토리 읽기
- `getStoragePath(type)` — 저장소 경로 조회
- `getUri(filePath)` — 파일 URI 조회 (FileProvider)
- `writeFile(filePath, data)` — 파일 쓰기 (문자열 또는 Bytes 지원)
- `readFile(filePath, encoding?)` — 파일 읽기 (오버로드: 기본값은 Bytes, encoding="utf8" 시 string)
- `remove(targetPath)` — 파일/디렉토리 삭제 (재귀)
- `mkdir(targetPath)` — 디렉토리 생성 (재귀)
- `exists(targetPath)` — 존재 여부 확인

### Bytes 파일 읽기/쓰기 (FileSystem.ts:72-102)

파일 데이터를 `Bytes`(Uint8Array)로 주고받을 때는 Base64를 중간 포맷으로 사용한다. `bytes.toBase64()`로 인코딩하여 플러그인에 전달하고, 플러그인에서 받은 Base64 문자열을 `bytes.fromBase64()`로 디코딩한다.

```typescript
// writeFile 예: string vs Bytes 자동 선택
static async writeFile(filePath: string, data: string | Bytes): Promise<void> {
  if (typeof data !== "string") {
    // Bytes → Base64 → 플러그인 (encoding: "base64")
    await fileSystemPlugin.writeFile({
      path: filePath,
      data: bytes.toBase64(data),
      encoding: "base64",
    });
  } else {
    // string → 플러그인 (encoding: "utf8")
    await fileSystemPlugin.writeFile({ path: filePath, data, encoding: "utf8" });
  }
}

// readFile 예: 오버로드에 따라 반환 타입 결정
static async readFile(filePath: string): Promise<Bytes>;
static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
static async readFile(filePath: string, encoding?: "utf8"): Promise<string | Bytes> {
  if (encoding === "utf8") {
    // string 반환
    const result = await fileSystemPlugin.readFile({ path: filePath, encoding: "utf8" });
    return result.data;
  } else {
    // Bytes 반환 (Base64 → Bytes)
    const result = await fileSystemPlugin.readFile({ path: filePath, encoding: "base64" });
    return bytes.fromBase64(result.data);
  }
}
```

### 오버로드 시그니처 (FileSystem.ts:92-94)

`readFile()`은 `encoding` 파라미터에 따라 반환 타입이 변하는 오버로드를 구현한다:
- `readFile(filePath)` → `Promise<Bytes>` (기본)
- `readFile(filePath, "utf8")` → `Promise<string>` (문자열 명시 시)

### VirtualFileSystem (웹 폴백 어댑터)

`VirtualFileSystem` class는 `core-browser`의 `IndexedDbVirtualFs`를 파사드로 감싼다:
- IndexedDB 저장소: `"capacitor_web_virtual_fs"` (생성자 파라미터로 지정)
- 스토어명: `"entries"` (고정)
- 경로 키: `"path"` (고정)
- 저장소 유형별 경로: `/webfs/{type}` 패턴 (예: `/webfs/externalFiles`, `/webfs/appCache`)

**메서드:**
- `getEntry(filePath)` — 단일 항목 조회 (파일 또는 디렉토리)
- `putEntry(entry)` — 항목 저장 (path, kind, dataBase64)
- `listChildren(dirPath)` — 디렉토리의 직접 하위 항목 목록 (암시적 디렉토리 지원)
- `ensureDir(dirPath)` — 디렉토리 생성 (상위 경로 자동 생성)
- `deleteByPrefix(pathPrefix)` — 경로 프리픽스로 삭제 (재귀)

**Blob URL 관리 (FileSystemWeb.ts:34-44):**
`getUri()`가 반환하는 Blob URL은 사용 후 반드시 `URL.revokeObjectURL(uri)`로 해제해야 한다(메모리 누수 방지). 이 동작을 변경하거나 제거하지 않는다.

### FileSystemWeb 구현 패턴 (web/FileSystemWeb.ts)

모든 메서드는 `FileSystemPlugin` interface를 구현하고, 내부적으로 `VirtualFileSystem`을 사용한다:
- `TextEncoder` / `TextDecoder` 인스턴스를 사용하여 string ↔ Uint8Array 변환
- 모든 바이너리 데이터는 IndexedDB에 Base64로 저장
- 에러 발생 시 명확한 에러 메시지와 함께 throw

### StorageType 매핑 (FileSystem.ts:46-59)

| TypeScript `StorageType` | Android 경로 | 웹 경로 |
|---|---|---|
| `external` | `Environment.getExternalStorageDirectory()` | `/webfs/external` |
| `externalFiles` | `getExternalFilesDir(null)` | `/webfs/externalFiles` |
| `externalCache` | `externalCacheDir` | `/webfs/externalCache` |
| `externalMedia` | `externalMediaDirs[0]` | `/webfs/externalMedia` |
| `appData` | `applicationInfo.dataDir` | `/webfs/appData` |
| `appFiles` | `filesDir` | `/webfs/appFiles` |
| `appCache` | `cacheDir` | `/webfs/appCache` |

## Android 네이티브

- 파일: `android/src/main/kotlin/kr/co/simplysm/capacitor/filesystem/FileSystemPlugin.kt`
- 권한:
  - Android 11+(API 30+): `MANAGE_EXTERNAL_STORAGE` — 설정 화면으로 이동하여 수동 허용
  - Android 10-(API 29-): `READ_EXTERNAL_STORAGE` + `WRITE_EXTERNAL_STORAGE` — 권한 대화상자
- `getUri()`: FileProvider authority는 `{packageName}.filesystem.provider`를 사용한다. `res/xml/file_provider_paths.xml`에 경로 설정이 필요하다.
- `remove()`: `deleteRecursively()` 재귀 삭제 구현을 사용한다.

## 컴파일러 설정 (패키지 고유)

`tsconfig.json`에 `"lib": ["ESNext", "DOM", "DOM.Iterable"]`이 설정되어 있다. `TextEncoder`, `TextDecoder`, `Blob`, `URL.createObjectURL` 등 DOM API를 직접 사용하므로 DOM lib가 필수다.
