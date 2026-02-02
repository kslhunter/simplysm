# @simplysm/core-browser

심플리즘 프레임워크의 브라우저 전용 유틸리티 패키지이다.

## 설치

```bash
npm install @simplysm/core-browser
# or
pnpm add @simplysm/core-browser
```

## 주요 기능

### BlobUtils

Blob 파일 다운로드 유틸리티를 제공한다.

```typescript
import { BlobUtils } from "@simplysm/core-browser";

// Blob을 파일로 다운로드
BlobUtils.download(blob, "report.xlsx");
```

### ElementUtils

DOM 요소 탐색 및 클립보드 처리 유틸리티를 제공한다.

```typescript
import { ElementUtils } from "@simplysm/core-browser";

// 요소를 첫 번째 자식으로 삽입
const inserted = ElementUtils.prependChild(container, newElement);

// 하위 요소 검색 (:scope 자동 적용)
const buttons = ElementUtils.findAll(container, "button");
const firstInput = ElementUtils.findFirst(container, "input");

// 모든 부모 요소 조회
const parents = ElementUtils.getParents(element);

// 부모 중 첫 번째 포커스 가능 요소 검색
const focusableParent = ElementUtils.findFocusableParent(element);

// 요소가 offset 기준 요소인지 확인 (position: relative/absolute/fixed/sticky)
if (ElementUtils.isOffsetElement(element)) {
  // ...
}

// 요소 가시성 확인
if (ElementUtils.isVisible(element)) {
  // ...
}

// 클립보드 복사/붙여넣기 (이벤트 핸들러에서 사용)
element.addEventListener("copy", (e) => ElementUtils.copyElement(e));
element.addEventListener("paste", (e) => ElementUtils.pasteToElement(e));
```

### HtmlElementUtils

HTMLElement 전용 유틸리티를 제공한다.

```typescript
import { HtmlElementUtils } from "@simplysm/core-browser";

// 강제 리페인트 (CSS 애니메이션 재시작 등에 유용)
HtmlElementUtils.repaint(element);

// 부모 요소 기준 상대 위치 계산
const offset = HtmlElementUtils.getRelativeOffset(element, document.body);
// 또는 셀렉터 사용
const offset2 = HtmlElementUtils.getRelativeOffset(element, ".container");

// 고정 헤더가 있는 경우 스크롤 위치 조정
const scrollContainer = document.getElementById("container") as HTMLElement;
const target = document.getElementById("item") as HTMLElement;

HtmlElementUtils.scrollIntoViewIfNeeded(
  scrollContainer,
  { top: target.offsetTop, left: target.offsetLeft },
  { top: 50, left: 0 }, // 고정 헤더 높이, 고정 열 너비
);

// 요소들의 bounds 정보 비동기 조회 (IntersectionObserver 사용)
// timeout 기본값은 5000ms이며, 초과 시 TimeoutError 발생
const bounds = await HtmlElementUtils.getBounds([el1, el2]);
// 또는 커스텀 타임아웃 지정
const bounds2 = await HtmlElementUtils.getBounds([el1, el2], 3000);

// ElementBounds 구조: { target, top, left, width, height }
console.log(bounds[0].target); // 측정 대상 요소
console.log(bounds[0].top);    // 뷰포트 기준 상단 위치
console.log(bounds[0].left);   // 뷰포트 기준 왼쪽 위치
console.log(bounds[0].width);  // 요소 너비
console.log(bounds[0].height); // 요소 높이
```

## 라이선스

Apache-2.0
