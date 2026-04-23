# SdWatchHookConfig

watch 모드에서 파일 변경을 감지하고 명령어를 실행하는 훅 설정. [`SdBuildPackageConfig`](./sd-build-package-config.md) 및 [`SdScriptsPackageConfig`](./sd-scripts-package-config.md)의 `watch` 필드에 사용한다.

```typescript
export interface SdWatchHookConfig {
  target: string[];
  cmd: string;
  args?: string[];
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `target` | `string[]` | 감시할 glob 패턴 목록. 패키지 디렉토리 기준 상대 경로 |
| `cmd` | `string` | 파일 변경 시 실행할 명령어 |
| `args` | `string[]?` | 명령어 인수 |
