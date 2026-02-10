# @simplysm/core-browser

Simplysm 프레임워크의 브라우저 전용 유틸리티 패키지이다. DOM 요소 탐색, 클립보드 처리, Blob 다운로드, 바이너리 다운로드 등 브라우저 환경에서 자주 필요한 기능을 제공한다.

이 패키지는 `Element`와 `HTMLElement` 프로토타입을 확장하여 인스턴스 메서드로 직접 호출할 수 있는 API와, 정적 함수 형태의 유틸리티를 모두 포함한다.

## 설치

```bash
npm install @simplysm/core-browser
# or
pnpm add @simplysm/core-browser
```

### 의존성

| 패키지 | 설명 |
|--------|------|
| `@simplysm/core-common` | 공통 유틸리티 (에러 클래스 등) |
| `tabbable` | 포커스 가능 요소 판별 |

## 주요 모듈

### Element 확장 메서드

`import "@simplysm/core-browser"` 시 `Element.prototype`에 자동으로 추가되는 인스턴스 메서드이다. side-effect import로 동작한다.

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `findAll<T>(selector)` | `T[]` | 셀렉터로 하위 요소 전체 검색 |
| `findFirst<T>(selector)` | `T \| undefined` | 셀렉터로 첫 번째 매칭 요소 검색 |
| `prependChild<T>(child)` | `T` | 요소를 첫 번째 자식으로 삽입 |
| `getParents()` | `Element[]` | 모든 부모 요소 목록 반환 (가까운 순서) |
| `findFocusableParent()` | `HTMLElement \| undefined` | 부모 중 첫 번째 포커스 가능 요소 검색 |
| `findFirstFocusableChild()` | `HTMLElement \| undefined` | 자식 중 첫 번째 포커스 가능 요소 검색 |
| `isOffsetElement()` | `boolean` | offset 기준 요소 여부 확인 |
| `isVisible()` | `boolean` | 요소 가시성 확인 |

### HTMLElement 확장 메서드

`HTMLElement.prototype`에 자동으로 추가되는 인스턴스 메서드이다.

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `repaint()` | `void` | 강제 리페인트 트리거 |
| `getRelativeOffset(parent)` | `{ top, left }` | 부모 요소 기준 상대 위치 계산 |
| `scrollIntoViewIfNeeded(target, offset?)` | `void` | 고정 영역에 가려진 경우 스크롤 조정 |

### 정적 함수

| 함수 | 반환 타입 | 설명 |
|------|-----------|------|
| `copyElement(event)` | `void` | 요소 내용을 클립보드에 복사 |
| `pasteToElement(event)` | `void` | 클립보드 내용을 요소에 붙여넣기 |
| `getBounds(els, timeout?)` | `Promise<ElementBounds[]>` | IntersectionObserver를 사용한 요소 bounds 조회 |

### BlobUtils

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `BlobUtils.download(blob, fileName)` | `void` | Blob을 파일로 다운로드 |

### downloadBytes

| 함수 | 반환 타입 | 설명 |
|------|-----------|------|
| `downloadBytes(url, options?)` | `Promise<Uint8Array>` | URL에서 바이너리 데이터 다운로드 (진행률 콜백 지원) |

### 타입

| 타입 | 설명 |
|------|------|
| `ElementBounds` | 요소 bounds 정보 (`target`, `top`, `left`, `width`, `height`) |
| `DownloadProgress` | 다운로드 진행률 정보 (`receivedLength`, `contentLength`) |

## 사용 예시

### Element 확장 메서드

```typescript
import "@simplysm/core-browser";

// 하위 요소 검색
const buttons = container.findAll<HTMLButtonElement>("button.primary");
const firstInput = container.findFirst<HTMLInputElement>("input[type='text']");

// 요소를 첫 번째 자식으로 삽입
const newEl = document.createElement("div");
container.prependChild(newEl);

// 모든 부모 요소 조회 (가까운 부모부터 순서대로)
const parents = element.getParents();

// 포커스 가능 요소 검색 (tabbable 라이브러리 기반)
const focusableParent = element.findFocusableParent();
const focusableChild = element.findFirstFocusableChild();

// 요소 상태 확인
if (element.isOffsetElement()) {
  // position이 relative, absolute, fixed, sticky 중 하나
}

if (element.isVisible()) {
  // 요소가 화면에 보임 (clientRects 존재, visibility !== "hidden", opacity !== "0")
}
```

### HTMLElement 확장 메서드

