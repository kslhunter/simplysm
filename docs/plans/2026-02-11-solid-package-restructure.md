# solid 패키지 구조 리팩토링 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** solid 패키지의 디렉토리 구조를 명확한 역할 기반으로 재편성

**Architecture:** `contexts/` → `providers/`, `utils/` → `hooks/` + `helpers/`, 컴포넌트 카테고리 재배치 (ThemeToggle, Progress, Tabs, Kanban, Print), solid-demo 1:1 동기화

**Tech Stack:** TypeScript, SolidJS, git mv

---

## 주요 경로

- solid 소스: `packages/solid/src/`
- solid 테스트: `packages/solid/tests/`
- solid-demo: `packages/solid-demo/src/`

## 사전 지식

- `index.ts`가 모든 public export를 re-export → 외부 import 경로 변경 없음
- 내부 상대경로 import만 수정 필요
- `git mv`로 이동 시 git history 보존

---

### Task 1: contexts/ → providers/ 이동

**Files:**

- Move: `packages/solid/src/contexts/ConfigContext.ts` → `packages/solid/src/providers/ConfigContext.ts`
- Move: `packages/solid/src/contexts/InitializeProvider.tsx` → `packages/solid/src/providers/InitializeProvider.tsx`
- Move: `packages/solid/src/contexts/ThemeContext.tsx` → `packages/solid/src/providers/ThemeContext.tsx`
- Move: `packages/solid/src/contexts/ServiceClientContext.ts` → `packages/solid/src/providers/ServiceClientContext.ts`
- Move: `packages/solid/src/contexts/ServiceClientProvider.tsx` → `packages/solid/src/providers/ServiceClientProvider.tsx`
- Move: `packages/solid/src/contexts/shared-data/` → `packages/solid/src/providers/shared-data/`

주의: `usePersisted.ts`, `useClipboardValueCopy.ts`는 이 Task에서 이동하지 않음 (Task 2에서 처리)

**Step 1: 디렉토리 생성 + 파일 이동**

```bash
mkdir -p packages/solid/src/providers/shared-data

git mv packages/solid/src/contexts/ConfigContext.ts packages/solid/src/providers/
git mv packages/solid/src/contexts/InitializeProvider.tsx packages/solid/src/providers/
git mv packages/solid/src/contexts/ThemeContext.tsx packages/solid/src/providers/
git mv packages/solid/src/contexts/ServiceClientContext.ts packages/solid/src/providers/
git mv packages/solid/src/contexts/ServiceClientProvider.tsx packages/solid/src/providers/
git mv packages/solid/src/contexts/shared-data/SharedDataContext.ts packages/solid/src/providers/shared-data/
git mv packages/solid/src/contexts/shared-data/SharedDataProvider.tsx packages/solid/src/providers/shared-data/
git mv packages/solid/src/contexts/shared-data/SharedDataChangeEvent.ts packages/solid/src/providers/shared-data/
```

**Step 2: providers/ 내부 상대 import 수정**

이동된 파일들 간의 상대 import는 같은 폴더 내이므로 변경 없음. 단, 다음 파일들의 외부 참조 수정:

`providers/InitializeProvider.tsx`:

- `"./useClipboardValueCopy"` → `"../hooks/useClipboardValueCopy"` (Task 2 이후에 유효, 일단 보류)

`providers/ThemeContext.tsx`:

- `"./usePersisted"` → `"../hooks/usePersisted"` (Task 2 이후에 유효, 일단 보류)

`providers/ServiceClientProvider.tsx`:

- `"../components/feedback/notification/NotificationContext"` → 경로 변경 없음 (components는 안 움직임)

`providers/shared-data/SharedDataProvider.tsx`:

- `"../ServiceClientContext"` → 경로 변경 없음 (같이 이동)
- `"../../components/feedback/notification/NotificationContext"` → 경로 변경 없음

**이 Step에서는 providers/ 내부 간 import만 확인 — 모두 `./` 상대경로라 변경 불필요.**

**Step 3: contexts/ → providers/ 를 참조하는 외부 파일 수정**

`contexts/`를 import하는 컴포넌트 파일:

- `packages/solid/src/components/data/sheet/DataSheet.tsx:30`
  - `"../../../contexts/usePersisted"` → `"../../../hooks/usePersisted"` (Task 2에서 일괄 처리)

- `packages/solid/src/components/layout/sidebar/SidebarContainer.tsx:7`
  - `"../../../contexts/usePersisted"` → `"../../../hooks/usePersisted"` (Task 2에서 일괄 처리)

