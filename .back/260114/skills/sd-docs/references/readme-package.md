# 패키지 README.md 가이드

개별 패키지의 README.md 파일 구조와 작성 방법.

**적용 대상**: `private: true`가 아닌 라이브러리 패키지만 적용.

## 적용 대상 판단

```
package.json의 "private" 필드 확인:
- private: true → 프로덕션 패키지 → README 생성 안함
- private: false 또는 없음 → 라이브러리 패키지 → README 생성
```

## 문서 구조

```markdown
# 패키지명

[패키지 설명 - package.json의 description]

## 목차

- [설치](#설치)
- [사용법](#사용법)
- [API](#api)
- [라이선스](#라이선스)

## 설치

\`\`\`bash
npm install 패키지명
# 또는
yarn add 패키지명
\`\`\`

## 사용법

[기본 → 옵션 → 고급 순서로 단계별 예시]

## API

[클래스 → 함수 → 타입 순서로 문서화]

## 라이선스

[라이선스 정보]
```

## 목차 작성 규칙

**포함 기준**: 문서 100줄 이상 또는 API 5개 이상

**링크 형식**:
- 헤더 텍스트를 소문자로 변환
- 공백은 `-`로 대체
- 특수문자 제거
- 예: `## 기본 사용` → `#기본-사용`

## 섹션별 작성

### 설치

```markdown
## 설치

\`\`\`bash
npm install @scope/package-name
# 또는
yarn add @scope/package-name
\`\`\`
```

- `package.json`의 `name` 사용
- npm과 yarn 명령어 모두 제공

### 사용법

**작성 원칙**:
- 복사-붙여넣기로 바로 실행 가능한 코드 제공
- 기본 → 옵션 → 고급 순서로 단계별 설명
- 각 예시에 무엇을 하는지 설명 추가
- 실제 사용 시나리오 기반으로 작성
- import 문 항상 포함

```markdown
## 사용법

### 기본 사용

\`\`\`typescript
import { Something } from '@scope/package-name';

const result = Something.doSomething();
console.log(result);
\`\`\`

### 옵션 설정

\`\`\`typescript
import { Something } from '@scope/package-name';

const something = new Something({
  option1: 'value1',
  option2: true,
});
\`\`\`
```

### API

**작성 원칙**:
- 모든 공개 API 문서화 (index.ts에서 export하는 것들)
- 클래스 → 함수 → 타입 순서
- 각 API에 매개변수 테이블 포함
- 각 API에 예시 코드 필수
- 반환값의 타입과 의미 명시

```markdown
## API

### 클래스

#### `ClassName`

클래스 설명.

**생성자:**
\`\`\`typescript
new ClassName(options?: ClassOptions)
\`\`\`

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `option1` | `string` | - | 옵션 1 설명 |
| `option2` | `boolean` | `false` | 옵션 2 설명 |

**메서드:**

##### `methodName(param1: string): Promise<Result>`

메서드 설명.

| 매개변수 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `param1` | `string` | O | 매개변수 설명 |

**반환값:** `Promise<Result>` - 결과 객체

**예시:**
\`\`\`typescript
const result = await instance.methodName('value');
\`\`\`

### 함수

#### `functionName(param: Type): ReturnType`

함수 설명.

| 매개변수 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `param` | `Type` | O | 매개변수 설명 |

**반환값:** `ReturnType` - 반환값 설명

**예시:**
\`\`\`typescript
const result = functionName('value');
\`\`\`

### 타입

#### `TypeName`

\`\`\`typescript
interface TypeName {
  field1: string;
  field2?: number;
}
\`\`\`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `field1` | `string` | O | 필드 설명 |
| `field2` | `number` | - | 선택 필드 |
```

### 라이선스

- `package.json`의 `license` 필드 참고

## 정보 소스

| 소스 | 추출 정보 |
|------|----------|
| `package.json` | name, description, license |
| `src/index.ts` | 공개 API (export) |
| `src/` 디렉토리 | 주요 함수/클래스 |

## 검증 항목

| 항목 | 확인 내용 |
|------|----------|
| 적용 대상 | `private: true`가 아닌 패키지 여부 |
| 패키지명 | package.json name과 일치 여부 |
| 설치 명령어 | 정확성 확인 |
| 사용 예시 | 동작 여부 확인 |
| API 문서화 | 모든 공개 API 포함 여부 |
| API 상세 | 매개변수 테이블과 예시 포함 여부 |
| 라이선스 | 정보 정확성 |

## 생략 가능한 섹션

**단순한 유틸리티 패키지**:
```markdown
# 패키지명

설명

## 설치
[설치 명령어]

## 사용법
[간단한 예시]

## 라이선스
MIT
```

**복잡한 패키지**: 모든 섹션 포함, 필요시 추가 섹션 작성.
