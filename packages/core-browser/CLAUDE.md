# core-browser 개발 가이드

> SimplySM 프레임워크의 브라우저 전용 DOM 유틸리티 패키지 - Claude Code 참고 문서
>
> **주의:** `sd-core-browser`(구버전)은 참고 금지.

**이 문서는 Claude Code가 core-browser 패키지를 개발/수정할 때 참고하는 가이드입니다.**

## 아키텍처

```
Application
    ↓
sd-angular, etc.
    ↓
core-browser  ← 브라우저 전용 레이어
    ↓
core-common   ← 공통 기반 (의존)
```

**핵심**: 브라우저 환경에서만 사용 가능한 DOM 유틸리티. Node.js에서는 사용 불가.

## 모듈 구조

```
src/
├── utils/
│   ├── blob.ts         # BlobUtils 네임스페이스
│   ├── element.ts      # ElementUtils 네임스페이스
│   └── html-element.ts # HtmlElementUtils 네임스페이스
└── index.ts            # 진입점
```

## 주요 컴포넌트

### BlobUtils (utils/blob.ts)

| 함수 | 설명 |
|------|------|
| `download(blob, fileName)` | Blob을 파일로 다운로드 |

**사용 예**:
```typescript
import { BlobUtils } from "@simplysm/core-browser";

const blob = new Blob(["Hello"], { type: "text/plain" });
BlobUtils.download(blob, "hello.txt");
```

### ElementUtils (utils/element.ts)

| 함수 | 설명 |
|------|------|
| `prependChild(parent, child)` | 요소를 첫 번째 자식으로 삽입 |
| `findAll(el, selector)` | 하위 요소 전체 검색 (`:scope` 자동) |
| `findFirst(el, selector)` | 첫 번째 하위 요소 검색 |
| `getParents(el)` | 모든 부모 요소 목록 |
| `findFocusableParent(el)` | 포커스 가능한 부모 (내부적으로 tabbable 사용) |
| `isOffsetElement(el)` | offset 기준 요소 여부 |
| `isVisible(el)` | 가시성 여부 |
| `copyElement(event)` | 클립보드 복사 (copy 이벤트 핸들러용) |
| `pasteToElement(event)` | 클립보드 붙여넣기 (paste 이벤트 핸들러용) |

**사용 예**:
```typescript
import { ElementUtils } from "@simplysm/core-browser";
import { isFocusable, focusable } from "tabbable";  // 포커스 관련은 tabbable 직접 사용

// 셀렉터로 하위 요소 검색
const items = ElementUtils.findAll(container, ".item");

// 포커스 가능한 부모 찾기
const parent = ElementUtils.findFocusableParent(element);

// 포커스 관련 기능은 tabbable 직접 사용
if (isFocusable(element)) {
  element.focus();
}
const focusableElements = focusable(container);

// 클립보드 복사/붙여넣기
element.addEventListener("copy", ElementUtils.copyElement);
```

### HtmlElementUtils (utils/html-element.ts)

| 함수 | 설명 |
|------|------|
| `repaint(el)` | 강제 리페인트 (리플로우 트리거) |
| `getRelativeOffset(el, parent)` | 부모 기준 상대 위치 |
| `scrollIntoViewIfNeeded(container, target, offset?)` | 조건부 스크롤 |
| `getBoundsAsync(els)` | IntersectionObserver 기반 bounds 조회 |

**사용 예**:
```typescript
import { HtmlElementUtils } from "@simplysm/core-browser";

// 강제 리페인트
HtmlElementUtils.repaint(element);

// 상대 위치 계산
const offset = HtmlElementUtils.getRelativeOffset(child, parent);
console.log(offset.top, offset.left);

// bounds 비동기 조회
const bounds = await HtmlElementUtils.getBoundsAsync([el1, el2]);
```

## 외부 의존성

| 패키지 | 용도 | 비고 |
|--------|------|------|
| `tabbable` | `ElementUtils.findFocusableParent` 내부 사용 | 사용자는 tabbable 직접 사용 권장 |

**참고**: 포커스/탭 관련 기능(`isFocusable`, `focusable`, `tabbable` 등)은 사용자가 `tabbable` 패키지를 직접 import하여 사용.

## sd-core-browser와의 차이

### 제거됨

| 항목 | 이유 |
|------|------|
| 프로토타입 확장 패턴 | 전역 타입 오염 방지 |
| `Element.prototype.findParent` | deprecated, 브라우저 `closest()` 사용 |
| IE11 폴리필 (`msMatchesSelector`) | Chrome 79+ 타겟 |
| `FOCUSABLE_SELECTORS` 직접 정의 | `tabbable` 패키지로 대체 |

### 개선됨

| 항목 | 변경 내용 |
|------|----------|
| 유틸 구조 | 개별 함수 → 네임스페이스 (`BlobUtils`, `ElementUtils`, `HtmlElementUtils`) |
| `downloadBlob` | `BlobUtils.download`로 변경, `URL.revokeObjectURL()` 추가 (메모리 누수 방지) |
| 포커스 관련 함수 | `tabbable` 패키지 사용 (inert, Shadow DOM 등 지원) |

## 테스트

### 테스트 구조

```
tests/
└── utils/
    ├── blob.spec.ts
    ├── element.spec.ts
    └── html-element.spec.ts
```

### 테스트 실행

```bash
# 전체 테스트
npx vitest run packages/core-browser

# 특정 파일
npx vitest run packages/core-browser/tests/utils/element.spec.ts
```

### 테스트 현황 (2026-01-07 기준)

**테스트**: 39개 (3개 파일), 통과율 100%

| 파일 | 테스트 수 |
|------|----------|
| blob.spec.ts | 3 |
| element.spec.ts | 27 |
| html-element.spec.ts | 9 |

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/core-browser/tsconfig.json 2>&1 | grep "^packages/core-browser/"

# ESLint
npx eslint "packages/core-browser/**/*.ts"

# 테스트
npx vitest run packages/core-browser
```

## 주의사항

### 브라우저 전용
- 이 패키지는 브라우저 환경에서만 동작
- `document`, `window`, `navigator` 등 브라우저 API 사용
- Node.js 환경에서 import 시 에러 발생

### 테스트 환경
- Vitest + happy-dom 사용
- 일부 DOM API는 happy-dom에서 제한적 (getBoundingClientRect 등)
- 실제 브라우저 동작 테스트는 e2e로 보완 필요
