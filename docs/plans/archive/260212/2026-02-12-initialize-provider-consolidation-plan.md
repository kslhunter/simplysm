# InitializeProvider Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Root-level providers (Theme, Notification, Dialog, Loading)를 InitializeProvider 내부에서 조합하여 앱 루트 boilerplate를 제거한다.

**Architecture:** InitializeProvider가 지휘자(orchestrator)로서 개별 Provider들을 올바른 순서로 내부 조합한다. 개별 Provider 파일은 그대로 유지하되 index.ts export에서 제거하여 외부 직접 사용을 차단한다.

**Tech Stack:** SolidJS, TypeScript

---

### Task 1: AppConfig에 loadingVariant 추가

**Files:**
- Modify: `packages/solid/src/providers/ConfigContext.ts:19-29`

**Step 1: AppConfig 인터페이스에 loadingVariant 필드 추가**

```typescript
export interface AppConfig {
  /**
   * 클라이언트 식별자 (저장소 key prefix로 사용)
   */
  clientName: string;

  /**
   * 커스텀 저장소 (기본값: localStorage)
   */
  storage?: StorageAdapter;

  /**
   * 루트 로딩 오버레이 변형 (기본값: "spinner")
   */
  loadingVariant?: "spinner" | "bar";
}
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck packages/solid`
Expected: PASS (새 optional 필드 추가이므로 기존 코드에 영향 없음)

**Step 3: Commit**

```bash
git add packages/solid/src/providers/ConfigContext.ts
git commit -m "feat(solid): add loadingVariant to AppConfig"
```

---

### Task 2: InitializeProvider에 4개 Provider 조합

**Files:**
- Modify: `packages/solid/src/providers/InitializeProvider.tsx`

**Step 1: InitializeProvider 수정**

기존 ConfigContext.Provider만 감싸던 구조에서, ThemeProvider → NotificationProvider → NotificationBanner → LoadingProvider → DialogProvider를 내부에서 조합하도록 변경한다.

```tsx
import type { ParentComponent } from "solid-js";
import { type AppConfig, ConfigContext } from "./ConfigContext";
import { useClipboardValueCopy } from "../hooks/useClipboardValueCopy";
import { ThemeProvider } from "./ThemeContext";
import { NotificationProvider } from "../components/feedback/notification/NotificationProvider";
import { NotificationBanner } from "../components/feedback/notification/NotificationBanner";
import { LoadingProvider } from "../components/feedback/loading/LoadingProvider";
import { DialogProvider } from "../components/disclosure/DialogProvider";

/**
 * @simplysm/solid 초기화 Provider
 *
 * @remarks
 * 앱 루트에서 한 번 감싸며, 다음을 초기화한다:
 * - 앱 전역 설정 (config) Context 제공
 * - 폼 컨트롤 value 클립보드 복사 지원
 * - 테마 (라이트/다크/시스템)
 * - 알림 시스템 + 배너
 * - 루트 로딩 오버레이
 * - 프로그래매틱 다이얼로그
 *
 * @example
 * ```tsx
 * <InitializeProvider config={{ clientName: "myApp" }}>
 *   <App />
 * </InitializeProvider>
 * ```
 */
export const InitializeProvider: ParentComponent<{ config: AppConfig }> = (props) => {
  // 폼 컨트롤 value 클립보드 복사
  useClipboardValueCopy();

  // eslint-disable-next-line solid/reactivity -- config는 초기 설정값으로 변경되지 않음
  return (
    <ConfigContext.Provider value={props.config}>
      <ThemeProvider>
        <NotificationProvider>
          <NotificationBanner />
          <LoadingProvider variant={props.config.loadingVariant}>
            <DialogProvider>
              {props.children}
            </DialogProvider>
          </LoadingProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ConfigContext.Provider>
  );
};
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/providers/InitializeProvider.tsx
git commit -m "feat(solid): compose root providers inside InitializeProvider"
```

---

### Task 3: index.ts에서 개별 Provider export 제거

**Files:**
- Modify: `packages/solid/src/index.ts`

**Step 1: 개별 Provider와 NotificationBanner export 제거**

