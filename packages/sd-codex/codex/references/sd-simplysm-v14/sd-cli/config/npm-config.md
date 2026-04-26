# `NpmConfig`

> **읽어야 하는 상황**: `package.json` 구조를 타입으로 참조해야 할 때 (의존성 탐색, 버전 조회 등).

npm `package.json` 구조를 나타내는 인터페이스. 패키지 의존성 탐색, 버전 조회 등 내부 유틸리티에서 사용한다.

```typescript
export interface NpmConfig {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  volta?: unknown;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 패키지명 |
| `version` | `string` | 패키지 버전 |
| `description` | `string?` | 패키지 설명 |
| `dependencies` | `Record<string, string>?` | 프로덕션 의존성 |
| `devDependencies` | `Record<string, string>?` | 개발 의존성 |
| `peerDependencies` | `Record<string, string>?` | 피어 의존성 |
| `volta` | `unknown?` | Volta 설정 |
