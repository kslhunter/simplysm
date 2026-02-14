# packages/solid 코드 리뷰 이슈 해결 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 코드 리뷰에서 발견된 10건의 이슈를 해결하여 packages/solid의 품질, DX, 코드 중복을 개선한다.

**Architecture:** 7개 Task로 분류: (1) createPropSignal 리네이밍, (2) createMountTransition 훅 추출, (3) createIMEHandler 훅 추출, (4) SharedData 버그 수정, (5) Dropdown resize 처리, (6) ServiceClient onCleanup 개선, (7) 에러 메시지 통일 + styles export 통일.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, Vitest

---

### Task 1: `createPropSignal` → `createControllableSignal` 리네이밍 (DX-3)

**Files:**

- Rename: `packages/solid/src/utils/createPropSignal.ts` → `packages/solid/src/utils/createControllableSignal.ts`
- Modify: `packages/solid/src/index.ts:92`
- Modify: 22개 컴포넌트 파일 (import 경로/함수명)
- Rename: `packages/solid/tests/utils/createPropSignal.spec.ts` → `packages/solid/tests/utils/createControllableSignal.spec.ts`

**Step 1: 유틸 파일 리네이밍**

`packages/solid/src/utils/createPropSignal.ts` → `packages/solid/src/utils/createControllableSignal.ts`로 파일명 변경하고 함수명도 변경:

```bash
git mv packages/solid/src/utils/createPropSignal.ts packages/solid/src/utils/createControllableSignal.ts
```

`createControllableSignal.ts` 내용에서 함수명과 JSDoc 변경:

```typescript
// 기존
export function createPropSignal<T>(options: {
// 변경
export function createControllableSignal<T>(options: {
```

JSDoc의 `createPropSignal` 참조도 `createControllableSignal`로 변경.

**Step 2: index.ts export 변경**

`packages/solid/src/index.ts:92`:

```typescript
// 기존
export { createPropSignal } from "./utils/createPropSignal";
// 변경
export { createControllableSignal } from "./utils/createControllableSignal";
```

**Step 3: 22개 컴포넌트 import/호출 일괄 변경**

다음 파일들에서 `createPropSignal` → `createControllableSignal` 변경 (import 경로 + 함수 호출):

- `packages/solid/src/components/form-control/checkbox/Checkbox.tsx`
- `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx`
- `packages/solid/src/components/form-control/checkbox/Radio.tsx`
- `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx`
- `packages/solid/src/components/form-control/color-picker/ColorPicker.tsx`
- `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx`
- `packages/solid/src/components/form-control/editor/RichTextEditor.tsx`
- `packages/solid/src/components/form-control/field/DatePicker.tsx`
- `packages/solid/src/components/form-control/field/DateTimePicker.tsx`
- `packages/solid/src/components/form-control/field/NumberInput.tsx`
- `packages/solid/src/components/form-control/field/TextInput.tsx`
- `packages/solid/src/components/form-control/field/Textarea.tsx`
- `packages/solid/src/components/form-control/field/TimePicker.tsx`
- `packages/solid/src/components/form-control/numpad/Numpad.tsx`
- `packages/solid/src/components/data/calendar/Calendar.tsx`
- `packages/solid/src/components/data/list/ListItem.tsx`
- `packages/solid/src/components/data/sheet/DataSheet.tsx`
- `packages/solid/src/components/disclosure/Dialog.tsx`
- `packages/solid/src/components/disclosure/Dropdown.tsx`
- `packages/solid/src/components/layout/kanban/Kanban.tsx`
- `packages/solid/src/components/navigation/Tabs.tsx`

각 파일에서:

```typescript
// 기존
import { createPropSignal } from "../../utils/createPropSignal";
const [value, setValue] = createPropSignal({
// 변경
import { createControllableSignal } from "../../utils/createControllableSignal";
const [value, setValue] = createControllableSignal({
```

**Step 4: 테스트 파일 리네이밍 및 수정**

```bash
git mv packages/solid/tests/utils/createPropSignal.spec.ts packages/solid/tests/utils/createControllableSignal.spec.ts
```

`createControllableSignal.spec.ts` 내용에서:

