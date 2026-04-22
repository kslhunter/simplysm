# env / parseBoolEnv

환경변수 접근 유틸리티 함수. `process.env`/`import.meta.env` 직접 접근 대신 이 함수를 사용해야 한다.

```typescript
export function env(key: string): string | undefined;
export function env(key: string, value: string): void;

export function parseBoolEnv(value: unknown): boolean;
```

직접 named import로 사용한다:

```typescript
import { env, parseBoolEnv } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `env` | `(key: string) => string \| undefined` | 환경변수 값 읽기. `process.env` 우선, fallback `import.meta.env` |
| `env` | `(key: string, value: string) => void` | 환경변수 값 쓰기 (`process.env`에 저장) |
| `parseBoolEnv` | `(value: unknown) => boolean` | 환경변수 값을 boolean으로 파싱. `"true"`, `"1"`, `"yes"`, `"on"` (대소문자 무시) → `true`, 그 외 → `false` |

## Usage

```typescript
import { env, parseBoolEnv } from "@simplysm/core-common";

// 읽기
const apiUrl = env("API_URL"); // string | undefined

// 쓰기
env("DEBUG", "true");

// boolean 파싱
parseBoolEnv(env("DEBUG")); // true
parseBoolEnv("yes");        // true
parseBoolEnv("false");      // false
parseBoolEnv("0");          // false
```
