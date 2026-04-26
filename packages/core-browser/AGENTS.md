# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/core-browser/README.md`를 참조한다.

## Package Overview

`@simplysm/core-browser`는 브라우저 전용 DOM/파일/IndexedDB 유틸리티 패키지이다. 공개 진입점은 `src/index.ts`이며, 소스 파일은 7개이다.

이 패키지는 DOM API, ClipboardEvent, IntersectionObserver, IndexedDB, URL/Object URL을 직접 사용하므로 브라우저 런타임을 전제로 한다. `src/index.ts`는 `Element`와 `HTMLElement` 프로토타입 확장 모듈을 사이드 이펙트로 import한 뒤 관련 함수와 클래스를 공개한다.

## Architecture

```text
src/
  index.ts                         # side-effect 확장 로드 + 공개 API 재내보내기
  extensions/
    element-ext.ts                 # Element prototype 확장, clipboard helper, getBounds
    html-element-ext.ts            # HTMLElement prototype 확장
  utils/
    download.ts                    # Blob 다운로드
    fetch.ts                       # fetch 기반 Uint8Array 다운로드
    file-dialog.ts                 # 프로그래밍 방식 파일 선택
    IndexedDbStore.ts              # Promise 기반 IndexedDB store wrapper
    IndexedDbVirtualFs.ts          # IndexedDbStore 기반 경로형 가상 파일시스템
```

## Key Patterns

### Prototype 확장은 모듈 로드 시 적용한다

`src/index.ts`는 확장 모듈을 side-effect import로 먼저 로드한다. 소비자가 `@simplysm/core-browser`를 import하면 `Element.prototype`과 `HTMLElement.prototype` 메서드가 즉시 등록된다.

```typescript
import "./extensions/element-ext";
import "./extensions/html-element-ext";
```

확장 메서드를 추가하거나 수정할 때는 `declare global`의 DOM 인터페이스 선언과 실제 `prototype` 구현을 같은 파일에서 함께 갱신한다. 메서드가 값을 찾지 못하는 경우는 기존 패턴처럼 `undefined`를 반환한다.

### DOM 조회 helper는 빈 선택자를 방어한다

`Element.findAll`과 `Element.findFirst`는 선택자를 `trim()`한 뒤 빈 문자열이면 DOM API를 호출하지 않고 각각 `[]`, `undefined`를 반환한다.

```typescript
Element.prototype.findFirst = function <TEl extends Element = Element>(
  selector: string,
): TEl | undefined {
  const trimmed = selector.trim();
  if (trimmed === "") return undefined;
  return this.querySelector<TEl>(trimmed) ?? undefined;
};
```

선택자 기반 API를 추가할 때도 빈 문자열 입력이 DOMException으로 흘러가지 않도록 같은 방식으로 처리한다.

### 브라우저 이벤트 helper는 처리 대상이 아니면 조용히 반환한다

`copyElement`와 `pasteToElement`는 `clipboardData`가 없거나 이벤트 대상이 `Element`가 아니면 아무 동작 없이 반환한다. 대상 요소 안에서 첫 번째 `input, textarea`만 처리하며, `pasteToElement`는 값을 전체 교체한 뒤 `input` 이벤트를 발생시킨다.

```typescript
const clipboardData = event.clipboardData;
const target = event.target;
if (clipboardData == null || !(target instanceof Element)) return;
```

이 패키지의 DOM 이벤트 helper는 이벤트 전파 제어를 최소화하고, 실제로 값을 처리한 경우에만 `event.preventDefault()`를 호출한다.

### IndexedDB wrapper는 연결과 트랜잭션 상태를 내부에서 정리한다

`IndexedDbStore.open()`은 열린 DB와 열기 중인 Promise를 캐시한다. `versionchange`와 `close` 이벤트에서는 내부 상태를 초기화한다.

```typescript
db.onversionchange = () => {
  db.close();
  this._db = undefined;
  this._opening = undefined;
};
```

`withStore()`는 콜백 실행 중 에러가 발생하면 트랜잭션을 abort하고, 정상 경로에서는 `tx.oncomplete` 이후에 결과를 resolve한다. IndexedDB 작업을 추가할 때는 `withStore()`를 우회하지 말고 이 트랜잭션 완료 대기 패턴을 유지한다.

### 파일/바이너리 유틸리티는 브라우저 자원 해제를 포함한다

`downloadBlob()`은 `URL.createObjectURL()`로 만든 URL을 클릭 후 1초 뒤 revoke한다. `fetchUrlBytes()`는 `ReadableStreamDefaultReader`를 사용한 뒤 `finally`에서 `reader.releaseLock()`을 호출한다.

```typescript
try {
  // 다운로드 처리
} finally {
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

브라우저 리소스를 잡는 API를 추가할 때는 정상/예외 경로 모두에서 해제가 일어나도록 `try`/`finally` 구조를 사용한다.