- `packages/solid/src/components/form-control/state-preset/StatePreset.tsx:7`
  - `"../../../contexts/usePersisted"` → `"../../../hooks/usePersisted"` (Task 2에서 일괄 처리)

- `packages/solid/src/components/display/ThemeToggle.tsx:5`
  - `"../../contexts/ThemeContext"` → `"../../providers/ThemeContext"`

**이 Step에서 수정하는 파일:** ThemeToggle.tsx만 (나머지는 Task 2에서 일괄)

**Step 4: 이 단계에서는 typecheck 하지 않음** (Task 2에서 hooks/ 이동 완료 후 일괄 검증)

---

### Task 2: utils/ + contexts/ 잔여 파일 → hooks/ + helpers/ 이동

**Files:**

- Move to `hooks/`: `usePersisted.ts` (from contexts/), `useClipboardValueCopy.ts` (from contexts/), `useRouterLink.ts` (from utils/), `createControllableSignal.ts` (from utils/), `createMountTransition.ts` (from utils/), `createIMEHandler.ts` (from utils/)
- Move to `helpers/`: `mergeStyles.ts` (from utils/), `splitSlots.ts` (from utils/), `createAppStructure.ts` (from utils/)
- Delete: `contexts/` (빈 폴더), `utils/` (빈 폴더)

**Step 1: 디렉토리 생성 + 파일 이동**

```bash
mkdir -p packages/solid/src/hooks
mkdir -p packages/solid/src/helpers

# contexts/ → hooks/
git mv packages/solid/src/contexts/usePersisted.ts packages/solid/src/hooks/
git mv packages/solid/src/contexts/useClipboardValueCopy.ts packages/solid/src/hooks/

# utils/ → hooks/
git mv packages/solid/src/utils/useRouterLink.ts packages/solid/src/hooks/
git mv packages/solid/src/utils/createControllableSignal.ts packages/solid/src/hooks/
git mv packages/solid/src/utils/createMountTransition.ts packages/solid/src/hooks/
git mv packages/solid/src/utils/createIMEHandler.ts packages/solid/src/hooks/

# utils/ → helpers/
git mv packages/solid/src/utils/mergeStyles.ts packages/solid/src/helpers/
git mv packages/solid/src/utils/splitSlots.ts packages/solid/src/helpers/
git mv packages/solid/src/utils/createAppStructure.ts packages/solid/src/helpers/

# 빈 폴더 삭제
rmdir packages/solid/src/contexts
rmdir packages/solid/src/utils
```

**Step 2: hooks/ 내부 import 수정**

`hooks/usePersisted.ts`:

- `"./ConfigContext"` → `"../providers/ConfigContext"`

**Step 3: providers/ → hooks/ 참조 수정**

`providers/InitializeProvider.tsx`:

- `"./useClipboardValueCopy"` → `"../hooks/useClipboardValueCopy"`

`providers/ThemeContext.tsx`:

- `"./usePersisted"` → `"../hooks/usePersisted"`

**Step 4: components/ → hooks/ + helpers/ 참조 일괄 수정**

`../../../utils/createControllableSignal` → `../../../hooks/createControllableSignal` (깊이 3단계):

- `components/data/calendar/Calendar.tsx:5`
- `components/data/sheet/DataSheet.tsx:26`
- `components/data/list/ListItem.tsx:8`
- `components/layout/kanban/Kanban.tsx:20`
- `components/form-control/editor/RichTextEditor.tsx:16`
- `components/form-control/checkbox/CheckboxGroup.tsx:3`
- `components/form-control/checkbox/Radio.tsx:3`
- `components/form-control/checkbox/RadioGroup.tsx:3`
- `components/form-control/checkbox/Checkbox.tsx:4`
- `components/form-control/select/Select.tsx:11` → splitSlots도 수정
- `components/form-control/select/SelectItem.tsx:9` → splitSlots도 수정
- `components/form-control/combobox/Combobox.tsx:12` → splitSlots도 수정
- `components/form-control/date-range-picker/DateRangePicker.tsx:5`
- `components/form-control/color-picker/ColorPicker.tsx:4`
- `components/form-control/field/TextInput.tsx:4-5` → createIMEHandler도 수정
- `components/form-control/field/Textarea.tsx:4-5` → createIMEHandler도 수정
- `components/form-control/field/TimePicker.tsx:5`
- `components/form-control/field/DateTimePicker.tsx:5`
- `components/form-control/field/DatePicker.tsx:5`
- `components/form-control/field/NumberInput.tsx:4`
- `components/form-control/numpad/Numpad.tsx:4`
- `components/form-control/state-preset/StatePreset.tsx:7` → usePersisted도 수정 (contexts→hooks)
- `components/feedback/loading/LoadingContainer.tsx:5` → createMountTransition