```typescript
// 기존
import { createPropSignal } from "../../src/utils/createPropSignal";
describe("createPropSignal hook", () => {
// 변경
import { createControllableSignal } from "../../src/utils/createControllableSignal";
describe("createControllableSignal hook", () => {
```

모든 `createPropSignal(` 호출을 `createControllableSignal(`로 변경.

**Step 5: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/utils/createControllableSignal.spec.ts --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 6: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 7: 커밋**

```bash
git add packages/solid/
git commit -m "refactor(solid): createPropSignal → createControllableSignal 리네이밍"
```

---

### Task 2: `createMountTransition` 훅 추출 (S-1)

**Files:**

- Create: `packages/solid/src/utils/createMountTransition.ts`
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx:96-134`
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx:156-207`
- Modify: `packages/solid/src/components/feedback/loading/LoadingContainer.tsx:63-88`
- Modify: `packages/solid/src/index.ts`
- Create: `packages/solid/tests/utils/createMountTransition.spec.ts`

**Step 1: 테스트 파일 작성**

`packages/solid/tests/utils/createMountTransition.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createMountTransition } from "../../src/utils/createMountTransition";

describe("createMountTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("open=false일 때 mounted=false, animating=false", () => {
    createRoot((dispose) => {
      const { mounted, animating } = createMountTransition(() => false);
      expect(mounted()).toBe(false);
      expect(animating()).toBe(false);
      dispose();
    });
  });

  it("open=true로 변경 시 mounted=true", () => {
    createRoot((dispose) => {
      const [open, setOpen] = createSignal(false);
      const { mounted } = createMountTransition(open);

      setOpen(true);
      // SolidJS effect는 동기적으로 실행됨
      expect(mounted()).toBe(true);
      dispose();
    });
  });

  it("open=false로 변경 시 animating=false, fallback 타이머 후 mounted=false", () => {
    createRoot((dispose) => {
      const [open, setOpen] = createSignal(true);
      const { mounted, animating } = createMountTransition(open);

      // mounted 상태 확인
      expect(mounted()).toBe(true);

      // 닫기
      setOpen(false);
      expect(animating()).toBe(false);

      // fallback 타이머 (200ms) 후 mounted=false
      vi.advanceTimersByTime(200);
      expect(mounted()).toBe(false);

      dispose();
    });
  });
});
```

**Step 2: 테스트 실행 (실패 확인)**

```bash
pnpm vitest packages/solid/tests/utils/createMountTransition.spec.ts --project=solid --run
```

Expected: FAIL (모듈 없음)

**Step 3: 훅 구현**

`packages/solid/src/utils/createMountTransition.ts`:

````typescript
import { createSignal, createEffect, onCleanup } from "solid-js";

/**
 * 열림/닫힘 애니메이션을 위한 mount transition 훅
 *
 * @remarks
 * - `open`이 true가 되면 즉시 `mounted=true`, double rAF 후 `animating=true`
 * - `open`이 false가 되면 즉시 `animating=false`, transitionend 또는 fallback 타이머(200ms) 후 `mounted=false`
 * - CSS transition과 함께 사용: `mounted()`로 DOM 렌더링, `animating()`으로 CSS 클래스 전환
 *
 * @example
 * ```tsx
 * const { mounted, animating } = createMountTransition(() => open());
 *
 * return (
 *   <Show when={mounted()}>
 *     <div class={animating() ? "opacity-100" : "opacity-0"}>...</div>
 *   </Show>
 * );
 * ```
 */
export function createMountTransition(open: () => boolean): {
  mounted: () => boolean;
  animating: () => boolean;
} {
  const [mounted, setMounted] = createSignal(false);
  const [animating, setAnimating] = createSignal(false);

  createEffect(() => {
    if (open()) {
      setMounted(true);
      let rafId1: number;
      let rafId2: number;
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
      onCleanup(() => {
        cancelAnimationFrame(rafId1);
        cancelAnimationFrame(rafId2);
      });
    } else if (mounted()) {
      setAnimating(false);
      const fallbackTimer = setTimeout(() => {
        if (!open()) setMounted(false);
      }, 200);
      onCleanup(() => clearTimeout(fallbackTimer));
    }
  });

  return { mounted, animating };
}
````

**Step 4: 테스트 실행 (통과 확인)**

