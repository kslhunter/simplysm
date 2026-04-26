# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/capacitor-plugin-file-system/README.md`를 참조한다.

## Package Overview

- 패키지명: `@simplysm/capacitor-plugin-file-system`
- 설명: Capacitor 파일 시스템 접근 플러그인. Android 네이티브 구현과 브라우저 IndexedDB 기반 웹 구현을 제공한다.
- 소스 파일 수: TypeScript 5개, Android Kotlin 2개, Android XML 2개
- 공개 진입점: `src/index.ts`
- 주요 런타임 의존성: `@capacitor/core`, `@simplysm/core-common`, `@simplysm/core-browser`

## Architecture

```text
src/
  index.ts                    # 공개 export 진입점
  FileSystem.ts               # 소비자용 static facade
  FileSystemPlugin.ts         # Capacitor plugin contract 및 공개 타입
  web/
    FileSystemWeb.ts          # WebPlugin 구현체
    VirtualFileSystem.ts      # IndexedDB 기반 가상 파일 시스템 래퍼

android/src/main/
  kotlin/.../FileSystemPlugin.kt    # Android Capacitor plugin 구현체
  kotlin/.../FileSystemProvider.kt  # FileProvider 클래스
  AndroidManifest.xml               # 저장소 권한 및 FileProvider 등록
  res/xml/file_provider_paths.xml   # FileProvider 허용 경로
```

`FileSystem`은 소비자 코드가 사용하는 유일한 facade이다. 네이티브와 웹 구현의 원시 응답 객체는 `FileSystemPlugin` 계약에 남기고, `FileSystem`에서 `boolean`, `string`, `Bytes`, `FileInfo[]`처럼 소비하기 쉬운 타입으로 변환한다.

## Key Patterns

### Capacitor plugin facade

`FileSystem.ts`는 `registerPlugin<FileSystemPlugin>("FileSystem", ...)`로 네이티브 플러그인을 등록하고, 웹 환경에서만 `FileSystemWeb`을 동적 로드한다. 공개 메서드는 모두 static 메서드이며 원시 plugin call option 객체를 소비자에게 노출하지 않는다.

```typescript
static async readdir(dirPath: string): Promise<FileInfo[]> {
  const result = await fileSystemPlugin.readdir({ path: dirPath });
  return result.files;
}
```

### 문자열과 바이트 데이터 분기

`writeFile`은 `string` 데이터를 `utf8`로, `Bytes` 데이터를 Base64로 전달한다. `readFile`은 오버로드로 반환 타입을 구분하며, `encoding`을 생략하면 `Bytes`, `"utf8"`을 지정하면 `string`을 반환한다.

```typescript
static async readFile(filePath: string): Promise<Bytes>;
static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
```

바이트 판별은 `instanceof Uint8Array`가 아니라 `typeof data !== "string"` 분기로 처리한다. cross-realm 환경에서도 `Bytes` 호환 값을 안전하게 다루기 위한 패턴이다.

### Web implementation

웹 구현은 `WebPlugin`을 상속하고 `VirtualFileSystem("capacitor_web_virtual_fs")`를 사용한다. 저장소 경로는 `/webfs/{type}` 형식의 가상 경로로 만들고, `getUri`는 파일 데이터를 `Blob`으로 변환한 뒤 `URL.createObjectURL`을 반환한다.

`VirtualFileSystem`은 `IndexedDbStore`와 `IndexedDbVirtualFs`를 감싼 얇은 래퍼이다. `listChildren`은 명시적 디렉토리 entry가 없어도 파일 경로에서 중간 디렉토리를 추론할 수 있는 core-browser 동작에 의존한다.

### Android implementation

Android 구현은 API 레벨별 권한 흐름을 분기한다.

- Android 11 이상: `Environment.isExternalStorageManager()`와 `Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`
- Android 10 이하: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` 런타임 권한 요청

`getUri`는 `${applicationId}.filesystem.provider` authority를 사용한다. `AndroidManifest.xml`과 `file_provider_paths.xml`을 함께 유지해야 FileProvider URI 생성이 동작한다.

## Package-specific Settings

`tsconfig.json`은 루트 설정을 상속하고 패키지 고유 옵션으로 DOM 라이브러리와 패키지 local type root를 추가한다.

```json
{
  "lib": ["ESNext", "DOM", "DOM.Iterable"],
  "outDir": "./dist",
  "typeRoots": ["./node_modules/@types"]
}
```
