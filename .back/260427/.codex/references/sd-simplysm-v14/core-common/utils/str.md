# `str`

> **읽어야 하는 상황**: 한국어 조사 처리, 케이스 변환(PascalCase/camelCase/kebab-case/snake_case), 전각→반각 변환, 문자열 삽입이 필요할 때.

문자열 유틸리티 네임스페이스.

```typescript
import { str } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `getKoreanSuffix` | `(text, type) => string` | 받침 유무에 따라 적절한 한국어 조사 반환 |
| `replaceFullWidth` | `(str) => string` | 전각 문자(Ａ-Ｚ, ａ-ｚ, ０-９, 전각 공백, 전각 괄호)를 반각 문자로 변환 |
| `toPascalCase` | `(str) => string` | PascalCase로 변환 (`-`, `_`, `.` 구분자 지원) |
| `toCamelCase` | `(str) => string` | camelCase로 변환 |
| `toKebabCase` | `(str) => string` | kebab-case로 변환 |
| `toSnakeCase` | `(str) => string` | snake_case로 변환 |
| `isNullOrEmpty` | `(str: string \| undefined) => str is "" \| undefined` | 타입 가드: undefined, null, 빈 문자열이면 true |
| `insert` | `(str, index, insertString) => string` | 특정 위치에 문자열 삽입 |

## `getKoreanSuffix` — 조사 타입

| `type` | 받침 있음 | 받침 없음 | 설명 |
|--------|----------|----------|------|
| `"을"` | 을 | 를 | 목적격 조사 |
| `"은"` | 은 | 는 | 주격 보조사 |
| `"이"` | 이 | 가 | 주격 조사 |
| `"와"` | 과 | 와 | 접속 조사 |
| `"랑"` | 이랑 | 랑 | 접속 조사 |
| `"로"` | 으로 (ㄹ 받침은 "로") | 로 | 도구격 조사 |
| `"라"` | 이라 | 라 | 서술격 조사 |

## Usage

```typescript
import { str } from "@simplysm/core-common";

// 한국어 조사
str.getKoreanSuffix("Apple", "을"); // "를"
str.getKoreanSuffix("책", "이");    // "이"
str.getKoreanSuffix("파일", "을");  // "을"

// 전각 → 반각
str.replaceFullWidth("Ａ１２３"); // "A123"

// 케이스 변환
str.toPascalCase("hello-world"); // "HelloWorld"
str.toCamelCase("HelloWorld");   // "helloWorld"
str.toKebabCase("HelloWorld");   // "hello-world"
str.toSnakeCase("HelloWorld");   // "hello_world"

// null/empty 검사 (타입 가드)
const name: string | undefined = getValue();
if (str.isNullOrEmpty(name)) {
  // name: "" | undefined
} else {
  // name: string (non-empty)
}

// 문자열 삽입
str.insert("Hello World", 5, ","); // "Hello, World"
```
