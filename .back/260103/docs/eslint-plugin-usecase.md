# ESLint Plugin 유즈케이스

> 본 문서는 `@simplysm/eslint-plugin`이 제공하는 규칙과 활용 방법을 정의합니다.

---

## 1. 개요

### 1.1 목적
- Simplysm 프로젝트의 코딩 컨벤션을 강제
- TypeScript와 Angular 템플릿의 잠재적 버그 방지
- 일관된 코드 스타일 유지

### 1.2 적용 대상
- JavaScript/TypeScript 파일 (`.js`, `.ts`, `.tsx`)
- Angular 템플릿 파일 (`.html`)

### 1.3 규칙 유형
- **Problem**: 코드 오류 또는 잠재적 버그 (error)
- **Suggestion**: 개선 권장 사항 (warn)

---

## 2. TypeScript 규칙

### 2.1 `@simplysm/ts-no-throw-not-implement-error`

**목적**: 미완성 구현을 감지하여 프로덕션 배포 방지

**적용 대상**: TypeScript 파일
**심각도**: Warning
**자동 수정**: 불가

#### 위반 사례
```typescript
function calculate(): number {
  throw new NotImplementError("아직 구현되지 않음");
}

class Service {
  process() {
    throw new NotImplementError();
  }
}
```

#### 올바른 사례
```typescript
function calculate(): number {
  return 42;
}

class Service {
  process() {
    // 실제 구현
  }
}
```

---

### 2.2 `@simplysm/ts-no-exported-types`

**목적**: 공개 API에서 특정 타입 노출 방지 (내부 구현 타입 보호)

**적용 대상**: TypeScript 파일
**심각도**: Error
**자동 수정**: 불가
**설정 가능**: Yes

#### 설정 예시
```javascript
// eslint.config.js
"@simplysm/ts-no-exported-types": [
  "error", {
    types: [
      { ban: "Uint8Array", safe: "Buffer" },
      { ban: "ArrayBuffer", safe: "Buffer", ignoreInGeneric: true }
    ]
  }
]
```

#### 위반 사례
```typescript
// 함수 반환 타입에서 금지된 타입 사용
export function getData(): Uint8Array { ... }

// 공개 클래스 멤버에서 금지된 타입 사용
export class FileHandler {
  public buffer: Uint8Array;

  public read(data: Uint8Array): void { ... }
}

// 내보낸 상수에서 금지된 타입 사용
export const chunk: ArrayBuffer = new ArrayBuffer(1024);
```

#### 올바른 사례
```typescript
export function getData(): Buffer { ... }

export class FileHandler {
  public buffer: Buffer;

  public read(data: Buffer): void { ... }
}

export const chunk: Buffer = Buffer.alloc(1024);
```

---

### 2.3 `@simplysm/ts-no-buffer-in-typedarray-context`

**목적**: TypedArray가 예상되는 위치에서 Buffer 직접 사용 방지

**적용 대상**: TypeScript 파일
**심각도**: Error
**자동 수정**: 불가

#### 지원 TypedArray
- `Uint8Array`, `Uint8ClampedArray`, `Int8Array`
- `Uint16Array`, `Int16Array`
- `Uint32Array`, `Int32Array`
- `Float32Array`, `Float64Array`

#### 위반 사례
```typescript
const buf = Buffer.from('abc');

// 변수 할당
const arr: Uint8Array = buf;

// 함수 파라미터
function process(data: Float32Array) {}
process(buf);

// 반환값
function getArray(): Int16Array {
  return buf;
}

// 배열 요소
const arrays: Uint8Array[] = [buf];
```

#### 올바른 사례
```typescript
const buf = Buffer.from('abc');

// 명시적 변환
const arr = new Uint8Array(buf);

// 함수 호출 시 변환
process(new Float32Array(buf));

// 반환 시 변환
function getArray(): Int16Array {
  return new Int16Array(buf);
}

// 배열 요소 변환
const arrays: Uint8Array[] = [new Uint8Array(buf)];
```

---

