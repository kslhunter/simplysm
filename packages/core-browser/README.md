# @simplysm/core-browser

심플리즘 프레임워크의 브라우저 전용 유틸리티 패키지입니다.

## 설치

```bash
npm install @simplysm/core-browser
# or
yarn add @simplysm/core-browser
```

## 주요 기능

### Blob Utils

Blob 처리 유틸리티를 제공합니다.

```typescript
import { blobToDataUrl, blobToText, blobToArrayBuffer } from "@simplysm/core-browser";

// Blob을 Data URL로 변환
const dataUrl = await blobToDataUrl(blob);

// Blob을 텍스트로 변환
const text = await blobToText(blob);

// Blob을 ArrayBuffer로 변환
const buffer = await blobToArrayBuffer(blob);
```

### Element Utils

DOM 엘리먼트 조작 유틸리티를 제공합니다.

```typescript
import { getSiblings, getNextSiblings, getAncestors, getOffset } from "@simplysm/core-browser";

// 형제 요소 가져오기
const siblings = getSiblings(element);

// 다음 형제 요소들 가져오기
const nextSiblings = getNextSiblings(element);

// 조상 요소들 가져오기
const ancestors = getAncestors(element);

// 요소의 offset 정보 가져오기
const offset = getOffset(element);
```

### HTML Element Utils

HTML 엘리먼트 관련 유틸리티를 제공합니다.

```typescript
import {
  focusableSelector,
  findFocusableAll,
  findFocusableFirst,
  findFocusableLast,
  hasContentSelector
} from "@simplysm/core-browser";

// 포커스 가능한 모든 요소 찾기
const focusables = findFocusableAll(container);

// 첫 번째 포커스 가능한 요소 찾기
const first = findFocusableFirst(container);

// 마지막 포커스 가능한 요소 찾기
const last = findFocusableLast(container);
```

## 라이선스

Apache-2.0
