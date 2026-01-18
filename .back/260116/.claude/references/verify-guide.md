# 검증 가이드

코드 변경 후 품질 검증: 타입체크, 린트, 테스트 병렬 수행

| 단계 | 목적 | 명령어                  |
|------|------|----------------------|
| 타입체크 | 타입 오류 검출 | `yarn run typecheck` |
| 린트 | 코드 스타일/규칙 검증 | `yarn run lint`      |
| 테스트 | 기능 동작 검증 | `yarn vitest`        |

## 1. 타입체크

```bash
# 특정 패키지만 타입체크
yarn run typecheck <package-name>

# 전체 타입체크
yarn run typecheck
```

## 2. 린트

```bash
# 특정 패키지만 린트
yarn run lint "packages/<package-name>/{src,tests}/**/*.{ts,js,html}"

# 변경된 파일만 린트
yarn run lint "packages/<package-name>/src/<file_name>"

# 자동 수정 포함
yarn run lint --fix <package-name>

# 전체 린트 (자동수정)
yarn run lint --fix

# 전체 린트 (타이밍 출력)
yarn run lint --timing
```

## 3. 테스트

### 테스트 프레임워크

Vitest 사용.

### 테스트 파일 위치

| 테스트 유형 | 위치 |
|------------|------|
| 패키지 단위 테스트 | `packages/<package>/tests/` |
| 통합 테스트 | `tests/<category>/` |

### 테스트 실행

```bash
# 전체 테스트
yarn vitest

# 특정 패키지 테스트
yarn vitest packages/<package-name>

# 특정 파일 테스트
yarn vitest <file-path>

# 통합 테스트
yarn vitest tests/<category>
```

### 테스트 환경 고려사항

| 환경 | 특징 |
|------|------|
| Node | 기본 환경, 대부분의 패키지 |
| 브라우저 | DOM API 필요 시 |
| Docker | DB 연결 필요 시 (ORM 통합 테스트) |

## 테스트 작성 패턴

```typescript
import { describe, it, expect } from "vitest";

describe("기능명", () => {
  it("동작 설명", () => {
    // given
    const input = "test";

    // when
    const result = someFunction(input);

    // then
    expect(result).toBe("expected");
  });
});
```

### 비동기 테스트

```typescript
it("비동기 동작 설명", async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### 테스트 네이밍

- 파일명: `<대상>.spec.ts`
- describe: 기능/클래스명
- it: 구체적 동작 설명 (한국어 가능)
