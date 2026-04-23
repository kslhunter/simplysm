# SdBrowserSupportConfig

클라이언트 패키지의 브라우저 지원 설정. [`SdClientPackageConfig`](./sd-client-package-config.md)의 `browserSupport` 필드에 사용한다.

```typescript
export interface SdBrowserSupportConfig {
  browserslist?: string | string[];
  postCss?: { plugins: [string, (object | string)?][] };
  legacyModule?: boolean;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `browserslist` | `string \| string[]?` | browserslist 쿼리. esbuild target으로 변환되어 문법(syntax)만 다운레벨 컴파일된다. 예: `"last 2 Chrome versions"` |
| `postCss` | `{ plugins: [string, (object \| string)?][] }?` | PostCSS 플러그인 설정. `[패키지명, 옵션]` 튜플 배열 |
| `legacyModule` | `boolean?` | 레거시 모듈 지원. `true`이면 코드 분할 비활성화 + `import.meta` 치환 |