### 2.4 `@simplysm/ts-no-unused-injects`

**목적**: 사용하지 않는 Angular `inject()` 필드 감지 및 제거

**적용 대상**: TypeScript 파일
**심각도**: Error
**자동 수정**: 가능

#### 위반 사례
```typescript
@Component({...})
export class MyComponent {
  // 사용하지 않는 inject 필드 - 에러
  private http = inject(HttpClient);

  // 사용되는 inject 필드 - OK
  private router = inject(Router);

  navigateTo() {
    this.router.navigate(['/home']);
  }
}
```

#### 자동 수정 결과
```typescript
@Component({...})
export class MyComponent {
  private router = inject(Router);

  navigateTo() {
    this.router.navigate(['/home']);
  }
}
```

---

### 2.5 `@simplysm/ts-no-unused-protected-readonly`

**목적**: 클래스와 템플릿 모두에서 사용하지 않는 `protected readonly` 필드 감지

**적용 대상**: Angular 컴포넌트 (TypeScript 파일)
**심각도**: Error
**자동 수정**: 가능

#### 위반 사례
```typescript
@Component({
  selector: 'app-test',
  template: `<div>{{ currentUser }}</div>`,
  standalone: true
})
export class TestComponent {
  // 사용하지 않음 - 에러
  protected readonly config = { timeout: 5000 };

  // 템플릿에서 사용 - OK
  protected readonly currentUser = signal('John');
}
```

#### 자동 수정 결과
```typescript
@Component({
  selector: 'app-test',
  template: `<div>{{ currentUser }}</div>`,
  standalone: true
})
export class TestComponent {
  protected readonly currentUser = signal('John');
}
```

---

## 3. JavaScript/TypeScript 공통 규칙

### 3.1 `@simplysm/no-subpath-imports-from-simplysm`

**목적**: Simplysm 패키지에서 내부 경로 import 방지 (공개 API만 사용)

**적용 대상**: JavaScript/TypeScript 파일
**심각도**: Error
**자동 수정**: 불가

#### 허용 패턴
- `@simplysm/패키지명`
- `@simplysm/패키지명/모듈`
- `@simplysm/패키지명/모듈/하위모듈`

#### 금지 패턴
- `@simplysm/패키지명/src/*`

#### 위반 사례
```typescript
// 내부 경로 import - 에러
import { something } from "@simplysm/sd-core-common/src/utils";
import { Query } from "@simplysm/sd-orm-common/src/query";
```

#### 올바른 사례
```typescript
// 공개 API import - OK
import { something } from "@simplysm/sd-core-common";
import { something } from "@simplysm/sd-core-common/utils";
```

---

### 3.2 `@simplysm/no-hard-private`

**목적**: ECMAScript `#` private 필드 대신 TypeScript `private` 키워드 사용 강제

**적용 대상**: JavaScript/TypeScript 파일
**심각도**: Error
**자동 수정**: 가능

#### 위반 사례
```typescript
class MyClass {
  #privateField = 5;

  #privateMethod() {
    return this.#privateField * 2;
  }

  public getValue() {
    return this.#privateField;
  }
}
```

#### 자동 수정 결과
```typescript
class MyClass {
  private _privateField = 5;

  private _privateMethod() {
    return this._privateField * 2;
  }

  public getValue() {
    return this._privateField;
  }
}
```

---

## 4. Angular 템플릿 규칙

### 4.1 `@simplysm/ng-template-no-todo-comments`

**목적**: Angular 템플릿의 TODO 주석 감지 (미완성 작업 방지)

**적용 대상**: HTML 파일
**심각도**: Warning
**자동 수정**: 불가

#### 위반 사례
```html
<!-- TODO: 사용자 폼 구현 필요 -->
<div class="container">
  <!-- TODO: 유효성 검사 추가 -->
  <input type="text">
</div>
```

#### 올바른 사례
```html
<!-- 참고: 이 컴포넌트는 사용자 정보를 표시합니다 -->
<div class="container">
  <input type="text">
</div>
```

