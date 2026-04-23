# AutoUpdateService

자동 업데이트 서비스 정의. `defineService("AutoUpdate", (ctx) => ...)`로 정의되어 있다. 인증 불필요.

## When to use

- ✅ 클라이언트 앱(Android APK / Windows EXE)의 자동 업데이트를 서버에서 제공할 때
- ❌ 웹 클라이언트 업데이트에는 사용하지 않는다 — 웹은 브라우저 캐시/서비스 워커로 처리한다

```typescript
const AutoUpdateService: ServiceDefinition;
```

## Members

| Method | Signature | Description |
|--------|-----------|-------------|
| `getLastVersion` | `(platform: string) => Promise<{ version: string; downloadPath: string } \| undefined>` | `{clientPath}/{platform}/updates/` 디렉토리에서 최신 버전 파일을 찾아 반환한다 |

`getLastVersion` 동작:
- `platform`이 `"android"`이면 `.apk` 파일을, 그 외에는 `.exe` 파일을 탐색한다
- 파일명이 `{version}.{ext}` 형식이어야 하며 (예: `1.2.3.apk`), `semver.maxSatisfying`으로 최대 버전을 결정한다
- `clientPath`가 없으면 에러를 던진다
- 업데이트 디렉토리나 매칭 파일이 없으면 `undefined`를 반환한다

## Related Types

### `AutoUpdateServiceType`

`AutoUpdateService`의 메서드 시그니처 타입.

```typescript
type AutoUpdateServiceType = ServiceMethods<typeof AutoUpdateService>;
```
