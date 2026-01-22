---
paths:
  - "**/*.ts"
---

# TypeScript 개발 지침

## 코드 스타일

- 간결하게 작성한다.
- `@simplysm/*`패키지의 유틸리티를 적극 활용한다.
- `any` 타입은 피하고, `unknown` + 타입 가드를 사용한다.
- `as unknown as T` 캐스팅은 피하고, 타입 설계를 재검토한다.
- `null`은 피하고, `undefined`로 통일한다.
- 비교는 `===`를 사용한다. 단, `null`/`undefined` 체크는 `=== null/undefined`대신 `== null`, `!= null`을 사용한다.
- 불필요한 async/await는 피한다. (`return await x` → `return x`)
- `console` 대신 `pino`를 적극 활용한다. (`listr2` indicator도 활용한다)
    - `pino`는 browser, node 환경 모두 지원한다.
- `using` 문을 적극 활용한다.
- 예측에서 벗어난 사용에 대해서는 기본값 보다는 오류 발생를 선호한다. (예: 엑셀 셀 포맷을 통해 타입을 찾을때, 각각 포맷에 맞는 타입반환 + 그외는 기본값이 아닌 오류 발생)
- Primitive 타입을 타입으로 input받을때는 `string`같은 방식으로 못받으므로 `@simplysm/core-common`의 `PrimitiveTypeStr`을 적극 활용한다. 

## 네이밍

| 대상             | 규칙             | 예시                                      |
|----------------|----------------|-----------------------------------------|
| 파일             | `kebab-case`   | `date-only.ts`                          |
| 클래스            | `PascalCase`   | `DateOnly`                              |
| 함수/변수          | `camelCase`    | `formatDate`                            |
| interface/type | 접두사 없음         | `User` (~~`IUser`~~)                    |
| Sd 접두사         | 필요한 곳에서만 사용    | `ServiceServer` (~~`SdServiceServer`~~) |
| 미사용 변수         | `_` 접두사        | `_unused`                               |
| async 함수 | 접미사 없음 | `readFile()` |
| sync/async 쌍 | 동기 함수에만 `Sync` 접미사 | `readFile()` / `readFileSync()` |

## 코드 구조

- `//#region` ~ `//#endregion`으로 섹션을 구분한다. (WebStorm 폴딩)
- 파일 분할보다 섹션 구분을 선호한다. (구조적 일관성 유지)

## 파일 구조

- `index.ts`는 `src/index.ts`만 존재, 하위 디렉토리에 생성 금지

## 호환성

| 기술         | 버전                  |
|------------|---------------------|
| 모듈 시스템     | ESM                 |
| Node.js    | 20.x                |
| TypeScript | 5.8.x               |
| Vitest     | 4.x                 |
| ESLint     | 9.x                 |
| SolidJS    | 1.x                 |
| 브라우저       | Chrome 79+ (ES2022) |
