# AddressSearch 마이그레이션 디자인

## 원본

- `packages/sd-angular/src/features/address/sd-address-search.modal.ts` (v12 Angular)
- Daum 우편번호 검색 모달 (`daum.Postcode` API 사용)

## 대상

- `packages/solid/src/features/address/AddressSearch.tsx` (v13 SolidJS)

## 반환 타입

```typescript
export interface AddressSearchResult {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}
```

## 컴포넌트

- **이름**: `AddressSearchContent`
- **역할**: `useDialogInstance<AddressSearchResult>()`로 다이얼로그 인스턴스 접근, 주소 선택 시 `close(result)` 호출
- **헬퍼 함수 없음** — 호출자가 직접 `dialog.show()` 사용

## 사용 예시

```tsx
const dialog = useDialog();
const result = await dialog.show<AddressSearchResult>(
  () => <AddressSearchContent />,
  { header: "주소 검색" }
);
```

## 동작 흐름

1. `onMount`에서 Daum Postcode 스크립트 동적 로드 (이미 있으면 건너뜀)
2. 스크립트 로드 완료 후 `daum.Postcode`를 content div에 embed
3. `initialized` signal → `true` → BusyContainer 해제
4. 사용자가 주소 선택 → `oncomplete`에서 `instance.close(result)` 호출
5. `onresize`에서 content div 높이 조정

## v12 → v13 매핑

| v12 (Angular)          | v13 (SolidJS)                          |
| ---------------------- | -------------------------------------- |
| `OnInit`               | `onMount`                              |
| `viewChild` ref        | `let contentEl!: HTMLDivElement`       |
| `$signal`              | `createSignal`                         |
| `close.emit()`         | `useDialogInstance().close()`          |
| `SdBusyContainerControl` | `BusyContainer`                      |

## Export

- `index.ts`에 `features` 영역 신규 추가
- `export * from "./features/address/AddressSearch"`

---

# AddressSearch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** v12 Angular `SdAddressSearchModal`을 v13 SolidJS `AddressSearchContent`로 마이그레이션

**Architecture:** `useDialogInstance` 기반 프로그래매틱 다이얼로그 콘텐츠 컴포넌트. Daum Postcode 스크립트를 동적 로드 후 embed하고, 주소 선택 시 `close(result)`로 결과 반환.

**Tech Stack:** SolidJS, Daum Postcode API, `@simplysm/solid` (BusyContainer, DialogInstance)

---

### Task 1: AddressSearchContent 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/features/address/AddressSearch.tsx`

**Step 1: Write the failing test**

Test: `packages/solid/tests/features/address/AddressSearch.spec.tsx`

```tsx
import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { DialogProvider } from "../../../src/components/disclosure/DialogProvider";
import { useDialog } from "../../../src/components/disclosure/DialogContext";
import { AddressSearchContent } from "../../../src/features/address/AddressSearch";

function TestApp() {
  const dialog = useDialog();

  return (
    <button
      data-testid="open-btn"
      onClick={() => {
        void dialog.show(() => <AddressSearchContent />, {
          header: "주소 검색",
        });
      }}
    >
      주소 검색 열기
    </button>
  );
}

describe("AddressSearchContent", () => {
  it("마운트 시 Daum Postcode 위젯이 content 영역에 렌더된다", async () => {
    const { getByTestId } = render(() => (
      <DialogProvider>
        <TestApp />
      </DialogProvider>
    ));

    getByTestId("open-btn").click();

    // Daum Postcode 스크립트 로드 + 위젯 embed 대기
    await waitFor(
      () => {
        const content = document.querySelector("[data-address-content]");
        expect(content).not.toBeNull();
        // Daum Postcode 위젯이 embed되면 content 내부에 자식 요소가 생긴다
        expect(content!.children.length).toBeGreaterThan(0);
      },
      { timeout: 10000 },
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/features/address/AddressSearch.spec.tsx --project=solid`
Expected: FAIL — `AddressSearchContent` 모듈을 찾을 수 없음

**Step 3: Write minimal implementation**

`packages/solid/src/features/address/AddressSearch.tsx`:

```tsx
import { type Component, createSignal, onMount } from "solid-js";
import { BusyContainer } from "../../components/feedback/busy/BusyContainer";
import { useDialogInstance } from "../../components/disclosure/DialogInstanceContext";

export interface AddressSearchResult {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}

export const AddressSearchContent: Component = () => {
  const dialogInstance = useDialogInstance<AddressSearchResult>();

  const [initialized, setInitialized] = createSignal(false);
  let contentEl!: HTMLDivElement;

  onMount(async () => {
    if (!document.getElementById("daum_address")) {
      await new Promise<void>((resolve) => {
        const scriptEl = document.createElement("script");
        scriptEl.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        scriptEl.setAttribute("id", "daum_address");

        scriptEl.onload = (): void => {
          // @ts-expect-error -- Daum Postcode 글로벌 API
          daum.postcode.load(() => {
            resolve();
          });
        };
        document.head.appendChild(scriptEl);
      });
    }

    // @ts-expect-error -- Daum Postcode 글로벌 API
    new daum.Postcode({
      oncomplete: (data: any): void => {
        const addr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;

        let extraAddr = "";
        if (data.userSelectedType === "R") {
          if (data.bname !== "" && /[동로가]$/g.test(data.bname)) {
            extraAddr += data.bname;
          }

          if (data.buildingName !== "" && data.apartment === "Y") {
            extraAddr += extraAddr !== "" ? ", " + data.buildingName : data.buildingName;
          }

          if (extraAddr !== "") {
            extraAddr = " (" + extraAddr + ")";
          }
        }

        dialogInstance?.close({
          postNumber: data.zonecode,
          address: addr + extraAddr,
          buildingName: data.buildingName,
        });
      },
      onresize: (size: any): void => {
        contentEl.style.height = size.height + "px";
      },
      width: "100%",
      height: "100%",
    }).embed(contentEl, { autoClose: false });

    setInitialized(true);
  });

  return (
    <BusyContainer busy={!initialized()}>
      <div ref={contentEl} data-address-content style={{ "min-height": "100px" }} />
    </BusyContainer>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/features/address/AddressSearch.spec.tsx --project=solid`
Expected: PASS (Daum Postcode 위젯이 content 영역에 렌더됨, 네트워크 필요)

**Step 5: Commit**

```
feat(solid): add AddressSearchContent component
```

---

### Task 2: index.ts export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: index.ts에 features 영역 추가**

`//#endregion` (Helpers 영역 뒤)에 추가:

```typescript
//#region ========== Features ==========

// Address
export * from "./features/address/AddressSearch";

//#endregion
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 3: Commit**

```
feat(solid): export AddressSearch from index
```
