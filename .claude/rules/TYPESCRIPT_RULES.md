---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript 개발 지침

## 일반 원칙

- 불필요한 async/await는 피한다. (`return await x` → `return x`)
- 예외 상황은 기본값보다 오류 발생을 선호한다.
- 에러 메시지 등 사용자 메시지는 한국어로 작성한다.
- `eslint-disable` 주석은 피하고, 규칙을 준수하는 방향으로 해결한다.

## 유틸리티 활용

- `@simplysm/*` 패키지의 유틸리티를 적극 활용한다.
- `console` 대신 `consolar`를 사용한다.
- `using` 문을 적극 활용한다.
- Primitive 타입 파라미터는 `PrimitiveTypeStr`(`@simplysm/core-common`)을 활용한다.

## `any` vs `unknown`

| 사용 | 케이스 |
|-----|-------|
| `unknown` | 외부 입력(API, JSON), 범용 유틸리티 파라미터, catch 블록 |
| `any` | 동적 속성 접근, 타입 없는 라이브러리, 테스트 mock, 메타프로그래밍 |

**주의**: `as unknown as T`, 반환 타입 `any`, 변수 선언 `: any`는 피한다.

## 네이밍

| 대상 | 규칙 | 예시 |
|-----|-----|-----|
| 파일 | `kebab-case` | `date-only.ts` |
| 클래스 | `PascalCase` | `DateOnly` |
| 함수/변수 | `camelCase` | `formatDate` |
| interface/type | 접두사 없음 | `User` (~~`IUser`~~) |
| Sd 접두사 | 필요한 곳에서만 | `ServiceServer` (~~`SdServiceServer`~~) |
| 미사용 변수 | `_` 접두사 | `_unused` |
| async 함수 | 접미사 없음 | `readFile()` |
| sync/async 쌍 | 동기만 `Sync` 접미사 | `readFile()` / `readFileSync()` |

## 코드/파일 구조

- `//#region` ~ `//#endregion`으로 섹션을 구분한다. (WebStorm 폴딩)
- 파일 분할보다 섹션 구분을 선호한다.
- `index.ts`는 `src/index.ts`만 존재, 하위 디렉토리에 생성 금지

## 호환성

| 기술         | 버전                           |
|------------|------------------------------|
| 모듈 시스템     | ESM                          |
| Node.js    | 20.11+                       |
| TypeScript | 5.8.x                        |
| Vitest     | 4.x                          |
| ESLint     | 9.x                          |
| SolidJS    | 1.x                          |
| Tailwind   | 4.x                          |
| 브라우저       | Chrome 79+ (esbuild/vite 빌드) |

## ESLint 규칙

- `strict-boolean-expressions`: boolean 컨텍스트에서 암묵적 타입 변환을 금지한다. (허용 옵션: `allowNullableBoolean`, `allowNullableObject`)
- `no-unnecessary-condition`: 항상 참/거짓인 조건을 금지한다.
- `no-floating-promises`: Promise 무시를 금지한다. `void promise` 또는 `await` 필수.
- `prefer-readonly`: 재할당 없는 멤버는 `readonly`로 선언한다.