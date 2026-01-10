# 검증 오류 해결 가이드

`/sd:check` 커맨드에서 오류 발생 시 참조하는 해결책입니다.

---

## TypeScript 오류

### TS2307: Cannot find module

**증상**:
```
error TS2307: Cannot find module '@simplysm/core-common' or its corresponding type declarations.
```

**원인 및 해결**:

| 원인 | 해결 |
|------|------|
| 패키지 미설치 | `yarn install` 실행 |
| tsconfig paths 누락 | `tsconfig.base.json`에 경로 추가 |
| 순환 의존성 | 의존성 구조 확인 |

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "@simplysm/core-common": ["packages/core-common/src"]
    }
  }
}
```

---

### TS2345: Argument of type 'X' is not assignable to type 'Y'

**증상**:
```
error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```

**해결**:

```typescript
// ❌ 오류
function process(value: string) { ... }
const input: string | undefined = getValue();
process(input); // 오류

// ✅ 해결 1: null 체크
if (input != null) {
  process(input);
}

// ✅ 해결 2: 기본값
process(input ?? "default");

// ✅ 해결 3: non-null assertion (확실할 때만)
process(input!);
```

---

### TS2322: Type 'X' is not assignable to type 'Y'

**증상**:
```
error TS2322: Type 'string' is not assignable to type 'number'.
```

**해결**:

```typescript
// ❌ 오류
const value: number = "123"; // 오류

// ✅ 해결: 타입 변환
const value: number = Number("123");
const value: number = parseInt("123", 10);
```

---

### TS7006: Parameter implicitly has an 'any' type

**증상**:
```
error TS7006: Parameter 'item' implicitly has an 'any' type.
```

**해결**:

```typescript
// ❌ 오류
items.map(item => item.name); // item이 any

// ✅ 해결: 타입 명시
items.map((item: User) => item.name);

// 또는 items 타입이 정확하면 자동 추론됨
const items: User[] = getUsers();
items.map(item => item.name); // item은 User
```

---

### TS2554: Expected N arguments, but got M

**증상**:
```
error TS2554: Expected 2 arguments, but got 1.
```

**해결**:

```typescript
// ❌ 오류
function greet(name: string, age: number) { ... }
greet("Alice"); // 오류

// ✅ 해결 1: 누락 인수 추가
greet("Alice", 30);

// ✅ 해결 2: 선택적 파라미터로 변경
function greet(name: string, age?: number) { ... }
```

---

### TS2339: Property 'X' does not exist on type 'Y'

**증상**:
```
error TS2339: Property 'name' does not exist on type 'object'.
```

**해결**:

```typescript
// ❌ 오류
const data: object = getResponse();
console.log(data.name); // 오류

// ✅ 해결 1: 정확한 타입 정의
interface ResponseData {
  name: string;
}
const data: ResponseData = getResponse();

// ✅ 해결 2: 타입 단언 (확실할 때)
const data = getResponse() as ResponseData;

// ✅ 해결 3: 타입 가드
function hasName(obj: unknown): obj is { name: string } {
  return typeof obj === "object" && obj !== null && "name" in obj;
}
```

---

### TS2769: No overload matches this call

**증상**:
```
error TS2769: No overload matches this call.
```

**해결**:
- 함수 시그니처 확인
- 인수 타입/순서 확인
- 오버로드 정의 검토

```typescript
// 오버로드 정의 확인
function parse(input: string): Data;
function parse(input: Buffer): Data;

// 올바른 타입으로 호출
parse("string"); // OK
parse(buffer);   // OK
parse(123);      // 오류 - 오버로드 없음
```

---

## ESLint 오류

### @typescript-eslint/no-floating-promises

**증상**:
```
error  Promises must be awaited, end with a call to .catch, or end with a call to .then
```

**해결**:

```typescript
// ❌ 오류
asyncFunction();

// ✅ 해결 1: await
await asyncFunction();

// ✅ 해결 2: void (의도적 무시)
void asyncFunction();

// ✅ 해결 3: catch
asyncFunction().catch(console.error);
```

---

### @typescript-eslint/no-explicit-any

**증상**:
```
error  Unexpected any. Specify a different type
```

**해결**:

```typescript
// ❌ 오류
function process(data: any) { ... }

