## 코딩 규칙

### 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 | kebab-case | `user.service.ts`, `user-permission.model.ts` |
| interface/type | 접두사 금지 | `interface User`, `type UserRole` |
| 미사용 변수 | `_` 접두사 | `_unused` |
| async 함수 | 접미사 없음 | `readFile()` |
| sync 함수 (async 공존 시) | `Sync` 접미사 | `readFileSync()` |

### 타입 및 값

| 규칙 | 설명 |
|------|------|
| `null` 대신 `undefined` | `T \| undefined` 형태로 사용 |
| `===` 사용 | null 체크만 `== null` 허용 |
| `any` 최소화 | 가능하면 구체적 타입으로 캐스팅 |
| `Buffer` 권장 | `Uint8Array`보다 선호 (폴리필 제공) |

### 코드 구조

| 항목 | 설명 |
|------|------|
| 일관성 | 예측 가능한 패턴 유지 |
| 섹션 구분 | `//#region` 사용 (IDE 폴딩) |
| 재사용 | 공통 로직은 유틸 패키지 검토 |

### 도구

| 용도 | 금지 | 사용 |
|------|------|------|
| 로깅 | `console.*` | `pino` |
| 런타임 검증 | - | `zod` |

### 포맷팅

| 항목 | 규칙 |
|------|------|
| 줄바꿈 문자 | LF 사용 |