```bash
pnpm vitest packages/solid/tests/utils/createMountTransition.spec.ts --project=solid --run
```

Expected: PASS

**Step 5: Dropdown.tsx에 적용**

`packages/solid/src/components/disclosure/Dropdown.tsx`:

import 추가:

```typescript
import { createMountTransition } from "../../utils/createMountTransition";
```

라인 96-134의 mounted/animating signal 정의와 createEffect를 교체:

```typescript
// 기존 (삭제)
const [mounted, setMounted] = createSignal(false);
const [animating, setAnimating] = createSignal(false);
// ... createEffect (open → mounted/animating)

// 변경
const { mounted, animating } = createMountTransition(open);
```

`setMounted(false)` 호출은 `handleTransitionEnd`에서도 사용됨 (라인 355-363). 이 부분은 훅 외부에서 직접 처리해야 하므로, 훅에서 `setMounted`도 반환하도록 수정하거나, transitionend에서 mounted를 해제하는 콜백을 훅에 추가.

→ **수정**: `createMountTransition`에서 `unmount` 함수도 반환:

```typescript
export function createMountTransition(open: () => boolean): {
  mounted: () => boolean;
  animating: () => boolean;
  unmount: () => void;
} {
  // ...
  const unmount = () => setMounted(false);
  return { mounted, animating, unmount };
}
```

Dropdown의 `handleTransitionEnd`:

```typescript
const handleTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName !== "opacity") return;
  if (!open()) {
    unmount();
  }
};
```

**Step 6: Dialog.tsx에 적용**

Dialog는 추가로 `onCloseComplete` 콜백과 `closeCompleteEmitted` 가드가 있으므로, transitionend 처리가 다름.

`packages/solid/src/components/disclosure/Dialog.tsx`:

import 추가 및 기존 코드 교체:

```typescript
import { createMountTransition } from "../../utils/createMountTransition";

// 기존 mounted/animating signal + createEffect 삭제 (라인 156-207)
// 변경:
const { mounted, animating, unmount } = createMountTransition(open);

let closeCompleteEmitted = false;
const emitCloseComplete = () => {
  if (closeCompleteEmitted) return;
  closeCompleteEmitted = true;
  unmount();
  local.onCloseComplete?.();
};

// open 변경 시 closeCompleteEmitted 초기화
createEffect(() => {
  if (open()) {
    closeCompleteEmitted = false;
  }
});
```

주의: Dialog의 기존 닫힘 로직에는 `untrack(animating)` 체크가 있어서, 열기 애니메이션 전에 닫기 요청 시 즉시 unmount하는 edge case를 처리함. `createMountTransition` 훅의 기본 동작(닫힘 시 fallback 200ms)이 이 케이스를 커버하므로, `emitCloseComplete`는 `handleTransitionEnd`에서만 호출하면 됨.

```typescript
const handleTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName !== "opacity") return;
  if (!open()) {
    emitCloseComplete();
  }
};
```

**Step 7: LoadingContainer.tsx에 적용**

`packages/solid/src/components/feedback/loading/LoadingContainer.tsx`:

import 추가 및 기존 코드 교체:

```typescript
import { createMountTransition } from "../../utils/createMountTransition";

// 기존 mounted/animating signal + createEffect 삭제 (라인 63-88)
// 변경:
const { mounted, animating, unmount } = createMountTransition(() => !!local.busy);
```

`handleTransitionEnd`:

```typescript
const handleTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName !== "opacity") return;
  if (!local.busy) {
    unmount();
  }
};
```

**Step 8: index.ts에 export 추가**

`packages/solid/src/index.ts`의 utils 섹션에 추가:

```typescript
export { createMountTransition } from "./utils/createMountTransition";
```

**Step 9: 관련 테스트 실행**

```bash
pnpm vitest packages/solid/tests --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 10: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 11: 커밋**

```bash
git add packages/solid/
git commit -m "refactor(solid): 애니메이션 이중 signal 패턴을 createMountTransition 훅으로 추출"
```

---

### Task 3: `createIMEHandler` 훅 추출 (S-2)

**Files:**

- Create: `packages/solid/src/utils/createIMEHandler.ts`
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx:149-223`
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx:95-141`
- Modify: `packages/solid/src/index.ts`
- Create: `packages/solid/tests/utils/createIMEHandler.spec.ts`

**Step 1: 테스트 파일 작성**

`packages/solid/tests/utils/createIMEHandler.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot } from "solid-js";
import { createIMEHandler } from "../../src/utils/createIMEHandler";

