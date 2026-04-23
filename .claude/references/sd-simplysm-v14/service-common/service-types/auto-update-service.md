# AutoUpdateService

클라이언트 애플리케이션의 최신 버전 정보를 조회하는 서비스 인터페이스.

```typescript
export interface AutoUpdateService {
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}
```

## Members

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getLastVersion` | `platform: string` | `Promise<{ version: string; downloadPath: string } \| undefined>` | 지정된 플랫폼의 최신 버전 정보 조회. 버전이 없으면 `undefined` |

`platform` 예시: `"win32"`, `"darwin"`, `"linux"`
