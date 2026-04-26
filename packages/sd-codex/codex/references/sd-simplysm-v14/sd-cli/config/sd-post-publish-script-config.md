# `SdPostPublishScriptConfig`

> **읽어야 하는 상황**: 배포 완료 후 자동으로 실행할 스크립트를 설정할 때.

배포 완료 후 실행할 스크립트 설정. [`SdConfig`](./sd-config.md)의 `postPublish` 배열 항목으로 사용한다.

```typescript
export interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  args: string[];
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"script"` | 타입 식별자 |
| `cmd` | `string` | 실행할 명령어 |
| `args` | `string[]` | 명령어 인수. 환경 변수 치환 지원: `%VER%` (버전), `%PROJECT%` (프로젝트명) |