describe("createIMEHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("비조합 상태에서 handleInput 호출 시 즉시 setValue", () => {
    const setValue = vi.fn();

    createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      // isComposing=false인 InputEvent
      ime.handleInput("hello", false);

      expect(setValue).toHaveBeenCalledWith("hello");
      expect(ime.composingValue()).toBeNull();
      dispose();
    });
  });

  it("조합 중 handleInput 호출 시 composingValue만 업데이트", () => {
    const setValue = vi.fn();

    createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      ime.handleCompositionStart();
      ime.handleInput("한", true);

      expect(setValue).not.toHaveBeenCalled();
      expect(ime.composingValue()).toBe("한");
      dispose();
    });
  });

  it("compositionEnd 후 setTimeout(0)에서 setValue 호출", () => {
    const setValue = vi.fn();

    createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      ime.handleCompositionStart();
      ime.handleInput("한글", true);
      ime.handleCompositionEnd("한글");

      // setTimeout(0) 전
      expect(setValue).not.toHaveBeenCalled();
      expect(ime.composingValue()).toBe("한글");

      // setTimeout(0) 실행
      vi.advanceTimersByTime(0);

      expect(setValue).toHaveBeenCalledWith("한글");
      expect(ime.composingValue()).toBeNull();
      dispose();
    });
  });

  it("flushComposition으로 미커밋 값 즉시 커밋", () => {
    const setValue = vi.fn();

    createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      ime.handleCompositionStart();
      ime.handleInput("한", true);

      // cleanup 호출
      ime.flushComposition();

      expect(setValue).toHaveBeenCalledWith("한");
      expect(ime.composingValue()).toBeNull();
      dispose();
    });
  });
});
```

**Step 2: 테스트 실행 (실패 확인)**

```bash
pnpm vitest packages/solid/tests/utils/createIMEHandler.spec.ts --project=solid --run
```

Expected: FAIL

**Step 3: 훅 구현**

`packages/solid/src/utils/createIMEHandler.ts`:

```typescript
import { type Accessor, createSignal, onCleanup } from "solid-js";

/**
 * IME 조합 처리 훅
 *
 * @remarks
 * 한글 등 IME 조합 중 onValueChange를 지연하여 DOM 재생성(조합 끊김)을 방지합니다.
 * - 조합 중: composingValue만 업데이트 (content div 표시용)
 * - 조합 완료(compositionEnd): setTimeout(0)으로 지연 후 setValue 호출
 * - cleanup: flushComposition으로 미커밋 값 즉시 커밋
 *
 * @param setValue - 값 커밋 함수
 * @returns IME 핸들러 객체
 */
export function createIMEHandler(setValue: (value: string) => void) {
  const [composingValue, setComposingValue] = createSignal<string | null>(null);
  let compositionFlushTimer: ReturnType<typeof setTimeout> | undefined;

  function flushComposition(): void {
    if (compositionFlushTimer != null) {
      clearTimeout(compositionFlushTimer);
      compositionFlushTimer = undefined;
    }
    const pending = composingValue();
    if (pending != null) {
      setComposingValue(null);
      setValue(pending);
    }
  }

  function handleCompositionStart(): void {
    if (compositionFlushTimer != null) {
      clearTimeout(compositionFlushTimer);
      compositionFlushTimer = undefined;
    }
  }

  function handleInput(value: string, isComposing: boolean): void {
    if (isComposing || compositionFlushTimer != null) {
      setComposingValue(value);
      return;
    }
    setComposingValue(null);
    setValue(value);
  }

  function handleCompositionEnd(value: string): void {
    setComposingValue(value);
    compositionFlushTimer = setTimeout(() => {
      compositionFlushTimer = undefined;
      setComposingValue(null);
      setValue(value);
    }, 0);
  }

  onCleanup(() => flushComposition());

  return {
    composingValue: composingValue as Accessor<string | null>,
    handleCompositionStart,
    handleInput,
    handleCompositionEnd,
    flushComposition,
  };
}
```

**Step 4: 테스트 실행 (통과 확인)**

```bash
pnpm vitest packages/solid/tests/utils/createIMEHandler.spec.ts --project=solid --run
```

Expected: PASS

**Step 5: TextInput.tsx에 적용**

`packages/solid/src/components/form-control/field/TextInput.tsx`:

import 추가:

```typescript
import { createIMEHandler } from "../../utils/createIMEHandler";
```

기존 IME 로직 (라인 149-223)을 교체:

```typescript
const [value, setValue] = createControllableSignal({
  value: () => local.value ?? "",
  onChange: () => local.onValueChange,
});

