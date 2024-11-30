# @simplysm/eslint-plugin

TypeScript와 Angular 프로젝트를 위한 ESLint 플러그인입니다.

## 설치

```bash
npm install --save-dev @simplysm/eslint-plugin
```

## 설정

`.eslintrc.js` 파일에 다음과 같이 설정합니다:

```javascript
module.exports = {
  extends: ['plugin:@simplysm/root']
};
```

## 규칙

### TypeScript 규칙

#### @simplysm/ts-no-throw-not-implement-error

`NotImplementError`를 throw하는 코드에 대해 경고를 표시합니다.

```typescript
// 잘못된 예
throw new NotImplementError(); // 경고: 구현되어있지 않습니다

// 올바른 예
throw new Error("구체적인 에러 메시지");
```

### Angular 템플릿 규칙

#### @simplysm/ng-template-no-todo-comments

Angular 템플릿의 TODO 주석에 대해 경고를 표시합니다.

```html
<!-- TODO: 이 부분 수정 필요 --> <!-- 경고 -->
<div>컨텐츠</div>
```

## 기본 설정

플러그인은 다음과 같은 기본 설정을 제공합니다:

### JavaScript/TypeScript 공통

- `no-console`: 콘솔 사용 경고
- `no-warning-comments`: 경고성 주석 사용 경고
- `import/no-extraneous-dependencies`: package.json에 명시되지 않은 의존성 사용 금지

### TypeScript 전용

- `@typescript-eslint/require-await`: async 함수 내 await 필수
- `@typescript-eslint/await-thenable`: await 가능한 객체에만 await 사용
- `@typescript-eslint/return-await`: async 함수에서 Promise 반환 시 await 필수
- `@typescript-eslint/no-floating-promises`: Promise 처리 필수
- `@typescript-eslint/no-shadow`: 변수명 중복 선언 금지
- `@typescript-eslint/no-unnecessary-condition`: 불필요한 조건문 금지
- `@typescript-eslint/typedef`: 타입 명시 필수
- 그 외 다수의 TypeScript 관련 규칙

## 의존성

- typescript-eslint
- angular-eslint
- eslint-plugin-import
- typescript

## 라이선스

MIT

## 작성자

김석래
