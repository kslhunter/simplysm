# `SdScriptsPackageConfig`

> **읽어야 하는 상황**: 빌드 없이 watch 훅만 실행하는 스크립트 패키지를 설정할 때. 빌드가 필요한 패키지는 [`SdBuildPackageConfig`](./sd-build-package-config.md) 참조.

빌드 엔진이 없으며, `watch` 훅이 설정된 경우에만 watch/typecheck 대상에 포함된다.

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