const ime = createIMEHandler((v) => setValue(v));

function extractValue(el: HTMLInputElement): string {
  let val = el.value;
  if (local.format != null && local.format !== "") {
    val = removeFormat(val, local.format);
  }
  return val;
}

const inputValue = () => {
  const val = value();
  if (local.format != null && local.format !== "") {
    return applyFormat(val, local.format);
  }
  return val;
};

const displayValue = () => {
  const composing = ime.composingValue();
  if (composing != null) {
    if (local.format != null && local.format !== "") {
      return applyFormat(composing, local.format);
    }
    return composing;
  }
  return inputValue();
};

const handleCompositionStart = () => ime.handleCompositionStart();

const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
  ime.handleInput(extractValue(e.currentTarget), e.isComposing);
};

const handleCompositionEnd: JSX.EventHandler<HTMLInputElement, CompositionEvent> = (e) => {
  ime.handleCompositionEnd(extractValue(e.currentTarget));
};
```

기존 `onCleanup(() => flushComposition())` 삭제 (훅 내부에서 처리).

**Step 6: Textarea.tsx에 적용**

`packages/solid/src/components/form-control/field/Textarea.tsx`:

import 추가 및 기존 IME 로직(라인 95-141) 교체:

```typescript
import { createIMEHandler } from "../../utils/createIMEHandler";

const [value, setValue] = createControllableSignal({
  value: () => local.value ?? "",
  onChange: () => local.onValueChange,
});

const ime = createIMEHandler((v) => setValue(v));

const displayValue = () => ime.composingValue() ?? value();

const handleCompositionStart = () => ime.handleCompositionStart();

const handleInput: JSX.InputEventHandler<HTMLTextAreaElement, InputEvent> = (e) => {
  ime.handleInput(e.currentTarget.value, e.isComposing);
};

const handleCompositionEnd: JSX.EventHandler<HTMLTextAreaElement, CompositionEvent> = (e) => {
  ime.handleCompositionEnd(e.currentTarget.value);
};
```

기존 `onCleanup(() => flushComposition())` 삭제.

**Step 7: index.ts에 export 추가**

```typescript
export { createIMEHandler } from "./utils/createIMEHandler";
```

**Step 8: 관련 테스트 실행**

```bash
pnpm vitest packages/solid/tests --project=solid --run
```

Expected: 모든 테스트 PASS

**Step 9: 타입체크**

```bash
pnpm typecheck packages/solid
```

**Step 10: 커밋**

```bash
git add packages/solid/
git commit -m "refactor(solid): IME 조합 처리 로직을 createIMEHandler 훅으로 추출"
```

---

### Task 4: SharedData 버그 수정 (CR-1 + CR-2)

**Files:**

- Modify: `packages/solid/src/contexts/shared-data/SharedDataProvider.tsx`
- Modify: `packages/solid/tests/SharedDataProvider.spec.tsx`

**Step 1: 기존 테스트 확인**

```bash
pnpm vitest packages/solid/tests/SharedDataProvider.spec.tsx --project=solid --run
```

확인: 기존 테스트가 통과하는지 확인.

**Step 2: SharedDataProvider 수정**

`packages/solid/src/contexts/shared-data/SharedDataProvider.tsx`:

notification import 추가:

```typescript
import { useNotification } from "../../components/feedback/notification/NotificationContext";
```

Provider 함수 내에서 notification 사용:

```typescript
const notification = useNotification();
```

version counter 추가 (signalMap 근처):

```typescript
const versionMap = new Map<string, number>();
```

`loadData` 함수 수정:

```typescript
async function loadData(
  name: string,
  def: SharedDataDefinition<unknown>,
  changeKeys?: Array<string | number>,
): Promise<void> {
  // CR-1: version counter로 동시 호출 시 데이터 역전 방지
  const currentVersion = (versionMap.get(name) ?? 0) + 1;
  versionMap.set(name, currentVersion);

  setLoadingCount((c) => c + 1);
  try {
    const signal = signalMap.get(name);
    if (!signal) throw new Error(`'${name}'에 대한 공유데이터 저장소가 없습니다.`);

    const [, setItems] = signal;
    const resData = await def.fetch(changeKeys);

    // CR-1: 오래된 응답은 무시
    if (versionMap.get(name) !== currentVersion) return;

    if (!changeKeys) {
      setItems(ordering(resData, def.orderBy));
    } else {
      setItems((prev) => {
        const filtered = prev.filter((item) => !changeKeys.includes(def.getKey(item as never)));
        filtered.push(...resData);
        return ordering(filtered, def.orderBy);
      });
    }
  } catch (err) {
    // CR-2: fetch 실패 시 사용자에게 알림
    notification.danger(
      "공유 데이터 로드 실패",
      err instanceof Error ? err.message : `'${name}' 데이터를 불러오는 중 오류가 발생했습니다.`,
    );
  } finally {
    setLoadingCount((c) => c - 1);
  }
}
```

**주의**: `useNotification()` 호출이 Provider 내부에 추가되므로, SharedDataProvider는 NotificationProvider 아래에 위치해야 함. 기존 Provider 계층에서 이미 NotificationProvider가 위에 있으므로 문제 없음.

**Step 3: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/SharedDataProvider.spec.tsx --project=solid --run
```