`../../utils/createControllableSignal` → `../../hooks/createControllableSignal` (깊이 2단계):

- `components/disclosure/Dialog.tsx:6-8` → createMountTransition, mergeStyles(→helpers)도 수정
- `components/disclosure/Dropdown.tsx:2,6-7` → createMountTransition, mergeStyles(→helpers)도 수정
- `components/disclosure/Collapse.tsx:5` → mergeStyles(→helpers)
- `components/navigation/Tabs.tsx:4` (이 파일은 Task 3에서 disclosure/로 이동)

`../../../utils/mergeStyles` → `../../../helpers/mergeStyles`:

- `components/layout/sidebar/Sidebar.tsx:6`
- `components/layout/sidebar/SidebarContainer.tsx:8`

`../../../utils/splitSlots` → `../../../helpers/splitSlots`:

- `components/data/list/ListItem.tsx:11`
- `components/layout/kanban/Kanban.tsx:21`

`../../../contexts/usePersisted` → `../../../hooks/usePersisted`:

- `components/data/sheet/DataSheet.tsx:30`
- `components/layout/sidebar/SidebarContainer.tsx:7`

**Step 5: index.ts export 경로 수정 (contexts/ + utils/ 부분만)**

`packages/solid/src/index.ts` 변경:

```typescript
// contexts → providers
export * from "./providers/ConfigContext";
export * from "./providers/InitializeProvider";
export * from "./providers/ThemeContext";
export * from "./providers/usePersisted";         // 삭제 (hooks/로 이동)
export * from "./providers/ServiceClientContext";
export * from "./providers/ServiceClientProvider";
export * from "./providers/shared-data/SharedDataContext";
export * from "./providers/shared-data/SharedDataProvider";
export * from "./providers/shared-data/SharedDataChangeEvent";

// hooks (새 섹션)
export * from "./hooks/usePersisted";
export { createControllableSignal } from "./hooks/createControllableSignal";
export { createIMEHandler } from "./hooks/createIMEHandler";
export { createMountTransition } from "./hooks/createMountTransition";
export { useRouterLink } from "./hooks/useRouterLink";

// helpers (새 섹션)
export { mergeStyles } from "./helpers/mergeStyles";
export { splitSlots } from "./helpers/splitSlots";
export { createAppStructure } from "./helpers/createAppStructure";
export type { ... } from "./helpers/createAppStructure";
```

**Step 6: 검증**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid
```

Expected: 에러 없음

**Step 7: 커밋**

```bash
git add -A
git commit -m "refactor(solid): contexts/ → providers/, utils/ → hooks/ + helpers/"
```

---

### Task 3: 컴포넌트 카테고리 재배치

**Files:**

- Move: `components/display/ThemeToggle.tsx` → `components/form-control/ThemeToggle.tsx`
- Move: `components/display/Progress.tsx` → `components/feedback/Progress.tsx`
- Move: `components/layout/kanban/` → `components/data/kanban/`
- Move: `components/navigation/Tabs.tsx` → `components/disclosure/Tabs.tsx`
- Move: `components/print/Print.tsx` + `PrintInstanceContext.ts` → `components/feedback/print/`
- Move: `components/print/usePrint.ts` → `hooks/usePrint.ts`
- Delete: `components/navigation/`, `components/print/`

**Step 1: 파일 이동**

```bash
# ThemeToggle: display/ → form-control/
git mv packages/solid/src/components/display/ThemeToggle.tsx packages/solid/src/components/form-control/

# Progress: display/ → feedback/
git mv packages/solid/src/components/display/Progress.tsx packages/solid/src/components/feedback/

# Kanban: layout/kanban/ → data/kanban/
git mv packages/solid/src/components/layout/kanban packages/solid/src/components/data/

# Tabs: navigation/ → disclosure/
git mv packages/solid/src/components/navigation/Tabs.tsx packages/solid/src/components/disclosure/

# Print: components/print/ → feedback/print/
mkdir -p packages/solid/src/components/feedback/print
git mv packages/solid/src/components/print/Print.tsx packages/solid/src/components/feedback/print/
git mv packages/solid/src/components/print/PrintInstanceContext.ts packages/solid/src/components/feedback/print/

# usePrint: components/print/ → hooks/
git mv packages/solid/src/components/print/usePrint.ts packages/solid/src/hooks/

