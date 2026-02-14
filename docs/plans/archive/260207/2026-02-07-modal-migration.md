# Modal 컴포넌트 마이그레이션 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 레거시 Angular `sd-modal`을 SolidJS로 전체 기능 포팅 (선언적 UI + 프로그래매틱 API)

**Architecture:** Dropdown.tsx 패턴(Portal + mount/animate + createPropSignal)을 기반으로, Modal 전용 기능(백드롭, 헤더, 드래그 이동, 8방향 리사이즈, float/fill 모드)을 추가한다. Context 기반 `useModal().show()` API로 프로그래매틱 사용을 지원한다.

**Tech Stack:** SolidJS, Tailwind CSS, Portal, clsx/twMerge, @tabler/icons-solidjs

**워크트리:** `.worktrees/solid-modal` (브랜치: `feature/solid-modal`)

**Chrome 84 제약:** CSS `inset`, `aspect-ratio`, `:is()`, `:where()` 사용 금지. `top-0 right-0 bottom-0 left-0` 대신 사용.

---

### Task 1: Tailwind z-index 설정 추가

**Files:**

- Modify: `packages/solid/tailwind.config.ts:33-37`

**Step 1: tailwind.config.ts에 modal z-index 추가**

```typescript
// packages/solid/tailwind.config.ts의 zIndex 섹션
zIndex: {
  "sidebar": "100",
  "sidebar-backdrop": "99",
  "dropdown": "1000",
  "modal-backdrop": "1999",
  "modal": "2000",
},
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/tailwind.config.ts
git commit -m "feat(solid): Modal용 z-index 추가 (modal: 2000, modal-backdrop: 1999)"
```

---

### Task 2: ModalContext.ts 생성

**Files:**

- Create: `packages/solid/src/components/disclosure/ModalContext.ts`

**Step 1: ModalContext.ts 작성**

```typescript
import { createContext, useContext, type Component, type JSX } from "solid-js";

export interface ModalShowOptions {
  title: string;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  useCloseByBackdrop?: boolean;
  useCloseByEscapeKey?: boolean;
  resizable?: boolean;
  movable?: boolean;
  float?: boolean;
  fill?: boolean;
  widthPx?: number;
  heightPx?: number;
  minWidthPx?: number;
  minHeightPx?: number;
  position?: "bottom-right" | "top-right";
  headerStyle?: JSX.CSSProperties | string;
  canDeactivate?: () => boolean;
}

export interface ModalContentProps<T = undefined> {
  close: (result?: T) => void;
}

export interface ModalContextValue {
  show<T = undefined>(content: Component<ModalContentProps<T>>, options: ModalShowOptions): Promise<T | undefined>;
}

export const ModalContext = createContext<ModalContextValue>();

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
}
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 린트 실행**

Run: `pnpm lint packages/solid/src/components/disclosure/ModalContext.ts`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/components/disclosure/ModalContext.ts
git commit -m "feat(solid): ModalContext 및 useModal hook 추가"
```

---

### Task 3: Modal.tsx — 테스트 먼저 작성

**Files:**

- Create: `packages/solid/tests/components/disclosure/Modal.spec.tsx`

**참고 파일:**

- 테스트 패턴: `packages/solid/tests/components/overlay/Dropdown.spec.tsx`
- 렌더/이벤트: `@solidjs/testing-library` (render, fireEvent, waitFor)
- Mock: `vitest` (vi.fn, vi.stubGlobal)

**Step 1: 기본 테스트 작성**

