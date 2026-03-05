# Solid Package Simplify Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `packages/solid` 패키지의 코드 정확성 향상 및 중복 제거 3건 적용 (Public API 변경 없음)

**Architecture:** createControllableStore의 변경 감지를 타입-안전한 방식으로 교체, ServiceClientProvider의 중복 progress 핸들러를 로컬 함수로 추출, Checkbox/Radio의 공통 로직을 내부 SelectableBase 컴포넌트로 통합

**Tech Stack:** SolidJS, TypeScript, `@simplysm/core-common` (objClone, objEqual), vitest, @solidjs/testing-library

---

### Task 1: createControllableStore — JSON.stringify를 objClone + objEqual로 교체

**Files:**
- Modify: `packages/solid/src/hooks/createControllableStore.ts:4,41-47`
- Test: `packages/solid/tests/hooks/createControllableStore.spec.ts` (create)

**Step 1: Write the failing test**

`createControllableStore.spec.ts`는 아직 없으므로 새로 생성. `createRoot`로 SolidJS 반응형 컨텍스트를 감싸야 함 (`createControllableSignal.spec.ts` 패턴 참조).

```typescript
import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { createControllableStore } from "../../src/hooks/createControllableStore";
import { DateTime } from "@simplysm/core-common";

describe("createControllableStore", () => {
  it("calls onChange when store value changes", () => {
    const onChange = vi.fn();

    createRoot((dispose) => {
      const [store, setStore] = createControllableStore<{ name: string }>({
        value: () => ({ name: "a" }),
        onChange: () => onChange,
      });

      expect(store.name).toBe("a");

      setStore("name", "b");

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: "b" }));
      dispose();
    });
  });

  it("does not call onChange when value is unchanged", () => {
    const onChange = vi.fn();

    createRoot((dispose) => {
      const [, setStore] = createControllableStore<{ name: string }>({
        value: () => ({ name: "a" }),
        onChange: () => onChange,
      });

      setStore("name", "a");

      expect(onChange).not.toHaveBeenCalled();
      dispose();
    });
  });

  it("correctly detects changes in DateTime values", () => {
    const onChange = vi.fn();

    createRoot((dispose) => {
      const dt1 = new DateTime(2025, 1, 1, 0, 0, 0);
      const dt2 = new DateTime(2025, 6, 15, 12, 30, 0);

      const [, setStore] = createControllableStore<{ date: DateTime }>({
        value: () => ({ date: dt1 }),
        onChange: () => onChange,
      });

      // Change to different DateTime — should trigger onChange
      setStore("date", dt2);
      expect(onChange).toHaveBeenCalledTimes(1);

      onChange.mockClear();

      // Set same tick DateTime — should NOT trigger onChange
      setStore("date", new DateTime(dt2.tick));
      expect(onChange).not.toHaveBeenCalled();

      dispose();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/hooks/createControllableStore.spec.ts --project=solid --run`
Expected: FAIL — DateTime 동등 비교 테스트 실패 (JSON.stringify는 DateTime을 문자열로 직렬화하므로 `new DateTime(dt2.tick)`과 `dt2`가 같은 문자열이 되어 통과할 수도 있으나, 기본 테스트는 통과하고 DateTime 동등 비교가 핵심 검증 포인트)

**Step 3: Write minimal implementation**

`packages/solid/src/hooks/createControllableStore.ts` 수정:

Line 4 — import 변경:
```typescript
import { objClone, objEqual } from "@simplysm/core-common";
```

Lines 41-48 — wrappedSet 본문 교체:
```typescript
  const wrappedSet = ((...args: any[]) => {
    const before = objClone(unwrap(store));
    (rawSet as any)(...args);
    if (!objEqual(before, unwrap(store))) {
      options.onChange()?.(objClone(unwrap(store)));
    }
  }) as SetStoreFunction<TValue>;
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/hooks/createControllableStore.spec.ts --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/hooks/createControllableStore.ts packages/solid/tests/hooks/createControllableStore.spec.ts
git commit -m "refactor(solid): replace JSON.stringify with objClone+objEqual in createControllableStore"
```

---

### Task 2: ServiceClientProvider — 중복 progress 핸들러 추출

**Files:**
- Modify: `packages/solid/src/providers/ServiceClientProvider.tsx:102-156`
- Test: `packages/solid/tests/providers/ServiceClientContext.spec.tsx` (existing — 기존 테스트로 regression 확인)

**Step 1: Run existing tests to verify baseline**