# 빈 폴더 삭제
rmdir packages/solid/src/components/navigation
rmdir packages/solid/src/components/print
```

**Step 2: 이동된 파일 내부 import 수정**

`components/form-control/ThemeToggle.tsx`:

- `"../../contexts/ThemeContext"` → `"../../providers/ThemeContext"` (Task 1 Step 3에서 이미 수정됨)
- `"./Icon"` → `"../display/Icon"`
- `"../../directives/ripple"` → 경로 변경 없음 (form-control도 깊이 2)

`components/feedback/Progress.tsx`:

- `"../../styles/tokens.styles"` → 경로 변경 없음 (feedback도 깊이 2)

`components/data/kanban/Kanban.tsx`:

- `"../../display/Card"` → 경로 변경 없음 (data와 layout 모두 깊이 2)
- `"../../form-control/checkbox/Checkbox"` → 경로 변경 없음
- `"../../display/Icon"` → 경로 변경 없음
- `"../../feedback/loading/LoadingContainer"` → 경로 변경 없음
- `"../../../hooks/createControllableSignal"` → 경로 변경 없음 (Task 2에서 이미 수정)
- `"../../../helpers/splitSlots"` → 경로 변경 없음

`components/disclosure/Tabs.tsx`:

- `"../../hooks/createControllableSignal"` → 경로 변경 없음 (Task 2에서 이미 수정)

`hooks/usePrint.ts`:

- `"../feedback/loading/LoadingContext"` → `"../components/feedback/loading/LoadingContext"`
- `"./PrintInstanceContext"` → `"../components/feedback/print/PrintInstanceContext"`

**Step 3: index.ts export 경로 수정**

변경할 항목:

```typescript
// form-control 섹션에 추가
export * from "./components/form-control/ThemeToggle";

// feedback 섹션에 추가
export * from "./components/feedback/Progress";
export * from "./components/feedback/print/Print";
export * from "./components/feedback/print/PrintInstanceContext";

// data 섹션 — kanban 경로 변경
// (기존 layout/kanban → data/kanban)

// disclosure 섹션에 추가
export * from "./components/disclosure/Tabs";

// hooks 섹션에 추가
export * from "./hooks/usePrint";

// 삭제
// export * from "./components/display/ThemeToggle";
// export * from "./components/display/Progress";
// export * from "./components/navigation/Tabs";
// export * from "./components/print/Print";
// export * from "./components/print/PrintInstanceContext";
// export * from "./components/print/usePrint";
```

참고: Kanban은 index.ts에서 기존에 layout/kanban이 아닌 layout/sidebar처럼 export 안 되어 있을 수 있으니 현재 index.ts 확인 필요. (현재 index.ts에 Kanban export 없음 → 없으면 data/ 위치로 새로 추가)

**Step 4: 검증**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid
```

Expected: 에러 없음

**Step 5: 커밋**

```bash
git add -A
git commit -m "refactor(solid): 컴포넌트 카테고리 재배치 (ThemeToggle, Progress, Tabs, Kanban, Print)"
```

---

### Task 4: 테스트 파일 이동

**Files:**

- Move: `tests/contexts/` → `tests/providers/`
- Move: `tests/utils/` → `tests/hooks/` + `tests/helpers/`
- Move: `tests/components/navigation/Tabs.spec.tsx` → `tests/components/disclosure/`
- Move: `tests/components/print/` → `tests/components/feedback/print/`
- Move: `tests/components/print/usePrint.spec.tsx` → `tests/hooks/`
- Move: `tests/components/layout/kanban/` → `tests/components/data/kanban/`
- 주의: ThemeToggle, Progress 테스트 파일은 현재 없으므로 이동 불필요

**Step 1: 파일 이동**

