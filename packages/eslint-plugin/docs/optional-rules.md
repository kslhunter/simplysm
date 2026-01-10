# 선택적 ESLint 규칙

프로젝트에서 비활성화된 규칙들의 목록과 용도입니다.

---

## TypeScript 규칙

| 규칙 | 용도 |
|------|------|
| `@typescript-eslint/naming-convention` | 클래스 멤버 네이밍 규칙 (private/protected에 `_` 접두사 강제) |
| `@typescript-eslint/explicit-member-accessibility` | 클래스 멤버 접근 제어자 명시 강제 |
| `@typescript-eslint/prefer-nullish-coalescing` | `\|\|` 대신 `??` 연산자 사용 강제 |
| `@typescript-eslint/no-restricted-imports` | Angular 시그널 래퍼 함수 사용 강제 (`signal` → `$signal`) |

## SIMPLYSM 규칙

| 규칙 | 용도 |
|------|------|
| `@simplysm/ts-no-exported-types` | TypedArray/ArrayBuffer의 public API 노출 금지 |
| `@simplysm/ts-no-buffer-in-typedarray-context` | TypedArray 컨텍스트에서 Buffer 직접 사용 금지 |

## 기타 규칙

| 규칙 | 용도 |
|------|------|
| `no-restricted-syntax` (PrivateIdentifier) | ECMAScript `#` private 금지 (현재 `no-hard-private` 규칙으로 대체됨) |
| `no-restricted-syntax` (Decorator) | Angular 20+에서 `@HostListener`/`@HostBinding` 대신 `host` 속성 사용 권장 |

## 설정

| 설정 | 용도 |
|------|------|
| `import/resolver.typescript` | TypeScript 경로 별칭 해석 |
