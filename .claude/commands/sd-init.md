---
description: SIMPLYSM 기반 프로젝트 초기화 (루트 CLAUDE.md 생성)
---

# SIMPLYSM 프로젝트 초기화

SIMPLYSM 기반 프로젝트의 루트 CLAUDE.md를 생성합니다.

## 사용 방법

```bash
/sd-init
```

## CLAUDE.md 필수 섹션 템플릿

SIMPLYSM 기반 프로젝트의 최상위 CLAUDE.md 작성 시 **반드시 포함**해야 할 공통 규칙:
(패키지별 CLAUDE.md에는 해당하지 않음)

### 1. 필수 작업 규칙

```markdown
## ⚠️ 필수 규칙 (CRITICAL)

- 모든 응답은 한국어로 작성
- Edit 툴 사용 시 파일 경로에 백슬래시(`\`) 사용 (bash 명령은 슬래시 사용 가능)
```

### 2. 코드 스타일

```markdown
## 코드 스타일

상세한 ESLint 규칙은 `packages/eslint-plugin/src/configs/root.js` 참고

### Typescript 핵심 규칙 (자주 실수하는 것만)

- `private` 키워드 사용 (ECMAScript `#` 금지)
- async 함수는 반드시 `await` 포함 (`@typescript-eslint/require-await`)
- 동등 비교 `===` 사용 (null 체크는 `== null` 허용)
- 사용하지 않는 변수는 `_` 접두사
- `@typescript-eslint/strict-boolean-expressions`: bollean/object제외, string/number등은 명시적 null 체크 필요
- floating promise 금지 (`@typescript-eslint/no-floating-promises`)

### Angular 규칙

- Angular 20+ 시그널 API 사용
- 아이콘: `@ng-icons/...`

### 코딩 컨벤션

- **규칙성/통일성**: 사용법 예측 가능하게 일관된 패턴 유지
- **섹션 구분**: `//#region` 사용 (WebStorm 폴딩)
```

### 3. 설정 파일

````markdown
## 설정 파일

| 파일                    | 용도                             |
| ----------------------- | -------------------------------- |
| `simplysm.{ts,js}`      | sd-cli 프로젝트 설정             |
| `tsconfig.base.json`    | 공유 TypeScript 설정 (경로 별칭) |
| `eslint.config.{ts,js}` | ESLint 설정                      |
| `vitest.config.{ts,js}` | Vitest 설정                      |

### Import 규칙

패키지 간 import는 `@{프로젝트명}/*` 별칭 사용:

\```typescript
import { Something } from "@simplysm/sd-core-common";
\```
````

---

## 실행 절차

1. **프로젝트 분석**: 패키지 구조, 기술 스택, 설정 파일 파악
2. **필수 템플릿 적용**: 위의 필수 섹션 템플릿 포함
3. **맞춤 내용 생성**: 프로젝트별 개요 및 구조 작성
4. **CLAUDE.md 생성**: 루트 디렉토리에 파일 생성

## 주의사항

- 이미 CLAUDE.md가 존재하는 경우 덮어쓰기 여부를 확인합니다
- 루트 디렉토리에서 실행해야 합니다
- 패키지별 CLAUDE.md는 별도로 작성해야 합니다 (필수 섹션 템플릿 제외)