```bash
# contexts → providers
mkdir -p packages/solid/tests/providers/shared-data
git mv packages/solid/tests/contexts/ConfigContext.spec.ts packages/solid/tests/providers/
git mv packages/solid/tests/contexts/ServiceClientContext.spec.tsx packages/solid/tests/providers/
git mv packages/solid/tests/contexts/shared-data/SharedDataProvider.spec.tsx packages/solid/tests/providers/shared-data/

# contexts hooks → hooks
mkdir -p packages/solid/tests/hooks
git mv packages/solid/tests/contexts/usePersisted.spec.tsx packages/solid/tests/hooks/

# utils → hooks + helpers
git mv packages/solid/tests/utils/createControllableSignal.spec.ts packages/solid/tests/hooks/
git mv packages/solid/tests/utils/createMountTransition.spec.ts packages/solid/tests/hooks/
git mv packages/solid/tests/utils/createIMEHandler.spec.ts packages/solid/tests/hooks/
git mv packages/solid/tests/utils/useRouterLink.spec.tsx packages/solid/tests/hooks/

mkdir -p packages/solid/tests/helpers
git mv packages/solid/tests/utils/mergeStyles.spec.ts packages/solid/tests/helpers/
git mv packages/solid/tests/utils/splitSlots.spec.tsx packages/solid/tests/helpers/
git mv packages/solid/tests/utils/createAppStructure.spec.tsx packages/solid/tests/helpers/

# components 재배치
git mv packages/solid/tests/components/navigation/Tabs.spec.tsx packages/solid/tests/components/disclosure/
git mv packages/solid/tests/components/layout/kanban packages/solid/tests/components/data/
mkdir -p packages/solid/tests/components/feedback/print
git mv packages/solid/tests/components/print/Print.spec.tsx packages/solid/tests/components/feedback/print/
git mv packages/solid/tests/components/print/usePrint.spec.tsx packages/solid/tests/hooks/

# 빈 폴더 삭제
rmdir packages/solid/tests/contexts/shared-data
rmdir packages/solid/tests/contexts
rmdir packages/solid/tests/utils
rmdir packages/solid/tests/components/navigation
rmdir packages/solid/tests/components/print
```

**Step 2: 테스트 파일 내부 import 수정**

테스트 파일이 `@simplysm/solid`에서 import하는 경우 변경 없음.
소스 파일을 상대경로로 직접 import하는 경우만 수정 필요. (각 테스트 파일을 확인하여 수정)

**Step 3: 검증**

```bash
pnpm vitest --project=solid --run
```

Expected: 모든 테스트 통과

**Step 4: 커밋**

```bash
git add -A
git commit -m "refactor(solid): 테스트 파일 구조를 소스 구조와 동기화"
```

---

### Task 5: solid-demo 동기화

**Files:**

- Move: `solid-demo/src/pages/display/ThemeTogglePage.tsx` → `pages/form-control/`
- Move: `solid-demo/src/pages/display/ProgressPage.tsx` → `pages/feedback/`
- Move: `solid-demo/src/pages/navigation/TabPage.tsx` → `pages/disclosure/`
- Modify: `solid-demo/src/appStructure.ts`
- Delete: `solid-demo/src/pages/navigation/`

**Step 1: 페이지 파일 이동**

```bash
git mv packages/solid-demo/src/pages/display/ThemeTogglePage.tsx packages/solid-demo/src/pages/form-control/
git mv packages/solid-demo/src/pages/display/ProgressPage.tsx packages/solid-demo/src/pages/feedback/
git mv packages/solid-demo/src/pages/navigation/TabPage.tsx packages/solid-demo/src/pages/disclosure/

rmdir packages/solid-demo/src/pages/navigation
```

**Step 2: appStructure.ts 수정**

`packages/solid-demo/src/appStructure.ts` 변경:

- **form-control 섹션** 마지막에 추가:

  ```typescript
  { code: "theme-toggle", title: "ThemeToggle", component: lazy(() => import("./pages/form-control/ThemeTogglePage")) },
  ```

- **disclosure 섹션** 마지막에 추가:

  ```typescript
  { code: "tab", title: "Tabs", component: lazy(() => import("./pages/disclosure/TabPage")) },
  ```

- **display 섹션**에서 제거:
  - `progress` 항목
  - `theme-toggle` 항목

- **feedback 섹션**에 추가:

  ```typescript
  { code: "progress", title: "Progress", component: lazy(() => import("./pages/feedback/ProgressPage")) },
  ```

- **navigation 섹션** 전체 삭제 (객체 + 쉼표)

**Step 3: 검증**

```bash
pnpm typecheck packages/solid-demo
pnpm lint packages/solid-demo
```

Expected: 에러 없음

**Step 4: 커밋**

```bash
git add -A
git commit -m "refactor(solid-demo): 데모 페이지 카테고리를 solid 패키지와 동기화"
```

---

### Task 6: 최종 검증

**Step 1: 전체 typecheck**

```bash
pnpm typecheck
```

Expected: 에러 없음

**Step 2: 전체 lint**

```bash
pnpm lint
```

Expected: 에러 없음

**Step 3: solid 테스트**

```bash
pnpm vitest --project=solid --run
```

Expected: 모든 테스트 통과

**Step 4: 데모 앱 실행 확인**

```bash
pnpm dev
```

브라우저에서 확인:

- 사이드바 메뉴 구조 정상 표시
- ThemeToggle → Form Control 섹션
- Progress → Feedback 섹션
- Tabs → Disclosure 섹션
- Kanban → Data 섹션
- 각 페이지 정상 렌더링