Run: `pnpm vitest packages/solid/tests/providers/ServiceClientContext.spec.tsx --project=solid --run`
Expected: PASS

**Step 2: Extract handleProgress helper**

`packages/solid/src/providers/ServiceClientProvider.tsx` 수정:

Lines 67 뒤에 (`resProgressMap` 선언 후) 로컬 함수 추가:
```typescript
  function handleProgress(
    progressMap: Map<string, string>,
    state: { uuid: string; completedSize: number; totalSize: number },
    startTitle: string,
    completeTitle: string,
  ) {
    const existing = progressMap.get(state.uuid);

    if (existing == null) {
      const id = notification.info(startTitle, "0%");
      progressMap.set(state.uuid, id);
    } else {
      const percent = Math.round((state.completedSize / state.totalSize) * 100);
      notification.update(existing, { message: `${percent}%` });
    }

    if (state.completedSize === state.totalSize) {
      const id = progressMap.get(state.uuid);
      if (id != null) {
        notification.update(id, { title: completeTitle, message: "100%" }, { renotify: true });
        progressMap.delete(state.uuid);
      }
    }
  }
```

Lines 102-156 (`client.on` 두 블록)을 교체:
```typescript
    client.on("request-progress", (state) => {
      handleProgress(reqProgressMap, state, "Sending request", "Request transmission completed");
    });

    client.on("response-progress", (state) => {
      handleProgress(resProgressMap, state, "Receiving response", "Response reception completed");
    });
```

**Step 3: Run existing tests to verify no regression**

Run: `pnpm vitest packages/solid/tests/providers/ServiceClientContext.spec.tsx --project=solid --run`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/providers/ServiceClientProvider.tsx
git commit -m "refactor(solid): extract handleProgress helper in ServiceClientProvider"
```

---

### Task 3: SelectableBase 내부 컴포넌트 생성

**Files:**
- Create: `packages/solid/src/components/form-control/checkbox/SelectableBase.tsx`

**Step 1: Run existing Checkbox/Radio tests to verify baseline**

Run: `pnpm vitest packages/solid/tests/components/form-control/checkbox/ --project=solid --run`
Expected: PASS (Checkbox, Radio, CheckboxGroup, RadioGroup 모두 통과)

**Step 2: Create SelectableBase**

`SelectableBase.tsx` — Checkbox와 Radio의 공통 로직을 담는 내부 컴포넌트. `index.ts`에 export하지 않음.

- `createControllableSignal` — controlled/uncontrolled 패턴 지원 (`packages/solid/src/hooks/createControllableSignal.ts`)
- `ripple` directive — 터치 리플 효과 (`packages/solid/src/directives/ripple.ts`), `void ripple;`으로 TS에 사용 선언 필요
- `Invalid` — validation 에러 표시 래퍼 (`packages/solid/src/components/form-control/Invalid.tsx`)
- `useI18n` — i18n 번역 함수 접근 (`packages/solid/src/providers/i18n/I18nContext.tsx`)
- `Checkbox.styles` — 공유 스타일 토큰들 (`packages/solid/src/components/form-control/checkbox/Checkbox.styles.ts`)

```tsx
import { type JSX, type ParentComponent, Show, splitProps, createMemo } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { ripple } from "../../../directives/ripple";
import { useI18n } from "../../../providers/i18n/I18nContext";
import {
  type CheckboxSize,
  checkboxBaseClass,
  indicatorBaseClass,
  checkedClass,
  checkboxSizeClasses,
  checkboxInsetClass,
  checkboxInsetSizeHeightClasses,
  checkboxInlineClass,
  checkboxDisabledClass,
} from "./Checkbox.styles";
import { Invalid } from "../Invalid";

void ripple;

export interface SelectableBaseProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inset?: boolean;
  inline?: boolean;
  required?: boolean;
  validate?: (value: boolean) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export interface SelectableBaseConfig {
  role: "checkbox" | "radio";
  indicatorShape: string;
  indicatorContent: JSX.Element;
  onToggle: (current: boolean) => boolean;
}