Expected: PASS (기존 테스트가 mock 환경에서 동작하는지 확인. notification 의존성이 추가되었으므로 테스트 환경에서 NotificationProvider 감싸기가 필요할 수 있음)

**Step 4: 타입체크**

```bash
pnpm typecheck packages/solid
```

**Step 5: 커밋**

```bash
git add packages/solid/
git commit -m "fix(solid): SharedData loadData 동시 호출 데이터 역전 방지 및 fetch 에러 알림 추가"
```

---

### Task 5: Dropdown resize 시 닫기 (CR-3)

**Files:**

- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx`

**Step 1: Dropdown.tsx에 resize 이벤트 리스너 추가**

기존 스크롤 감지 effect (라인 337-352) 근처에 resize 감지 effect 추가:

```typescript
// resize 감지 (모바일 소프트 키보드 등)
createEffect(() => {
  if (!open()) return;

  const handleResize = () => {
    setOpen(false);
  };

  window.addEventListener("resize", handleResize);
  onCleanup(() => window.removeEventListener("resize", handleResize));
});
```

**Step 2: 관련 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/overlay/Dropdown.spec.tsx --project=solid --run
```

Expected: PASS

**Step 3: 타입체크**

```bash
pnpm typecheck packages/solid
```

**Step 4: 커밋**

```bash
git add packages/solid/src/components/disclosure/Dropdown.tsx
git commit -m "fix(solid): Dropdown 열린 상태에서 뷰포트 resize 시 닫기 처리 추가"
```

---

### Task 6: ServiceClient onCleanup 개선 (CR-4)

**Files:**

- Modify: `packages/solid/src/contexts/ServiceClientProvider.tsx:15-20`

**Step 1: onCleanup 수정**

`packages/solid/src/contexts/ServiceClientProvider.tsx:15-20`:

```typescript
// 기존
onCleanup(async () => {
  for (const client of clientMap.values()) {
    await client.close();
  }
  clientMap.clear();
});

// 변경: async 제거, fire-and-forget으로 close 호출
onCleanup(() => {
  for (const client of clientMap.values()) {
    void client.close();
  }
  clientMap.clear();
});
```

**Step 2: 타입체크**

```bash
pnpm typecheck packages/solid
```

**Step 3: 커밋**

```bash
git add packages/solid/src/contexts/ServiceClientProvider.tsx
git commit -m "fix(solid): ServiceClientProvider onCleanup에서 async 제거하여 cleanup 신뢰성 개선"
```

---

### Task 7: 에러 메시지 통일 + styles export 통일 (DX-1 + DX-2 + DX-4)

**Files:**

