# `path`

> **읽어야 하는 상황**: 브라우저 환경에서 POSIX 경로 결합/파일명 추출/확장자 추출이 필요할 때. Node.js `path` 모듈 대체.

경로 유틸리티 네임스페이스. Node.js `path` 모듈 대체 (브라우저 환경 지원). POSIX 스타일 경로(슬래시 `/`)만 지원한다. Windows 백슬래시(`\`)는 지원하지 않는다.

```typescript
import { path } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `join` | `(...segments: string[]) => string` | 경로 결합 (`path.join` 대체) |
| `basename` | `(filePath: string, ext?: string) => string` | 파일명 추출 (`path.basename` 대체). ext 지정 시 해당 확장자 제거 |
| `extname` | `(filePath: string) => string` | 파일 확장자 추출 (`path.extname` 대체). 숨김 파일(`.gitignore`)은 빈 문자열 반환 |

## Usage

```typescript
import { path } from "@simplysm/core-common";

path.join("/foo", "bar", "baz");  // "/foo/bar/baz"
path.join("/foo/", "/bar/");      // "/foo/bar"

path.basename("/foo/bar/file.txt");         // "file.txt"
path.basename("/foo/bar/file.txt", ".txt"); // "file"

path.extname("/foo/bar/file.txt");  // ".txt"
path.extname("/foo/.gitignore");    // ""
```