```tsx
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Modal } from "../../../src/components/disclosure/Modal";

describe("Modal 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("open=true일 때 모달이 렌더링된다", async () => {
      render(() => (
        <Modal open={true} title="테스트 모달">
          <div data-testid="content">모달 내용</div>
        </Modal>
      ));

      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });
    });

    it("open=false일 때 모달이 DOM에 없다", () => {
      render(() => (
        <Modal open={false} title="테스트 모달">
          <div data-testid="content">모달 내용</div>
        </Modal>
      ));

      const content = document.querySelector('[data-testid="content"]');
      expect(content).toBeNull();
    });

    it("data-modal 속성이 설정된다", async () => {
      render(() => (
        <Modal open={true} title="테스트 모달">
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        const modal = document.querySelector("[data-modal]");
        expect(modal).not.toBeNull();
      });
    });

    it("제목이 표시된다", async () => {
      render(() => (
        <Modal open={true} title="내 모달 제목">
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        const modal = document.querySelector("[data-modal]");
        expect(modal).not.toBeNull();
        expect(modal!.textContent).toContain("내 모달 제목");
      });
    });
  });

  describe("헤더 옵션", () => {
    it("hideHeader=true일 때 헤더가 표시되지 않는다", async () => {
      render(() => (
        <Modal open={true} title="테스트" hideHeader>
          <div data-testid="content">내용</div>
        </Modal>
      ));

      await waitFor(() => {
        const content = document.querySelector('[data-testid="content"]');
        expect(content).not.toBeNull();
      });

      const header = document.querySelector("[data-modal-header]");
      expect(header).toBeNull();
    });

    it("hideCloseButton=true일 때 닫기 버튼이 없다", async () => {
      render(() => (
        <Modal open={true} title="테스트" hideCloseButton>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });

      const closeBtn = document.querySelector("[data-modal-close]");
      expect(closeBtn).toBeNull();
    });
  });

  describe("닫힘 동작", () => {
    it("닫기 버튼 클릭 시 onOpenChange(false)가 호출된다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Modal open={true} title="테스트" onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-modal-close]")).not.toBeNull();
      });

      fireEvent.click(document.querySelector("[data-modal-close]")!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("useCloseByBackdrop=true일 때 백드롭 클릭으로 닫힌다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Modal open={true} title="테스트" useCloseByBackdrop onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-modal-backdrop]")).not.toBeNull();
      });

      fireEvent.click(document.querySelector("[data-modal-backdrop]")!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("useCloseByBackdrop=false일 때 백드롭 클릭으로 닫히지 않는다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Modal open={true} title="테스트" onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-modal-backdrop]")).not.toBeNull();
      });

      fireEvent.click(document.querySelector("[data-modal-backdrop]")!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });

    it("useCloseByEscapeKey=true일 때 Escape로 닫힌다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Modal open={true} title="테스트" useCloseByEscapeKey onOpenChange={handleOpenChange}>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });

      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("canDeactivate가 false를 반환하면 닫히지 않는다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Modal open={true} title="테스트" onOpenChange={handleOpenChange} canDeactivate={() => false}>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-modal-close]")).not.toBeNull();
      });

      fireEvent.click(document.querySelector("[data-modal-close]")!);
      expect(handleOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("float 모드", () => {
    it("float=true일 때 백드롭이 없다", async () => {
      render(() => (
        <Modal open={true} title="테스트" float>
          <div data-testid="content">내용</div>
        </Modal>
      ));

      await waitFor(() => {
        expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
      });

      const backdrop = document.querySelector("[data-modal-backdrop]");
      expect(backdrop).toBeNull();
    });
  });

  describe("fill 모드", () => {
    it("fill=true일 때 다이얼로그에 fill 스타일이 적용된다", async () => {
      render(() => (
        <Modal open={true} title="테스트" fill>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.width).toBe("100%");
        expect(dialog.style.height).toBe("100%");
      });
    });
  });

  describe("크기 제어", () => {
    it("widthPx, heightPx가 적용된다", async () => {
      render(() => (
        <Modal open={true} title="테스트" widthPx={400} heightPx={300}>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.width).toBe("400px");
        expect(dialog.style.height).toBe("300px");
      });
    });

    it("minWidthPx, minHeightPx가 적용된다", async () => {
      render(() => (
        <Modal open={true} title="테스트" minWidthPx={300} minHeightPx={200}>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.style.minWidth).toBe("300px");
        expect(dialog.style.minHeight).toBe("200px");
      });
    });
  });

  describe("리사이즈", () => {
    it("resizable=true일 때 리사이즈 바가 렌더링된다", async () => {
      render(() => (
        <Modal open={true} title="테스트" resizable>
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        const bars = document.querySelectorAll("[data-resize-bar]");
        expect(bars.length).toBe(8);
      });
    });

    it("resizable=false(기본)일 때 리사이즈 바가 없다", async () => {
      render(() => (
        <Modal open={true} title="테스트">
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-modal]")).not.toBeNull();
      });

      const bars = document.querySelectorAll("[data-resize-bar]");
      expect(bars.length).toBe(0);
    });
  });

  describe("애니메이션", () => {
    it("열림 시 transition 클래스가 적용된다", async () => {
      render(() => (
        <Modal open={true} title="테스트">
          <div>내용</div>
        </Modal>
      ));

      await waitFor(() => {
        const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
        expect(dialog).not.toBeNull();
        expect(dialog.classList.contains("transition-[opacity,transform]")).toBe(true);
        expect(dialog.classList.contains("duration-200")).toBe(true);
      });
    });
  });
});
```