```typescript
import "@simplysm/core-browser";

// 강제 리페인트 (CSS 애니메이션 재시작 등에 유용)
element.repaint();

// 부모 요소 기준 상대 위치 계산 (CSS top/left에 직접 사용 가능)
const offset = element.getRelativeOffset(document.body);
popup.style.top = `${offset.top}px`;
popup.style.left = `${offset.left}px`;

// 셀렉터로 부모 지정도 가능
const offset2 = element.getRelativeOffset(".scroll-container");

// 고정 헤더/열이 있는 테이블에서 스크롤 위치 조정
const scrollContainer = document.getElementById("table-body") as HTMLElement;
const targetRow = document.getElementById("row-42") as HTMLElement;

scrollContainer.scrollIntoViewIfNeeded(
  { top: targetRow.offsetTop, left: targetRow.offsetLeft },
  { top: 50, left: 120 }, // 고정 헤더 높이 50px, 고정 열 너비 120px
);
```

### 클립보드 처리

```typescript
import { copyElement, pasteToElement } from "@simplysm/core-browser";

// copy 이벤트 핸들러에서 사용
// 대상 요소 내의 첫 번째 input/textarea 값을 클립보드에 복사
element.addEventListener("copy", (e) => copyElement(e));

// paste 이벤트 핸들러에서 사용
// 클립보드 내용을 대상 요소 내의 첫 번째 input/textarea에 붙여넣기
element.addEventListener("paste", (e) => pasteToElement(e));
```

### 요소 bounds 비동기 조회

```typescript
import { getBounds } from "@simplysm/core-browser";
import type { ElementBounds } from "@simplysm/core-browser";

const el1 = document.getElementById("item1")!;
const el2 = document.getElementById("item2")!;

// IntersectionObserver를 사용하여 bounds 정보를 비동기로 조회
const bounds: ElementBounds[] = await getBounds([el1, el2]);

for (const b of bounds) {
  console.log(b.target);  // 측정 대상 요소
  console.log(b.top);     // 뷰포트 기준 상단 위치
  console.log(b.left);    // 뷰포트 기준 왼쪽 위치
  console.log(b.width);   // 요소 너비
  console.log(b.height);  // 요소 높이
}

// 커스텀 타임아웃 지정 (기본값: 5000ms)
// 타임아웃 초과 시 TimeoutError 발생
const bounds2 = await getBounds([el1], 3000);
```

### Blob 다운로드

```typescript
import { BlobUtils } from "@simplysm/core-browser";

// Blob 객체를 파일로 다운로드
const blob = new Blob(["Hello, World!"], { type: "text/plain" });
BlobUtils.download(blob, "hello.txt");

// Excel 파일 등 바이너리 데이터 다운로드
const excelBlob = new Blob([excelData], {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});
BlobUtils.download(excelBlob, "report.xlsx");
```

### 바이너리 다운로드 (진행률 지원)

```typescript
import { downloadBytes } from "@simplysm/core-browser";
import type { DownloadProgress } from "@simplysm/core-browser";

// 기본 사용
const data: Uint8Array = await downloadBytes("https://example.com/file.bin");

// 진행률 콜백 사용
const data2 = await downloadBytes("https://example.com/large-file.zip", {
  onProgress: (progress: DownloadProgress) => {
    const percent = progress.contentLength > 0
      ? Math.round((progress.receivedLength / progress.contentLength) * 100)
      : 0;
    console.log(`다운로드 진행: ${percent}%`);
  },
});
```

## 주의사항

- 이 패키지는 **브라우저 전용**이다. Node.js 환경에서는 사용할 수 없다.
- `Element`와 `HTMLElement` 프로토타입 확장은 **side-effect import**로 동작한다. `import "@simplysm/core-browser"` 또는 패키지에서 아무 항목이나 import하면 자동으로 확장이 적용된다.
- `getBounds()` 함수는 `IntersectionObserver`를 사용하므로 비동기로 동작하며, 지정된 타임아웃(기본 5000ms) 내에 모든 요소가 관측되지 않으면 `TimeoutError`가 발생한다.
- `getRelativeOffset()` 메서드는 CSS `transform`이 적용된 요소도 올바르게 처리한다. 중간 요소들의 border 두께와 스크롤 위치도 계산에 포함된다.
- `scrollIntoViewIfNeeded()` 메서드는 대상이 위쪽/왼쪽 경계를 벗어난 경우만 처리한다. 아래쪽/오른쪽 방향은 브라우저 기본 포커스 스크롤에 의존한다.
- `downloadBytes()` 함수는 `Content-Length` 헤더를 알 수 있는 경우 미리 할당하여 메모리 효율성을 높이고, chunked encoding인 경우에는 청크를 수집 후 병합한다.
- `pasteToElement()` 함수는 대상 input/textarea의 전체 값을 교체한다. 커서 위치나 선택 영역을 고려하지 않는다.

## 라이선스

Apache-2.0
