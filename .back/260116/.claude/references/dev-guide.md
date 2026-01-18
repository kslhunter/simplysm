# 개발 가이드

simplysm 스타일을 따르는 프로젝트에서 코드 작성 시 준수해야 할 공통 규칙.

## 프로젝트 구조 파악

프로젝트별 구조와 의존성은 해당 프로젝트의 문서 참고:

- `CLAUDE.md`: 프로젝트 개요, 빌드 명령어, 패키지 구조
- `README.md`: 프로젝트 설명
- `package.json`: 의존성, 스크립트

## 코드 스타일

- TypeScript strict 모드
- ESLint 규칙 준수
- 명사형/간결체 사용 (주석/문서에서 2인칭 금지)

## 파일/디렉토리 네이밍

| 대상       | 규칙               | 예시                  |
|----------|------------------|---------------------|
| 파일       | kebab-case       | `excel-workbook.ts` |
| 클래스      | PascalCase       | `ExcelWorkbook`     |
| 함수/변수    | camelCase        | `parseWorkbook`     |
| 상수       | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT`   |
| 타입/인터페이스 | PascalCase       | `IWorkbookOptions`  |

### 타입 및 값

| 규칙                    | 설명                         |
|-----------------------|----------------------------|
| `null` 대신 `undefined` | `T \| undefined` 형태로 사용    |
| `===` 사용              | null 체크만 `== null` 허용      |
| `any` 최소화             | 가능하면 구체적 타입으로 캐스팅          |
| `Buffer` 권장           | `Uint8Array`보다 선호 (폴리필 제공) |

### 코드 구조

| 항목    | 설명                      |
|-------|-------------------------|
| 일관성   | 예측 가능한 패턴 유지            |
| 섹션 구분 | `//#region` 사용 (IDE 폴딩) |
| 재사용   | 공통 로직은 유틸 패키지 검토        |

### 외부 도구

| 용도     | 금지          | 사용     |
|--------|-------------|--------|
| 로깅     | `console.*` | `pino` |
| 런타임 검증 | -           | `zod`  |

### 포맷팅

| 항목     | 규칙    |
|--------|-------|
| 줄바꿈 문자 | LF 사용 |

## 내보내기 규칙

각 패키지의 `src/index.ts`에서 공개 API export:

```typescript
// src/index.ts
export * from "./some-module";
export {SomeClass} from "./some-class";
```

## 환경별 코드 분리

| 환경             | 사용 가능 API                 |
|----------------|---------------------------|
| 공용 (common)    | 브라우저+Node 모두에서 동작하는 API만  |
| 브라우저 (browser) | DOM, Web API              |
| Node.js (node) | fs, path, child_process 등 |

## 에러 처리

- 예상 가능한 에러는 명시적으로 처리
- 예상치 못한 에러는 상위로 전파
- 사용자 친화적 에러 메시지 제공

## 비동기 처리

- async/await 패턴 사용
- Promise 체이닝 지양
- 병렬 처리 가능한 경우 `Promise.all` 활용

## 의존성 관리

- 패키지 간 순환 의존성 금지
- 의존성 계층 위반 금지 (상위 → 하위만 허용)
- 불필요한 의존성 추가 지양