**Step 2: 테스트 실행 (실패 확인)**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Modal.spec.tsx --project=solid --run`
Expected: FAIL — Modal 모듈이 아직 없음

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/disclosure/Modal.spec.tsx
git commit -m "test(solid): Modal 컴포넌트 테스트 작성 (red phase)"
```

---

### Task 4: Modal.tsx — 구현

**Files:**

- Create: `packages/solid/src/components/disclosure/Modal.tsx`

**참고 파일:**

- 패턴 원본: `packages/solid/src/components/disclosure/Dropdown.tsx`
- 유틸리티: `packages/solid/src/utils/createPropSignal.ts`, `packages/solid/src/utils/mergeStyles.ts`
- 아이콘: `@tabler/icons-solidjs` → `IconX`
- 레거시 원본: `.legacy-packages/sd-angular/src/ui/overlay/modal/sd-modal.control.ts`

**Step 1: Modal.tsx 전체 구현 작성**

주요 구현 사항:

- `ModalProps` 인터페이스 (설계서의 Props 참조)
- mount/animate 패턴 (Dropdown과 동일: `mounted`, `animating`, double rAF, transitionend + 200ms fallback)
- `createPropSignal`으로 open 상태 controlled/uncontrolled
- Portal 사용, `data-modal` 속성
- 백드롭: `data-modal-backdrop`, float일 때 미표시
- 다이얼로그: `data-modal-dialog`, tabindex="0"
- 헤더: `data-modal-header`, `data-modal-close` (닫기 버튼)
- 콘텐츠: `data-modal-content`
- 리사이즈 바: `data-resize-bar` (8개, resizable일 때만)
- `canDeactivate` 체크: 닫기 버튼, 백드롭, Escape 모두에서 호출
- z-index 자동 관리: `onDialogFocus`에서 `document.querySelectorAll("[data-modal]")` 순회하여 최대값+1
- 드래그 이동: `onHeaderMouseDown` → `mousemove`/`mouseup` 이벤트 쌍 (레거시 로직 포팅)
- 리사이즈: `onResizeMouseDown` → 방향별 width/height/top/left 계산 (레거시 로직 포팅)
- fill 모드: dialog에 `width: 100%, height: 100%`, 라운딩/테두리 없음
- float 모드: 백드롭 없음, 낮은 elevation (`shadow-md`), pointer-events 조정
- position: `"bottom-right"` → `position: absolute, right: 3rem, bottom: 2rem`, `"top-right"` → `position: absolute, right: 2rem, top: 2rem`
- 애니메이션: `transition-[opacity,transform] duration-200 ease-out`, opacity + translateY(-6px)
- 크기: widthPx/heightPx → dialog style, minWidthPx/minHeightPx → dialog style, 기본 min-w-[200px]
- **Chrome 84 주의:** `top-0 right-0 bottom-0 left-0` 사용 (`inset-0` 금지)

Tailwind 클래스 설계:

```typescript
// 루트 wrapper
const wrapperClass = clsx("fixed", "top-0 right-0 bottom-0 left-0", "z-modal");

// 백드롭
const backdropClass = clsx(
  "absolute",
  "top-0 right-0 bottom-0 left-0",
  "z-modal-backdrop",
  "bg-black/30 dark:bg-black/50",
);

// 다이얼로그 기본
const dialogBaseClass = clsx(
  "relative",
  "mx-auto",
  "w-fit min-w-[200px]",
  "bg-white dark:bg-base-800",
  "shadow-2xl dark:shadow-black/40",
  "rounded-lg",
  "overflow-hidden",
  "focus:outline-none",
);

// 다이얼로그 float 변형
const dialogFloatClass = clsx("shadow-md dark:shadow-black/30", "border border-base-200 dark:border-base-700");

// 다이얼로그 fill 변형 (라운딩/테두리 없앰)
const dialogFillClass = clsx("rounded-none", "border-none");

// 헤더
const headerClass = clsx("flex items-center", "select-none", "border-b border-base-200 dark:border-base-700");

// 제목
const titleClass = clsx("flex-1", "px-4 py-2", "text-sm font-semibold");

// 닫기 버튼
const closeButtonClass = clsx(
  "inline-flex items-center justify-center",
  "px-3 py-2",
  "text-base-400 dark:text-base-500",
  "hover:text-base-600 dark:hover:text-base-300",
  "cursor-pointer",
  "transition-colors",
);

// 콘텐츠 영역
const contentClass = clsx("flex-1", "overflow-auto");
```

**Step 2: 테스트 실행 (통과 확인)**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Modal.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 4: 린트 실행**

Run: `pnpm lint packages/solid/src/components/disclosure/Modal.tsx`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/disclosure/Modal.tsx
git commit -m "feat(solid): Modal 컴포넌트 구현 (선언적 UI, 드래그/리사이즈/float/fill)"
```

---

### Task 5: ModalProvider.tsx — 테스트 먼저 작성

**Files:**

- Create: `packages/solid/tests/components/disclosure/ModalProvider.spec.tsx`

**Step 1: ModalProvider 테스트 작성**

```tsx
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import type { Component } from "solid-js";
import { ModalProvider } from "../../../src/components/disclosure/ModalProvider";
import { useModal, type ModalContentProps } from "../../../src/components/disclosure/ModalContext";

// 테스트용 모달 콘텐츠 컴포넌트
const TestContent: Component<ModalContentProps<string>> = (props) => (
  <div>
    <span data-testid="modal-content">모달 내용</span>
    <button data-testid="close-btn" onClick={() => props.close("result")}>
      닫기
    </button>
    <button data-testid="close-no-result" onClick={() => props.close()}>
      취소
    </button>
  </div>
);

// useModal을 호출하는 테스트용 컴포넌트
function TestApp() {
  const modal = useModal();

  const openModal = async () => {
    const result = await modal.show(TestContent, { title: "테스트 모달" });
    // result를 data 속성에 저장하여 테스트에서 확인
    document.body.setAttribute("data-modal-result", String(result ?? "undefined"));
  };

  return (
    <button data-testid="open-btn" onClick={openModal}>
      모달 열기
    </button>
  );
}