제거 대상 라인:
- `export * from "./providers/ThemeContext";` — ThemeProvider 제거 (useTheme, ThemeMode, ResolvedTheme 타입도 여기서 export되므로, ThemeProvider만 제외하고 나머지는 유지해야 함. ThemeContext.tsx에서 ThemeProvider 외의 export는 useTheme, ThemeMode, ResolvedTheme이므로 별도 re-export 필요)
- `export * from "./components/disclosure/DialogProvider";` — 전체 제거 (DialogProviderProps만 export하므로 불필요)
- `export * from "./components/feedback/notification/NotificationProvider";` — 전체 제거 (NotificationProvider만 export)
- `export * from "./components/feedback/notification/NotificationBanner";` — 전체 제거 (자동 렌더링됨)
- `export * from "./components/feedback/loading/LoadingProvider";` — 전체 제거 (LoadingProvider만 export)

ThemeContext.tsx는 `ThemeProvider`(제거 대상)와 `useTheme`, `ThemeMode`, `ResolvedTheme`(유지 대상)을 함께 export하므로, `export *` 대신 named export로 변경한다.

변경 후 providers 섹션:

```typescript
// providers
export * from "./providers/ConfigContext";
export * from "./providers/InitializeProvider";
export { useTheme } from "./providers/ThemeContext";
export type { ThemeMode, ResolvedTheme } from "./providers/ThemeContext";
export * from "./providers/ServiceClientContext";
export * from "./providers/ServiceClientProvider";
export * from "./providers/shared-data/SharedDataContext";
export * from "./providers/shared-data/SharedDataProvider";
export * from "./providers/shared-data/SharedDataChangeEvent";
```

변경 후 disclosure 섹션 (DialogProvider 라인 제거):

```typescript
// disclosure
export * from "./components/disclosure/Collapse";
export * from "./components/disclosure/Dropdown";
export * from "./components/disclosure/Dialog";
export * from "./components/disclosure/DialogContext";
export * from "./components/disclosure/DialogInstanceContext";
export * from "./components/disclosure/Tabs";
```

변경 후 feedback 섹션 (NotificationProvider, NotificationBanner, LoadingProvider 라인 제거):

```typescript
// feedback
export * from "./components/feedback/notification/NotificationContext";
export * from "./components/feedback/notification/NotificationBell";

// feedback - loading
export * from "./components/feedback/loading/LoadingContext";
export * from "./components/feedback/loading/LoadingContainer";
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: lint 확인**

Run: `pnpm lint packages/solid/src/index.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "refactor(solid): remove individual provider exports from index"
```

---

### Task 4: solid-demo App.tsx 단순화

**Files:**
- Modify: `packages/solid-demo/src/App.tsx`

**Step 1: 중첩 Provider 제거, InitializeProvider만 사용**

```tsx
import type { RouteSectionProps } from "@solidjs/router";
import { InitializeProvider } from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <InitializeProvider config={{ clientName: "solid-demo" }}>
      {props.children}
    </InitializeProvider>
  );
}
```

**Step 2: typecheck 확인**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid-demo/src/App.tsx
git commit -m "refactor(solid-demo): simplify App.tsx with consolidated InitializeProvider"
```

---

### Task 5: sd-cli 템플릿 App.tsx.hbs 단순화

**Files:**
- Modify: `packages/sd-cli/templates/add-client/__CLIENT__/src/App.tsx.hbs`

**Step 1: 템플릿 단순화**

```handlebars
{{#if router}}
import type { RouteSectionProps } from "@solidjs/router";
import { InitializeProvider } from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <InitializeProvider config=\{{ clientName: "{{clientName}}" }}>
      {props.children}
    </InitializeProvider>
  );
}
{{else}}
import { InitializeProvider } from "@simplysm/solid";
import { HomePage } from "./pages/HomePage";

export function App() {
  return (
    <InitializeProvider config=\{{ clientName: "{{clientName}}" }}>
      <HomePage />
    </InitializeProvider>
  );
}
{{/if}}
```

**Step 2: Commit**

```bash
git add packages/sd-cli/templates/add-client/__CLIENT__/src/App.tsx.hbs
git commit -m "refactor(sd-cli): simplify App.tsx template with consolidated InitializeProvider"
```

---

### Task 6: 전체 검증

**Step 1: 전체 typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 2: 전체 lint**

Run: `pnpm lint packages/solid packages/solid-demo`
Expected: PASS

**Step 3: 관련 테스트 실행**

Run: `pnpm vitest --project=solid --run`
Expected: PASS

**Step 4: 문제 발견 시 수정 후 commit**
