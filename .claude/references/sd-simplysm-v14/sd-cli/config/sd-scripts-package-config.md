# SdScriptsPackageConfig

`scripts` 타겟 패키지 설정. 빌드 엔진이 없으며, `watch` 훅이 설정된 경우에만 watch/typecheck 대상에 포함된다.

```typescript
export interface SdScriptsPackageConfig {
  target: "scripts";
  publish?: SdPublishConfig;
  watch?: SdWatchHookConfig;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"scripts"` | 빌드 타겟 식별자 |
| `publish` | [`SdPublishConfig?`](./sd-publish-config.md) | 배포 설정 |
| `watch` | [`SdWatchHookConfig?`](./sd-watch-hook-config.md) | watch 훅 설정. 설정 시 watch 모드에 패키지가 포함된다 |
