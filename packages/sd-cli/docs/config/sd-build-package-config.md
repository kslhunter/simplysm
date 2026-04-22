# SdBuildPackageConfig

`node` / `browser` / `neutral` 타겟 라이브러리 패키지 설정. esbuild + tsc로 빌드된다.

```typescript
export interface SdBuildPackageConfig {
  target: BuildTarget;
  publish?: SdPublishConfig;
  copySrc?: string[];
  watch?: SdWatchHookConfig;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `target` | [`BuildTarget`](./build-target.md) | 빌드 타겟 (`"node"` \| `"browser"` \| `"neutral"`) |
| `publish` | [`SdPublishConfig?`](./sd-publish-config.md) | 배포 설정 |
| `copySrc` | `string[]?` | `src/`에서 `dist/`로 복사할 파일의 glob 패턴 (`src/` 기준 상대 경로) |
| `watch` | [`SdWatchHookConfig?`](./sd-watch-hook-config.md) | watch 훅 설정. 설정 시 watch 모드에서 빌드 엔진과 함께 훅이 실행된다 |