---

### 4.2 `@simplysm/ng-template-sd-require-binding-attrs`

**목적**: `sd-*` 컴포넌트에서 속성 바인딩 강제 (타입 안전성 보장)

**적용 대상**: HTML 파일
**심각도**: Error
**자동 수정**: 가능
**설정 가능**: Yes

#### 기본 설정
```javascript
{
  selectorPrefixes: ["sd-"],
  allowAttributes: ["id", "class", "style", "title", "tabindex", "role"],
  allowAttributePrefixes: ["aria-", "data-", "sd-"]
}
```

#### 위반 사례
```html
<!-- 일반 속성 사용 - 에러 -->
<sd-button color="primary">확인</sd-button>
<sd-input disabled placeholder="입력하세요"></sd-input>
<sd-select size="large"></sd-select>
```

#### 자동 수정 결과
```html
<!-- 속성 바인딩 사용 - OK -->
<sd-button [color]="'primary'">확인</sd-button>
<sd-input [disabled]="true" [placeholder]="'입력하세요'"></sd-input>
<sd-select [size]="'large'"></sd-select>
```

#### 허용되는 속성 (바인딩 불필요)
```html
<!-- 화이트리스트 속성 - OK -->
<sd-button id="btn1" class="primary">확인</sd-button>
<sd-input style="width: 100px" tabindex="1"></sd-input>

<!-- 허용 접두사 - OK -->
<sd-button data-testid="submit-btn">확인</sd-button>
<sd-input aria-label="사용자 이름"></sd-input>
```

---

## 5. 설정

### 5.1 기본 설정 사용

```javascript
// eslint.config.js
import simplysm from "@simplysm/eslint-plugin";

export default [
  ...simplysm.configs.root
];
```

### 5.2 개별 규칙 설정

```javascript
// eslint.config.js
import simplysm from "@simplysm/eslint-plugin";

export default [
  {
    plugins: {
      "@simplysm": simplysm
    },
    rules: {
      // TypeScript 규칙
      "@simplysm/ts-no-throw-not-implement-error": "warn",
      "@simplysm/ts-no-exported-types": ["error", {
        types: [
          { ban: "Uint8Array", safe: "Buffer" }
        ]
      }],
      "@simplysm/ts-no-buffer-in-typedarray-context": "error",
      "@simplysm/ts-no-unused-injects": "error",
      "@simplysm/ts-no-unused-protected-readonly": "error",

      // 공통 규칙
      "@simplysm/no-subpath-imports-from-simplysm": "error",
      "@simplysm/no-hard-private": "error",

      // Angular 템플릿 규칙
      "@simplysm/ng-template-no-todo-comments": "warn",
      "@simplysm/ng-template-sd-require-binding-attrs": ["error", {
        selectorPrefixes: ["sd-", "app-"],
        allowAttributes: ["id", "class", "style"],
        allowAttributePrefixes: ["aria-", "data-"]
      }]
    }
  }
];
```

---

## 6. 규칙 요약

| 규칙 | 파일 타입 | 심각도 | 자동 수정 | 용도 |
|------|----------|--------|----------|------|
| `ts-no-throw-not-implement-error` | TS | warn | X | 미완성 구현 감지 |
| `ts-no-exported-types` | TS | error | X | 공개 API 타입 제한 |
| `ts-no-buffer-in-typedarray-context` | TS | error | X | Buffer/TypedArray 혼용 방지 |
| `ts-no-unused-injects` | TS | error | O | 미사용 inject 필드 제거 |
| `ts-no-unused-protected-readonly` | TS | error | O | 미사용 protected readonly 제거 |
| `no-subpath-imports-from-simplysm` | JS/TS | error | X | 내부 경로 import 방지 |
| `no-hard-private` | JS/TS | error | O | private 스타일 통일 |
| `ng-template-no-todo-comments` | HTML | warn | X | 템플릿 TODO 감지 |
| `ng-template-sd-require-binding-attrs` | HTML | error | O | 컴포넌트 바인딩 강제 |

