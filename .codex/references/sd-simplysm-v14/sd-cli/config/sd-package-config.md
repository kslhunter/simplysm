# `SdPackageConfig`

> **읽어야 하는 상황**: 패키지의 빌드 타겟을 결정하거나 `target` 값에 따른 설정 분기를 확인할 때. 각 타겟별 상세 설정은 아래 링크 참조.

`sd.config.ts`의 패키지별 설정. `target` 필드로 분기하는 discriminated union이다.

```typescript
export type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;
```

| `target` 값 | 타입 | 설명 |
|-------------|------|------|
| `"node"` \| `"browser"` \| `"neutral"` | [`SdBuildPackageConfig`](./sd-build-package-config.md) | esbuild+tsc로 빌드되는 라이브러리 패키지 |
| `"client"` | [`SdClientPackageConfig`](./sd-client-package-config.md) | Vite/esbuild로 빌드되는 프론트엔드 패키지 |
| `"server"` | [`SdServerPackageConfig`](./sd-server-package-config.md) | esbuild로 빌드되는 Fastify 서버 패키지 |
| `"scripts"` | [`SdScriptsPackageConfig`](./sd-scripts-package-config.md) | 빌드 없이 watch 훅만 실행하는 스크립트 패키지 |
