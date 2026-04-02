# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/core-browser` — 브라우저 전용 유틸리티 패키지. DOM 프로토타입 확장, 파일 다운로드/업로드, HTTP fetch, IndexedDB 추상화를 제공한다. 소스 파일 8개.

## Architecture

```
src/
├── extensions/       ← DOM 프로토타입 확장 (사이드 이펙트 모듈, 2개)
│   ├── element-ext.ts       ← Element 프로토타입 확장 + 정적 유틸 함수
│   └── html-element-ext.ts  ← HTMLElement 프로토타입 확장
└── utils/            ← 순수 유틸리티 함수 및 클래스 (5개)
    ├── download.ts          ← Blob 파일 다운로드
    ├── fetch.ts             ← URL 바이너리 다운로드 (진행 콜백 지원)
    ├── file-dialog.ts       ← 파일 선택 대화상자
    ├── IndexedDbStore.ts    ← IndexedDB 저수준 CRUD 래퍼
    └── IndexedDbVirtualFs.ts ← IndexedDB 기반 가상 파일시스템
```

## tsconfig 고유 설정

루트 `tsconfig.json`을 extends하며, 아래 항목만 추가된다:

```json
{
  "compilerOptions": {
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  }
}
```

DOM API를 사용하는 파일은 반드시 이 패키지 안에 위치해야 한다. `core-common`이나 `core-node`에는 DOM 타입이 없다.

## Key Patterns

### DOM 프로토타입 확장

`extensions/` 파일은 `sideEffects` 필드에 등록된 사이드 이펙트 모듈이다. 반드시 `import "./extensions/element-ext"` 형태로 먼저 임포트해야 프로토타입이 등록된다. `index.ts`가 이를 자동 처리하므로, 패키지 전체를 임포트하면 별도 처리가 불필요하다.

확장은 `declare global` + `prototype` 할당 패턴을 따른다:

```typescript
declare global {
  interface Element {
    findAll<TEl extends Element = Element>(selector: string): TEl[];
  }
}

Element.prototype.findAll = function <TEl extends Element = Element>(selector: string): TEl[] {
  const trimmed = selector.trim();
  if (trimmed === "") return [];
  return Array.from(this.querySelectorAll<TEl>(trimmed));
};
```

- `element-ext.ts`: `Element` 확장 — `findAll`, `findFirst`, `prependChild`, `getParents`, `findFocusableParent`, `findFirstFocusableChild`, `isOffsetElement`, `isVisible`
- `html-element-ext.ts`: `HTMLElement` 확장 — `repaint`, `getRelativeOffset`, `scrollIntoViewIfNeeded`

프로토타입 확장 외에, `element-ext.ts`는 이벤트 핸들러용 정적 함수도 내보낸다: `copyElement`, `pasteToElement`, `getBounds`.

### IndexedDbStore / IndexedDbVirtualFs

`IndexedDbStore`는 IndexedDB를 Promise 기반으로 래핑한 저수준 클래스다. 생성자에서 DB 이름, 버전, 스토어 설정을 받아 자기 완결적으로 동작한다. `open()`은 중복 호출에 안전하며, `withStore()`로 트랜잭션을 명시적으로 제어한다.

```typescript
const store = new IndexedDbStore("myDb", 1, [{ name: "items", keyPath: "id" }]);

await store.put("items", { id: "key1", value: "hello" });
const item = await store.get<MyType>("items", "key1");
await store.delete("items", "key1");
const all = await store.getAll<MyType>("items");
store.close();
```

`IndexedDbVirtualFs`는 `IndexedDbStore` 위에 경로 기반 가상 파일시스템을 구현한다. `IndexedDbStore` 인스턴스를 주입받아 사용한다. 키는 `/path/to/file` 형태의 문자열이다.

```typescript
const fs = new IndexedDbVirtualFs(store, "files", "path");

await fs.putEntry("/dir/file.txt", "file", base64Data);
const entry = await fs.getEntry("/dir/file.txt");
await fs.deleteByPrefix("/dir");
const children = await fs.listChildren("/dir/");
```

### 바이너리 / 파일 유틸

- `downloadBlob(blob, fileName)` — Blob을 파일로 다운로드 (링크 클릭 방식)
- `fetchUrlBytes(url, options?)` — URL에서 `Uint8Array` 다운로드. `Content-Length` 존재 시 사전 할당, 없으면 청크 수집 후 `bytes.concat` 병합. 진행 콜백은 `options.onProgress`로 수신
- `openFileDialog(options?)` — 파일 선택 대화상자를 프로그래밍 방식으로 열기. 취소 시 `undefined` 반환

## Testing

**프레임워크**: Vitest (jsdom 환경)

테스트 디렉토리가 `src/` 구조를 미러링한다: `tests/extensions/`, `tests/utils/`

프로토타입 확장 테스트는 확장 모듈을 직접 임포트한 뒤 `document.createElement`로 실제 DOM 요소를 생성하여 검증한다:

```typescript
import "../../src/extensions/element-ext";
import { copyElement } from "../../src/extensions/element-ext";

describe("Element 프로토타입 확장", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("...", () => { /* ... */ });
});
```

`IndexedDbStore` 테스트는 DB 이름 충돌을 방지하기 위해 `uniqueDbName()` 헬퍼로 테스트마다 고유한 DB 이름을 생성한다. `afterEach`에서 반드시 `store.close()`를 호출한다.