describe("ModalProvider", () => {
  it("show()로 모달이 표시된다", async () => {
    render(() => (
      <ModalProvider>
        <TestApp />
      </ModalProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="modal-content"]')).not.toBeNull();
    });
  });

  it("close(result) 호출 시 Promise가 result로 resolve된다", async () => {
    render(() => (
      <ModalProvider>
        <TestApp />
      </ModalProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="close-btn"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-testid="close-btn"]')!);

    await waitFor(() => {
      expect(document.body.getAttribute("data-modal-result")).toBe("result");
    });
  });

  it("close() 호출 시 Promise가 undefined로 resolve된다", async () => {
    render(() => (
      <ModalProvider>
        <TestApp />
      </ModalProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="close-no-result"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-testid="close-no-result"]')!);

    await waitFor(() => {
      expect(document.body.getAttribute("data-modal-result")).toBe("undefined");
    });
  });

  it("모달 제목이 표시된다", async () => {
    render(() => (
      <ModalProvider>
        <TestApp />
      </ModalProvider>
    ));

    fireEvent.click(document.querySelector('[data-testid="open-btn"]')!);

    await waitFor(() => {
      const modal = document.querySelector("[data-modal]");
      expect(modal).not.toBeNull();
      expect(modal!.textContent).toContain("테스트 모달");
    });
  });
});
```

**Step 2: 테스트 실행 (실패 확인)**

Run: `pnpm vitest packages/solid/tests/components/disclosure/ModalProvider.spec.tsx --project=solid --run`
Expected: FAIL — ModalProvider 모듈이 아직 없음

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/disclosure/ModalProvider.spec.tsx
git commit -m "test(solid): ModalProvider 테스트 작성 (red phase)"
```

---

### Task 6: ModalProvider.tsx — 구현

**Files:**

- Create: `packages/solid/src/components/disclosure/ModalProvider.tsx`

**참고 파일:**

- Context: `packages/solid/src/components/disclosure/ModalContext.ts`
- Modal UI: `packages/solid/src/components/disclosure/Modal.tsx`
- 레거시: `.legacy-packages/sd-angular/src/ui/overlay/modal/sd-modal.provider.ts`

**Step 1: ModalProvider.tsx 전체 구현**

```typescript
import {
  type Component,
  type ParentComponent,
  createSignal,
  For,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { Modal } from "./Modal";
import {
  ModalContext,
  type ModalContextValue,
  type ModalContentProps,
  type ModalShowOptions,
} from "./ModalContext";

interface ModalEntry {
  id: number;
  content: Component<ModalContentProps<any>>;
  options: ModalShowOptions;
  resolve: (value: any) => void;
  open: boolean;
  result: any;
}

let nextId = 0;

export const ModalProvider: ParentComponent = (props) => {
  const [entries, setEntries] = createSignal<ModalEntry[]>([]);

  const closeEntry = (id: number, result?: any) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, open: false, result } : e)),
    );
  };

  const removeEntry = (id: number) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        entry.resolve(entry.result);
      }
      return prev.filter((e) => e.id !== id);
    });
  };

  const show: ModalContextValue["show"] = (content, options) => {
    return new Promise((resolve) => {
      const id = nextId++;
      setEntries((prev) => [
        ...prev,
        { id, content, options, resolve, open: true, result: undefined },
      ]);
    });
  };

  return (
    <ModalContext.Provider value={{ show }}>
      {props.children}
      <For each={entries()}>
        {(entry) => (
          <Modal
            open={entry.open}
            onOpenChange={(open) => {
              if (!open) removeEntry(entry.id);
            }}
            title={entry.options.title}
            hideHeader={entry.options.hideHeader}
            hideCloseButton={entry.options.hideCloseButton}
            useCloseByBackdrop={entry.options.useCloseByBackdrop}
            useCloseByEscapeKey={entry.options.useCloseByEscapeKey}
            resizable={entry.options.resizable}
            movable={entry.options.movable}
            float={entry.options.float}
            fill={entry.options.fill}
            widthPx={entry.options.widthPx}
            heightPx={entry.options.heightPx}
            minWidthPx={entry.options.minWidthPx}
            minHeightPx={entry.options.minHeightPx}
            position={entry.options.position}
            headerStyle={entry.options.headerStyle}
            canDeactivate={entry.options.canDeactivate}
          >
            <Dynamic
              component={entry.content}
              close={(result: any) => closeEntry(entry.id, result)}
            />
          </Modal>
        )}
      </For>
    </ModalContext.Provider>
  );
};
```

**Step 2: 테스트 실행 (통과 확인)**

Run: `pnpm vitest packages/solid/tests/components/disclosure/ModalProvider.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: Modal 테스트도 함께 실행**

Run: `pnpm vitest packages/solid/tests/components/disclosure/ --project=solid --run`
Expected: PASS

**Step 4: 타입체크 & 린트**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid/src/components/disclosure/ModalProvider.tsx`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/disclosure/ModalProvider.tsx
git commit -m "feat(solid): ModalProvider 구현 (프로그래매틱 show/close API)"
```

---

### Task 7: index.ts export 추가

**Files:**

- Modify: `packages/solid/src/index.ts:44-46`

**Step 1: disclosure 섹션에 export 추가**

```typescript
// disclosure
export * from "./components/disclosure/Collapse";
export * from "./components/disclosure/Dropdown";
export * from "./components/disclosure/Modal";
export * from "./components/disclosure/ModalContext";
export * from "./components/disclosure/ModalProvider";
```

**Step 2: 타입체크 & 린트**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid/src/index.ts`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): Modal, ModalContext, ModalProvider를 index.ts에서 export"
```

---

### Task 8: 데모 페이지 추가

**Files:**

- Create: `packages/solid-demo/src/pages/disclosure/ModalPage.tsx`
- Modify: `packages/solid-demo/src/pages/Home.tsx:52-54` (사이드바 메뉴에 Modal 추가)
- Modify: `packages/solid-demo/src/main.tsx:33` (라우트 추가)

**참고 파일:**

- 데모 패턴: `packages/solid-demo/src/pages/disclosure/DropdownPage.tsx`
- 사이드바 메뉴: `packages/solid-demo/src/pages/Home.tsx:49-55`
- 라우팅: `packages/solid-demo/src/main.tsx:32-33`

**Step 1: ModalPage.tsx 데모 작성**

데모 섹션:

1. **기본 모달** — 버튼 클릭으로 열기/닫기
2. **프로그래매틱 모달** — `useModal().show()` 로 열고 결과 받기
3. **Float 모달** — 백드롭 없는 플로팅 윈도우
4. **Fill 모달** — 전체 화면 모달
5. **리사이즈/이동** — resizable + movable
6. **닫기 옵션** — 백드롭/Escape/canDeactivate

패턴: `TopbarContainer` + `Topbar` 래퍼, `space-y-8` 섹션 구분, `createSignal` 상태 관리

**Step 2: Home.tsx 사이드바에 Modal 메뉴 항목 추가**

Disclosure 섹션의 children에 추가:

```typescript
{ title: "Modal", href: "/home/disclosure/modal" },
```

**Step 3: main.tsx에 라우트 추가**

```typescript
<Route path="/home/disclosure/modal" component={lazy(() => import("./pages/disclosure/ModalPage"))} />
```

**Step 4: 타입체크**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid-demo/src/pages/disclosure/ModalPage.tsx packages/solid-demo/src/pages/Home.tsx packages/solid-demo/src/main.tsx
git commit -m "feat(solid-demo): Modal 데모 페이지 추가"
```

