---
paths:
  - "**/*.ts"
---

# TypeScript 개발 지침

## 코드 스타일

- `ESM` 환경
- 간결한 코드 우선
- `simplysm` 유틸리티 사용 적극 권장
- `any` 타입 지양 → `unknown` + 타입 가드 사용
- `as unknown as T` 캐스팅 지양 → 타입 설계 재검토
- `null` 지양 → `undefined`로 통일
- 비교: `===` 사용. 단, `null`과 `undefined`체크는 `== null`, `!=null` 사용
- 불필요한 async/await 지양 (`return await x` → `return x`, `async () => await fn()` → `fn`)
- `console`대신 `pino` 사용 적극 권장 (`ora` indicator 사용 적극 권장)
  - `pino`는 `browser`, `node`환경 모두 문제없이 지원함
- `using` 문 사용 권장

## 네이밍

| 대상             | 규칙                        | 예시                                      |
|----------------|---------------------------|-----------------------------------------|
| 파일             | `kebab-case`              | `date-only.ts`                          |
| 클래스            | `PascalCase`              | `DateOnly`                              |
| 함수/변수          | `camelCase`               | `formatDate`                            |
| interface/type | 접두사 금지                    | `User` (~~`IUser`~~)                    |
| Sd 접두사         | Sd 접두사 지양. 꼭 필요한 곳에서만 사용. | `ServiceServer` (~~`SdServiceServer`~~) |
| 미사용 변수         | `_` 접두사                   | `_unused`                               |
| async 함수       | `Async` 접미사 생략            | `readFile()` (동기는 `readFileSync()`)     |

## 코드 구조

- 섹션 구분: `//#region` ~ `//#endregion` (WebStorm 폴딩)
- 파일 분할보다 섹션 구분 선호 (구조적 일관성 유지)

## 호환성

| 기술         | 버전                  |
|------------|---------------------|
| Node.js    | 20.x                |
| TypeScript | 5.8.x               |
| Vitest     | 4.x                 |
| ESLint     | 9.x                 |
| SolidJS    | 1.x                 |
| 브라우저       | Chrome 79+ (ES2022) |
