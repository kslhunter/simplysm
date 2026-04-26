# `SdServerPackageConfig`

> **읽어야 하는 상황**: Fastify 서버 패키지를 설정할 때 (externals, PM2, 패키지 매니저 등). 프론트엔드는 [`SdClientPackageConfig`](./sd-client-package-config.md) 참조.

esbuild로 단일 번들 빌드되며 Fastify 서버로 실행된다.

```typescript
export interface SdServerPackageConfig {
  target: "server";
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  configs?: Record<string, unknown>;
  externals?: string[];
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
  };
  packageManager?: "volta" | "mise";
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"server"` | 빌드 타겟 식별자 |
| `env` | `Record<string, string>?` | 빌드 시 치환할 환경 변수. `process.env.KEY`를 상수로 치환 |
| `publish` | [`SdPublishConfig?`](./sd-publish-config.md) | 배포 설정 |
| `configs` | `Record<string, unknown>?` | 런타임 설정. 빌드 시 `dist/.config.json`으로 기록 |
| `externals` | `string[]?` | esbuild 번들에 포함하지 않을 외부 모듈. 자동 `binding.gyp` 감지 목록에 추가 |
| `pm2` | `{ name?: string; ignoreWatchPaths?: string[] }?` | PM2 설정. 지정 시 `dist/pm2.config.cjs` 생성 |
| `pm2.name` | `string?` | PM2 프로세스 이름. 미지정 시 `package.json`의 `name`에서 생성 |
| `pm2.ignoreWatchPaths` | `string[]?` | PM2 watch에서 제외할 경로 |
| `packageManager` | `"volta" \| "mise"?` | 사용할 패키지 매니저. `mise.toml` 또는 `volta` 설정 생성에 영향 |