- Modify: `packages/solid/src/components/disclosure/DialogContext.ts:41`
- Modify: `packages/solid/src/components/layout/sidebar/SidebarContext.ts:27`
- Modify: `packages/solid/src/components/layout/kanban/KanbanContext.ts:46,68`
- Modify: `packages/solid/src/components/form-control/select/SelectContext.ts:22`
- Modify: `packages/solid/src/contexts/ThemeContext.tsx:56`
- Modify: `packages/solid/src/contexts/ServiceClientContext.ts:16`
- Modify: `packages/solid/src/contexts/shared-data/SharedDataContext.ts:29`
- Modify: `packages/solid/src/index.ts`

**Step 1: 영어 에러 메시지를 한국어로 변경 (DX-1)**

`DialogContext.ts:41`:

```typescript
// 기존
if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
// 변경
if (!ctx) throw new Error("useDialog는 DialogProvider 내부에서만 사용할 수 있습니다");
```

`SidebarContext.ts:27`:

```typescript
// 기존
throw new Error("useSidebarContext must be used within SidebarContainer");
// 변경
throw new Error("useSidebarContext는 SidebarContainer 내부에서만 사용할 수 있습니다");
```

`KanbanContext.ts:46`:

```typescript
// 기존
throw new Error("useKanbanContext must be used within Kanban");
// 변경
throw new Error("useKanbanContext는 Kanban 내부에서만 사용할 수 있습니다");
```

`KanbanContext.ts:68`:

```typescript
// 기존
throw new Error("useKanbanLaneContext must be used within Kanban.Lane");
// 변경
throw new Error("useKanbanLaneContext는 Kanban.Lane 내부에서만 사용할 수 있습니다");
```

`SelectContext.ts:22`:

```typescript
// 기존
throw new Error("useSelectContext must be used within a Select component");
// 변경
throw new Error("useSelectContext는 Select 컴포넌트 내부에서만 사용할 수 있습니다");
```

**Step 2: Provider 에러 메시지에 의존성 정보 추가 (DX-2)**

`ThemeContext.tsx:56`:

```typescript
// 기존
throw new Error("useTheme는 ThemeProvider 내부에서만 사용할 수 있습니다");
// 변경
throw new Error(
  "useTheme는 ThemeProvider 내부에서만 사용할 수 있습니다. ThemeProvider는 InitializeProvider 아래에 위치해야 합니다",
);
```

`ServiceClientContext.ts:16`:

```typescript
// 기존
throw new Error("useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다");
// 변경
throw new Error(
  "useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다. ServiceClientProvider는 InitializeProvider와 NotificationProvider 아래에 위치해야 합니다",
);
```

`SharedDataContext.ts:29`:

```typescript
// 기존
throw new Error("useSharedData는 SharedDataProvider 내부에서만 사용할 수 있습니다");
// 변경
throw new Error(
  "useSharedData는 SharedDataProvider 내부에서만 사용할 수 있습니다. SharedDataProvider는 ServiceClientProvider 아래에 위치해야 합니다",
);
```

**Step 3: styles export 통일 (DX-4)**

`packages/solid/src/index.ts`에 누락된 styles export 추가:

```typescript
// data 섹션에 추가
export * from "./components/data/list/ListItem.styles";
export * from "./components/data/sheet/DataSheet.styles";

// styles 섹션 추가
export * from "./styles/tokens.styles";
export * from "./styles/patterns.styles";
```

**Step 4: 관련 테스트 실행**

에러 메시지 변경이 테스트에 영향을 미칠 수 있음:

```bash
pnpm vitest packages/solid/tests --project=solid --run
```

에러 메시지 문자열을 매칭하는 테스트가 있으면 해당 문자열도 업데이트.

**Step 5: 타입체크**

```bash
pnpm typecheck packages/solid
```

**Step 6: 커밋**

```bash
git add packages/solid/
git commit -m "refactor(solid): 에러 메시지 한국어 통일, Provider 의존성 정보 추가, styles export 통일"
```

---

### 최종 검증

모든 Task 완료 후:

```bash
# 전체 테스트
pnpm vitest packages/solid/tests --project=solid --run

# 타입체크
pnpm typecheck packages/solid

# 린트
pnpm lint packages/solid
```