---

### Task 9: 전체 검증

**Step 1: 전체 테스트 실행**

Run: `pnpm vitest --project=solid --run`
Expected: 모든 테스트 PASS

**Step 2: 전체 타입체크**

Run: `pnpm typecheck packages/solid && pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 3: 전체 린트**

Run: `pnpm lint packages/solid packages/solid-demo`
Expected: PASS

**Step 4: 데모 앱 시각 확인**

Run: `pnpm dev` (별도 터미널)

- `http://localhost:40081/solid-demo/` 접속
- Disclosure → Modal 메뉴 클릭
- 각 데모 섹션 동작 확인
- Playwright MCP 스크린샷으로 확인 가능

---

## 재사용할 기존 코드

| 유틸리티              | 경로                                                                   | 용도                         |
| --------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| `createPropSignal`    | `packages/solid/src/utils/createPropSignal.ts`                         | controlled/uncontrolled 상태 |
| `mergeStyles`         | `packages/solid/src/utils/mergeStyles.ts`                              | CSS 스타일 병합              |
| `Icon`                | `packages/solid/src/components/display/Icon.tsx`                       | 닫기 아이콘                  |
| `IconX`               | `@tabler/icons-solidjs`                                                | X 아이콘                     |
| `clsx` + `twMerge`    | 외부 의존성                                                            | Tailwind 클래스 관리         |
| `Portal`              | `solid-js/web`                                                         | DOM 계층 분리                |
| `Dropdown.tsx`        | `packages/solid/src/components/disclosure/Dropdown.tsx`                | mount/animate 패턴 참조      |
| `sd-modal.control.ts` | `.legacy-packages/sd-angular/src/ui/overlay/modal/sd-modal.control.ts` | 드래그/리사이즈 로직 참조    |