export const SelectableBase: ParentComponent<SelectableBaseProps & { config: SelectableBaseConfig }> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "size",
    "inset",
    "inline",
    "required",
    "validate",
    "touchMode",
    "class",
    "style",
    "children",
    "config",
  ]);

  const i18n = useI18n();

  const [value, setValue] = createControllableSignal({
    value: () => local.value ?? false,
    onChange: () => local.onValueChange,
  });

  const handleClick = () => {
    if (local.disabled) return;
    setValue((v) => local.config.onToggle(v));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const getWrapperClass = () =>
    twMerge(
      checkboxBaseClass,
      checkboxSizeClasses[local.size ?? "default"],
      local.inset && checkboxInsetClass,
      local.inset && checkboxInsetSizeHeightClasses[local.size ?? "default"],
      local.inline && checkboxInlineClass,
      local.disabled && checkboxDisabledClass,
      local.class,
    );

  const getIndicatorClass = () =>
    twMerge(indicatorBaseClass, local.config.indicatorShape, value() && checkedClass);

  const errorMsg = createMemo(() => {
    const v = local.value ?? false;
    if (local.required && !v) return i18n.t("validation.requiredSelection");
    return local.validate?.(v);
  });

  return (
    <Invalid message={errorMsg()} variant="border" touchMode={local.touchMode}>
      <div
        {...rest}
        use:ripple={!local.disabled}
        role={local.config.role}
        aria-checked={value()}
        tabIndex={local.disabled ? -1 : 0}
        class={getWrapperClass()}
        style={local.style}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div class={getIndicatorClass()}>
          <Show when={value()}>
            {local.config.indicatorContent}
          </Show>
        </div>
        <Show when={local.children}>
          <span>{local.children}</span>
        </Show>
      </div>
    </Invalid>
  );
};
```

**Step 3: Commit SelectableBase**

```bash
git add packages/solid/src/components/form-control/checkbox/SelectableBase.tsx
git commit -m "refactor(solid): create SelectableBase internal component for Checkbox/Radio"
```

---

### Task 4: Checkbox/Radio를 SelectableBase thin wrapper로 변환

**Files:**
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/Radio.tsx`
- Test: `packages/solid/tests/components/form-control/checkbox/Checkbox.spec.tsx` (existing)
- Test: `packages/solid/tests/components/form-control/checkbox/Radio.spec.tsx` (existing)
- Test: `packages/solid/tests/components/form-control/checkbox/CheckboxGroup.spec.tsx` (existing)
- Test: `packages/solid/tests/components/form-control/checkbox/RadioGroup.spec.tsx` (existing)

**Step 1: Rewrite Checkbox.tsx**

`packages/solid/src/components/form-control/checkbox/Checkbox.tsx` 전체 교체:

```tsx
import { type JSX, type ParentComponent } from "solid-js";
import { IconCheck } from "@tabler/icons-solidjs";
import type { CheckboxSize } from "./Checkbox.styles";
import { Icon } from "../../display/Icon";
import { SelectableBase } from "./SelectableBase";

export interface CheckboxProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inset?: boolean;
  inline?: boolean;
  required?: boolean;
  validate?: (value: boolean) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export const Checkbox: ParentComponent<CheckboxProps> = (props) => (
  <SelectableBase
    {...props}
    config={{
      role: "checkbox",
      indicatorShape: "rounded-sm",
      indicatorContent: <Icon icon={IconCheck} size="1em" />,
      onToggle: (v) => !v,
    }}
  />
);
```

**Step 2: Rewrite Radio.tsx**

`packages/solid/src/components/form-control/checkbox/Radio.tsx` 전체 교체:

```tsx
import { type JSX, type ParentComponent } from "solid-js";
import type { CheckboxSize } from "./Checkbox.styles";
import { SelectableBase } from "./SelectableBase";

export interface RadioProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inset?: boolean;
  inline?: boolean;
  required?: boolean;
  validate?: (value: boolean) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export const Radio: ParentComponent<RadioProps> = (props) => (
  <SelectableBase
    {...props}
    config={{
      role: "radio",
      indicatorShape: "rounded-full",
      indicatorContent: <div class="size-2 rounded-full bg-current" />,
      onToggle: () => true,
    }}
  />
);
```

**Step 3: Run all checkbox/radio tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/checkbox/ --project=solid --run`
Expected: PASS (Checkbox.spec, Radio.spec, CheckboxGroup.spec, RadioGroup.spec 모두 통과)

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/checkbox/Checkbox.tsx packages/solid/src/components/form-control/checkbox/Radio.tsx
git commit -m "refactor(solid): simplify Checkbox/Radio to thin wrappers over SelectableBase"
```

---

### Task 5: Final verification

**Step 1: Run full solid test suite**

Run: `pnpm vitest --project=solid --run`
Expected: All tests PASS

**Step 2: Typecheck + lint**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: No errors