// ✅ 해결 1: 구체적 타입
function process(data: UserData) { ... }

// ✅ 해결 2: unknown + 타입 가드
function process(data: unknown) {
  if (isUserData(data)) {
    // data는 UserData
  }
}

// ✅ 해결 3: 제네릭
function process<T>(data: T) { ... }
```

---

### @typescript-eslint/strict-boolean-expressions

**증상**:
```
error  Unexpected nullable string value in conditional
```

**해결**:

```typescript
// ❌ 오류
if (str) { ... } // str이 string | undefined

// ✅ 해결: 명시적 비교
if (str != null) { ... }
if (str !== undefined) { ... }
if (str !== "") { ... }
```

---

### @typescript-eslint/no-unused-vars

**증상**:
```
error  'value' is defined but never used
```

**해결**:

```typescript
// ❌ 오류
const { name, value } = obj; // value 미사용

// ✅ 해결 1: 제거
const { name } = obj;

// ✅ 해결 2: _ 접두사
const { name, _value } = obj;
```

---

### @simplysm/no-hard-private

**증상**:
```
error  ECMAScript private fields (#) are not allowed. Use 'private' keyword instead
```

**해결**:

```typescript
// ❌ 오류
class Example {
  #privateField = 1;
}

// ✅ 해결
class Example {
  private privateField = 1;
}
```

---

### @simplysm/ts-no-throw-not-implement-error

**증상**:
```
error  NotImplementedError should not be thrown in production code
```

**해결**:
- 실제 구현으로 대체
- 또는 해당 기능 제거

---

## 테스트 오류

### 테스트 타임아웃

**증상**:
```
Error: Test timed out in 5000ms.
```

**해결**:

```typescript
// ✅ 해결 1: 타임아웃 증가
it("long test", async () => {
  // ...
}, 30000); // 30초

// ✅ 해결 2: 비동기 처리 확인
it("async test", async () => {
  await longOperation(); // await 필수
});
```

---

### Mock 관련 오류

**증상**:
```
Error: vi.mock() must be called before any imports
```

**해결**:

```typescript
// ❌ 오류
import { something } from "./module";
vi.mock("./module");

// ✅ 해결: mock을 먼저
vi.mock("./module");
import { something } from "./module";

// 또는 hoisted mock 사용
vi.mock("./module", () => ({
  something: vi.fn()
}));
```

---

### 스냅샷 불일치

**증상**:
```
Snapshot `test name 1` mismatched
```

**해결**:

```bash
# 스냅샷 업데이트 (변경이 의도적일 때)
npx vitest run -u

# 특정 테스트만
npx vitest run path/to/test.spec.ts -u
```

---

## 공통 해결 패턴

### 캐시 문제

```bash
# TypeScript 캐시 삭제
rm -rf node_modules/.cache/typescript

# Vitest 캐시 삭제
rm -rf node_modules/.vitest

# 전체 재설치
rm -rf node_modules && yarn install
```

---

### 의존성 문제

```bash
# yarn.lock 재생성
rm yarn.lock && yarn install

# 특정 패키지 재설치
yarn remove @simplysm/core-common
yarn add @simplysm/core-common
```

---

### IDE 동기화 문제

**VSCode**:
- `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"

**WebStorm/IDEA**:
- File → Invalidate Caches → Restart

---

## 자주 발생하는 패턴별 해결

### async/await 관련

```typescript
// ❌ return await 누락
async function getData() {
  return fetchData(); // await 없음
}

// ✅ 해결
async function getData() {
  return await fetchData();
}
```

### null 체크 관련

```typescript
// ❌ == null 대신 === 사용
if (value === null || value === undefined) { ... }

// ✅ 해결 (CLAUDE.md 규칙)
if (value == null) { ... }
```

### Buffer vs Uint8Array

```typescript
// ❌ Uint8Array 직접 사용
const data = new Uint8Array(10);

// ✅ Buffer 사용 (CLAUDE.md 규칙)
const data = Buffer.alloc(10);
```
