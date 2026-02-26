# Solid Package i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Implement i18n support in `@simplysm/solid` using `@solid-primitives/i18n`, adding en/ko dictionaries and refactoring 60+ components to use translated strings.

**Architecture:** Create I18nProvider + useI18n hook following LoggerProvider pattern. Built-in nested dictionaries (en/ko) are flattened at runtime. Components use `t()` function for all user-facing strings. localStorage persistence via `useSyncConfig`. Runtime override/merge capability for apps.

**Tech Stack:** `@solid-primitives/i18n@2.2.1`, SolidJS `^1.9.11`, `useSyncConfig` hook, template interpolation with `{{key}}` syntax.

---

## Task 1: Install dependency

**Files:**
- Modify: `packages/solid/package.json`

**Step 1: Install @solid-primitives/i18n**

Run: `pnpm add -w @solid-primitives/i18n`

Expected: Package added to workspace root `pnpm-lock.yaml`

**Step 2: Verify installation**

Run: `pnpm ls @solid-primitives/i18n`

Expected: Shows `@solid-primitives/i18n 2.2.1` installed

**Step 3: Commit**

```bash
cd /d/workspaces-13/simplysm/.worktrees/solid-i18n
git add pnpm-lock.yaml
git commit -m "deps: add @solid-primitives/i18n"
```

---

## Task 2: Create I18nContext types

**Files:**
- Create: `packages/solid/src/providers/i18n/I18nContext.types.ts`

**Step 1: Write type definitions**

```typescript
import type { Accessor } from "solid-js";

/**
 * I18n context value
 */
export interface I18nContextValue {
  /** Translate function */
  t: (key: string, params?: Record<string, string>) => string;
  /** Current active locale (reactive) */
  locale: Accessor<string>;
  /** Set active locale */
  setLocale: (locale: string) => void;
  /** Configure dictionary and locale */
  configure: (options: I18nConfigureOptions) => void;
}

/**
 * I18n configure options
 */
export interface I18nConfigureOptions {
  /** Active locale (if omitted, current locale is kept) */
  locale?: string;
  /** Nested dictionaries to merge into built-in dicts */
  dict?: Record<string, Record<string, unknown>>;
}

/**
 * Flattened i18n dictionary
 */
export type FlatDict = Record<string, string>;
```

**Step 2: Commit**

```bash
git add packages/solid/src/providers/i18n/I18nContext.types.ts
git commit -m "feat(i18n): add type definitions"
```

---

## Task 3: Create i18n utilities

**Files:**
- Create: `packages/solid/src/providers/i18n/i18nUtils.ts`

**Step 1: Write flatten and template interpolation utilities**

```typescript
/**
 * Flatten nested object to dot-notation keys
 * @example
 * flatten({ a: { b: { c: "value" } } })
 * // { "a.b.c": "value" }
 */
export function flattenDict(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenDict(value as Record<string, unknown>, fullKey));
    }
  }

  return result;
}

/**
 * Merge two flat dictionaries (b overwrites a)
 */
export function mergeDict(a: Record<string, string>, b: Record<string, string>): Record<string, string> {
  return { ...a, ...b };
}

/**
 * Interpolate template with {{key}} syntax
 * @example
 * interpolate("Hello {{name}}", { name: "World" }) // "Hello World"
 */
export function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
}
```

**Step 2: Commit**

```bash
git add packages/solid/src/providers/i18n/i18nUtils.ts
git commit -m "feat(i18n): add utility functions (flatten, merge, interpolate)"
```

---

## Task 4: Create English dictionary

**Files:**
- Create: `packages/solid/src/providers/i18n/locales/en.ts`

**Step 1: Write English dictionary (nested)**

```typescript
export default {
  calendar: {
    weeks: {
      sun: "Sun",
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
    },
  },
  dataSheet: {
    collapseAll: "Collapse all",
    expandAll: "Expand all",
    sheetSettings: "Sheet Settings",
  },
  dataSheetConfigDialog: {
    column: "Column",
    fixed: "Fixed",
    hidden: "Hidden",
    width: "Width",
    autoPlaceholder: "auto",
    resetConfirm: "Are you sure you want to reset all sheet settings?",
    reset: "Reset",
    cancel: "Cancel",
    confirm: "Confirm",
  },
  dateRangePicker: {
    day: "Day",
    month: "Month",
    range: "Range",
  },
  select: {
    searchPlaceholder: "Search...",
  },
  topbar: {
    toggleSidebar: "Toggle sidebar",
  },
  sidebar: {
    closeSidebar: "Close sidebar",
  },
  editorToolbar: {
    heading1: "Heading 1",
    heading2: "Heading 2",
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    strikethrough: "Strikethrough",
    textColor: "Text color",
    bgColor: "Background color",
    bulletList: "Bullet list",
    numberedList: "Numbered list",
    increaseIndent: "Increase indent",
    decreaseIndent: "Decrease indent",
    blockquote: "Blockquote",
    codeBlock: "Code block",
    alignLeft: "Align left",
    alignCenter: "Align center",
    alignRight: "Align right",
    justify: "Justify",
    insertTable: "Insert table",
    insertImage: "Insert image",
    clearFormatting: "Clear formatting",
  },
  statePreset: {
    addPreset: "Add preset",
    overwrite: "Overwrite with current state",
    deletePreset: "Delete preset",
    namePlaceholder: "Name...",
    duplicateName: "Duplicate name",
    duplicateMessage: "A preset with this name already exists.",
    saved: "Preset saved",
    savedMessage: "Preset \"{{name}}\" has been saved.",
    overwritten: "Preset overwritten",
    overwrittenMessage: "Preset \"{{name}}\" has been updated with the current state.",
    undo: "Undo",
    deleted: "Preset deleted",
    deletedMessage: "Preset \"{{name}}\" has been deleted.",
  },
  permissionTable: {
    permissionItem: "Permission Item",
  },
  crudSheet: {
    lastModified: "Last Modified",
    modifiedBy: "Modified By",
    notice: "Notice",
    noChanges: "No changes to save.",
    saveCompleted: "Save completed",
    saveSuccess: "Saved successfully.",
    deleteCompleted: "Delete completed",
    deleteSuccess: "Deleted successfully.",
    restoreCompleted: "Restore completed",
    restoreSuccess: "Restored successfully.",
    excelCompleted: "Completed",
    excelUploadSuccess: "Excel upload completed successfully.",
    lookupFailed: "Lookup failed",
    saveFailed: "Save failed",
    deleteFailed: "Delete failed",
    restoreFailed: "Restore failed",
    excelDownloadFailed: "Excel download failed",
    excelUploadFailed: "Excel upload failed",
    discardChanges: "You have unsaved changes. Discard them?",
  },
  crudDetail: {
    discardChanges: "Discard changes?",
  },
  sharedDataSelect: {
    search: "Search",
    edit: "Edit",
  },
  dataSelectButton: {
    deselect: "Deselect",
    search: "Search",
  },
  notification: {
    close: "Close notification",
  },
  topbarMenu: {
    menu: "Menu",
  },
};
```

**Step 2: Commit**

```bash
git add packages/solid/src/providers/i18n/locales/en.ts
git commit -m "feat(i18n): add English dictionary"
```

---

## Task 5: Create Korean dictionary

**Files:**
- Create: `packages/solid/src/providers/i18n/locales/ko.ts`

**Step 1: Write Korean dictionary (nested, same structure as en.ts)**

```typescript
export default {
  calendar: {
    weeks: {
      sun: "일",
      mon: "월",
      tue: "화",
      wed: "수",
      thu: "목",
      fri: "금",
      sat: "토",
    },
  },
  dataSheet: {
    collapseAll: "전체 접기",
    expandAll: "전체 펼치기",
    sheetSettings: "시트 설정",
  },
  dataSheetConfigDialog: {
    column: "컬럼",
    fixed: "고정",
    hidden: "숨김",
    width: "너비",
    autoPlaceholder: "자동",
    resetConfirm: "모든 시트 설정을 초기화하시겠습니까?",
    reset: "초기화",
    cancel: "취소",
    confirm: "확인",
  },
  dateRangePicker: {
    day: "일",
    month: "월",
    range: "범위",
  },
  select: {
    searchPlaceholder: "검색...",
  },
  topbar: {
    toggleSidebar: "사이드바 토글",
  },
  sidebar: {
    closeSidebar: "사이드바 닫기",
  },
  editorToolbar: {
    heading1: "제목 1",
    heading2: "제목 2",
    bold: "굵게",
    italic: "기울임",
    underline: "밑줄",
    strikethrough: "취소선",
    textColor: "텍스트 색상",
    bgColor: "배경색",
    bulletList: "글머리 목록",
    numberedList: "번호 목록",
    increaseIndent: "들여쓰기 증가",
    decreaseIndent: "들여쓰기 감소",
    blockquote: "인용구",
    codeBlock: "코드 블록",
    alignLeft: "왼쪽 정렬",
    alignCenter: "중앙 정렬",
    alignRight: "오른쪽 정렬",
    justify: "양쪽 정렬",
    insertTable: "표 삽입",
    insertImage: "이미지 삽입",
    clearFormatting: "서식 지우기",
  },
  statePreset: {
    addPreset: "프리셋 추가",
    overwrite: "현재 상태로 덮어쓰기",
    deletePreset: "프리셋 삭제",
    namePlaceholder: "이름...",
    duplicateName: "중복된 이름",
    duplicateMessage: "이 이름의 프리셋이 이미 존재합니다.",
    saved: "프리셋 저장됨",
    savedMessage: "프리셋 \"{{name}}\"이(가) 저장되었습니다.",
    overwritten: "프리셋 덮어쓰기됨",
    overwrittenMessage: "프리셋 \"{{name}}\"이(가) 현재 상태로 업데이트되었습니다.",
    undo: "실행 취소",
    deleted: "프리셋 삭제됨",
    deletedMessage: "프리셋 \"{{name}}\"이(가) 삭제되었습니다.",
  },
  permissionTable: {
    permissionItem: "권한 항목",
  },
  crudSheet: {
    lastModified: "마지막 수정",
    modifiedBy: "수정자",
    notice: "알림",
    noChanges: "저장할 변경 사항이 없습니다.",
    saveCompleted: "저장 완료",
    saveSuccess: "저장되었습니다.",
    deleteCompleted: "삭제 완료",
    deleteSuccess: "삭제되었습니다.",
    restoreCompleted: "복원 완료",
    restoreSuccess: "복원되었습니다.",
    excelCompleted: "완료",
    excelUploadSuccess: "엑셀 업로드가 완료되었습니다.",
    lookupFailed: "조회 실패",
    saveFailed: "저장 실패",
    deleteFailed: "삭제 실패",
    restoreFailed: "복원 실패",
    excelDownloadFailed: "엑셀 다운로드 실패",
    excelUploadFailed: "엑셀 업로드 실패",
    discardChanges: "저장하지 않은 변경 사항이 있습니다. 삭제하시겠습니까?",
  },
  crudDetail: {
    discardChanges: "변경 사항을 삭제하시겠습니까?",
  },
  sharedDataSelect: {
    search: "검색",
    edit: "편집",
  },
  dataSelectButton: {
    deselect: "선택 해제",
    search: "검색",
  },
  notification: {
    close: "알림 닫기",
  },
  topbarMenu: {
    menu: "메뉴",
  },
};
```

**Step 2: Commit**

```bash
git add packages/solid/src/providers/i18n/locales/ko.ts
git commit -m "feat(i18n): add Korean dictionary"
```

---

## Task 6: Create I18nContext and Provider

**Files:**
- Create: `packages/solid/src/providers/i18n/I18nContext.tsx`

**Step 1: Write I18nContext, Provider, and hooks**

```typescript
import {
  createContext,
  useContext,
  type ParentComponent,
  createSignal,
  createMemo,
} from "solid-js";
import type { I18nContextValue, I18nConfigureOptions, FlatDict } from "./I18nContext.types";
import { flattenDict, mergeDict, interpolate } from "./i18nUtils";
import enDict from "./locales/en";
import koDict from "./locales/ko";

/**
 * I18n Context
 */
const I18nContext = createContext<I18nContextValue>();

/**
 * Detect locale from navigator.language
 * "ko-KR" → "ko", "en-US" → "en", etc.
 */
function detectLocaleFromNavigator(): string {
  const lang = navigator.language.split("-")[0];
  return ["ko", "en"].includes(lang) ? lang : "en";
}

/**
 * Get i18n context value
 *
 * @throws Throws error if I18nProvider is not present
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n can only be used inside I18nProvider");
  }
  return context;
}

/**
 * Get i18n context value (optional, returns undefined if not in provider)
 */
export function useI18nOptional(): I18nContextValue | undefined {
  return useContext(I18nContext);
}

/**
 * I18n Provider component
 *
 * @remarks
 * - Provides i18n context with t(), locale, setLocale, configure
 * - Built-in dictionaries: en, ko (nested, flattened at runtime)
 * - localStorage persistence via @simplysm/solid useSyncConfig pattern
 * - Apps can override/extend dicts via configure()
 *
 * @example
 * ```tsx
 * <I18nProvider>
 *   <App />
 * </I18nProvider>
 *
 * // Later in app:
 * const { t, setLocale, configure } = useI18n();
 *
 * // Change locale
 * setLocale("ko");
 *
 * // Or override/add languages
 * configure({
 *   locale: "ja",
 *   dict: {
 *     ja: { "calendar.weeks.sun": "日" },
 *   },
 * });
 * ```
 */
export const I18nProvider: ParentComponent = (props) => {
  // Flatten built-in dictionaries
  const builtInDicts: Record<string, FlatDict> = {
    en: flattenDict(enDict),
    ko: flattenDict(koDict),
  };

  // State for active locale and loaded dictionaries
  const [locale, setLocale] = createSignal<string>(detectLocaleFromNavigator());
  const [dicts, setDicts] = createSignal<Record<string, FlatDict>>(builtInDicts);

  // Current dictionary (locale-specific)
  const currentDict = createMemo(() => {
    const current = locale();
    return dicts()[current] ?? dicts().en;
  });

  // Translate function
  const t = (key: string, params?: Record<string, string>): string => {
    const dict = currentDict();
    const template = dict[key] ?? dicts().en[key] ?? key;
    return interpolate(template, params);
  };

  // Configure function (cumulative merge)
  const configure = (options: I18nConfigureOptions) => {
    if (options.locale) {
      setLocale(options.locale);
    }

    if (options.dict) {
      setDicts((prevDicts) => {
        const newDicts = { ...prevDicts };
        for (const [loc, nestedDict] of Object.entries(options.dict!)) {
          const flattened = flattenDict(nestedDict);
          newDicts[loc] = mergeDict(newDicts[loc] ?? {}, flattened);
        }
        return newDicts;
      });
    }
  };

  const contextValue: I18nContextValue = {
    t,
    locale,
    setLocale,
    configure,
  };

  return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
};
```

**Step 2: Commit**

```bash
git add packages/solid/src/providers/i18n/I18nContext.tsx
git commit -m "feat(i18n): implement I18nProvider and useI18n hook"
```

---

## Task 7: Update SystemProvider to include I18nProvider

**Files:**
- Modify: `packages/solid/src/providers/SystemProvider.tsx:1-50`

**Step 1: Read current SystemProvider**

Run: `cat packages/solid/src/providers/SystemProvider.tsx | head -50`

**Step 2: Add I18nProvider import and nest it after ConfigProvider**

```typescript
import { I18nProvider } from "./i18n/I18nContext";

export const SystemProvider: ParentComponent = (props) => {
  return (
    <ConfigProvider clientName="simplysm">
      <I18nProvider>
        <SyncStorageProvider>
          {/* ... rest of providers ... */}
        </SyncStorageProvider>
      </I18nProvider>
    </ConfigProvider>
  );
};
```

**Step 3: Commit**

```bash
git add packages/solid/src/providers/SystemProvider.tsx
git commit -m "feat(i18n): add I18nProvider to SystemProvider chain"
```

---

## Task 8: Export I18n from index.ts

**Files:**
- Modify: `packages/solid/src/index.ts`

**Step 1: Add i18n exports to providers section**

```typescript
// I18n
export * from "./providers/i18n/I18nContext";
export * from "./providers/i18n/I18nContext.types";
```

**Step 2: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(i18n): export I18nContext and types from main index"
```

---

## Task 9: Refactor Calendar component

**Files:**
- Modify: `packages/solid/src/components/data/calendar/Calendar.tsx:1-30`

**Step 1: Add useI18n hook**

Replace:
```typescript
const WEEKS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
```

With:
```typescript
import { useI18nOptional } from "../../../providers/i18n/I18nContext";

function CalendarBase<TValue>(props: CalendarProps<TValue>) {
  const i18n = useI18nOptional();
  const weekNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

  const weekHeaders = createMemo(() => {
    const start = weekStartDay();
    return Array.from({ length: 7 }, (_, i) => {
      const key = weekNames[(start + i) % 7];
      return i18n?.t(`calendar.weeks.${key}`) ??
             { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" }[key];
    });
  });
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/data/calendar/Calendar.tsx
git commit -m "feat(i18n): refactor Calendar to use i18n"
```

---

## Task 10: Refactor DataSheet component

**Files:**
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:200-250` (approx where collapse/expand title is)

**Step 1: Add useI18n hook and update title**

Add import:
```typescript
import { useI18nOptional } from "../../../providers/i18n/I18nContext";
```

In component, replace:
```typescript
title={isAllExpanded() ? "Collapse all" : "Expand all"}
```

With:
```typescript
const i18n = useI18nOptional();
title={isAllExpanded()
  ? (i18n?.t("dataSheet.collapseAll") ?? "Collapse all")
  : (i18n?.t("dataSheet.expandAll") ?? "Expand all")}
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "feat(i18n): refactor DataSheet expand/collapse labels"
```

---

## Task 11: Refactor DateRangePicker component

**Files:**
- Modify: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx:160-172`

**Step 1: Add useI18n hook**

Add import:
```typescript
import { useI18nOptional } from "../../../providers/i18n/I18nContext";
```

Replace hardcoded labels:
```typescript
const i18n = useI18nOptional();

<Select.Item value={"day" as DateRangePeriodType}>
  {i18n?.t("dateRangePicker.day") ?? "Day"}
</Select.Item>
<Select.Item value={"month" as DateRangePeriodType}>
  {i18n?.t("dateRangePicker.month") ?? "Month"}
</Select.Item>
<Select.Item value={"range" as DateRangePeriodType}>
  {i18n?.t("dateRangePicker.range") ?? "Range"}
</Select.Item>

// In renderValue:
renderValue={(v: DateRangePeriodType) => {
  const labels = {
    day: i18n?.t("dateRangePicker.day") ?? "Day",
    month: i18n?.t("dateRangePicker.month") ?? "Month",
    range: i18n?.t("dateRangePicker.range") ?? "Range"
  };
  return <>{labels[v]}</>;
}}
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx
git commit -m "feat(i18n): refactor DateRangePicker period type labels"
```

---

## Task 12: Refactor SidebarContainer component

**Files:**
- Modify: `packages/solid/src/components/layout/sidebar/SidebarContainer.tsx:114`

**Step 1: Add useI18n hook**

Add import:
```typescript
import { useI18nOptional } from "../../../providers/i18n/I18nContext";
```

Replace aria-label:
```typescript
const i18n = useI18nOptional();

aria-label={i18n?.t("sidebar.closeSidebar") ?? "Close sidebar"}
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/layout/sidebar/SidebarContainer.tsx
git commit -m "feat(i18n): refactor SidebarContainer close button aria-label"
```

---

## Task 13: Refactor PermissionTable component

**Files:**
- Modify: `packages/solid/src/components/features/permission-table/PermissionTable.tsx:269`

**Step 1: Add useI18n hook**

Add import:
```typescript
import { useI18nOptional } from "../../../providers/i18n/I18nContext";
```

Replace header text:
```typescript
const i18n = useI18nOptional();

<DataSheet.Column key="title" header={i18n?.t("permissionTable.permissionItem") ?? "Permission Item"} ...>
```

**Step 2: Commit**

```bash
git add packages/solid/src/components/features/permission-table/PermissionTable.tsx
git commit -m "feat(i18n): refactor PermissionTable column header"
```

---

## Task 14: Refactor remaining form-control components

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid/src/components/form-control/RichTextEditor.tsx`
- Modify: Other form inputs as needed

**Step 1: Update Select placeholder**

In Select.tsx, add useI18n and replace "Search..." with:
```typescript
const i18n = useI18nOptional();
placeholder={i18n?.t("select.searchPlaceholder") ?? "Search..."}
```

**Step 2: Update EditorToolbar (if exists)**

Find all hardcoded toolbar labels and replace with i18n keys like:
- `editorToolbar.heading1`, `editorToolbar.bold`, etc.

**Step 3: Commit all form-control changes**

```bash
git add packages/solid/src/components/form-control/
git commit -m "feat(i18n): refactor form-control component labels"
```

---

## Task 15: Refactor CrudSheet component (notification messages)

**Files:**
- Modify: `packages/solid/src/components/features/CrudSheet.tsx`

**Step 1: Add useI18n and replace notification messages**

Add import and hook:
```typescript
import { useI18nOptional } from "../../providers/i18n/I18nContext";

const CrudSheet = (props: CrudSheetProps) => {
  const i18n = useI18nOptional();
```

Replace hardcoded messages with keys like:
- `"No changes to save."` → `i18n?.t("crudSheet.noChanges") ?? "No changes to save."`
- `"Saved successfully."` → `i18n?.t("crudSheet.saveSuccess") ?? "Saved successfully."`
- `"You have unsaved changes. Discard them?"` → `i18n?.t("crudSheet.discardChanges") ?? "..."`
- Template messages with `{{name}}` → use params in t()

**Step 2: Commit**

```bash
git add packages/solid/src/components/features/CrudSheet.tsx
git commit -m "feat(i18n): refactor CrudSheet notification messages"
```

---

## Task 16: Refactor CrudDetail and other feature components

**Files:**
- Modify: `packages/solid/src/components/features/CrudDetail.tsx`
- Modify: `packages/solid/src/components/features/SharedDataSelect.tsx`
- Modify: Other feature components with i18n strings

**Step 1: Apply same i18n pattern to all feature components**

Add useI18n hook and replace all hardcoded UI strings with i18n keys.

**Step 2: Commit**

```bash
git add packages/solid/src/components/features/
git commit -m "feat(i18n): refactor feature components for i18n"
```

---

## Task 17: Refactor layout components (Topbar, etc.)

**Files:**
- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx`
- Modify: `packages/solid/src/components/layout/TopbarMenu.tsx`

**Step 1: Apply i18n pattern**

Replace:
- `"Toggle sidebar"` → `i18n?.t("topbar.toggleSidebar")`
- `"Menu"` → `i18n?.t("topbarMenu.menu")`

**Step 2: Commit**

```bash
git add packages/solid/src/components/layout/
git commit -m "feat(i18n): refactor layout component labels"
```

---

## Task 18: Refactor disclosure components (NotificationBanner, etc.)

**Files:**
- Modify: `packages/solid/src/components/disclosure/NotificationBanner.tsx`
- Modify: Other disclosure components as needed

**Step 1: Apply i18n pattern**

Replace aria-labels and button text with i18n keys.

**Step 2: Commit**

```bash
git add packages/solid/src/components/disclosure/
git commit -m "feat(i18n): refactor disclosure component labels"
```

---

## Task 19: Add localStorage persistence for locale

**Files:**
- Modify: `packages/solid/src/providers/i18n/I18nContext.tsx:50-80` (I18nProvider)

**Step 1: Integrate useSyncConfig for persistence**

```typescript
import { useSyncConfig } from "../../hooks/useSyncConfig";

export const I18nProvider: ParentComponent = (props) => {
  // Use useSyncConfig for localStorage persistence
  const [locale, setLocale, ready] = useSyncConfig<string>("i18n-locale", detectLocaleFromNavigator());

  // Only use locale after it's loaded from storage
  const [dicts, setDicts] = createSignal<Record<string, FlatDict>>(builtInDicts);

  // ... rest of provider
};
```

**Step 2: Commit**

```bash
git add packages/solid/src/providers/i18n/I18nContext.tsx
git commit -m "feat(i18n): add localStorage persistence for locale setting"
```

---

## Task 20: Update tests for components with i18n

**Files:**
- Modify: `packages/solid/src/**/*.spec.ts` (all test files)

**Step 1: Wrap test renders with I18nProvider**

For each component test, wrap render in I18nProvider:

```typescript
import { I18nProvider } from "../../providers/i18n/I18nContext";

test("component behavior", () => {
  const { getByText } = render(() => (
    <I18nProvider>
      <Component ... />
    </I18nProvider>
  ));
  expect(getByText("Sun")).toBeInTheDocument(); // or use locale-specific text
});
```

**Step 2: Run tests**

```bash
cd /d/workspaces-13/simplysm/.worktrees/solid-i18n
pnpm vitest packages/solid --run
```

Expected: All existing tests pass (no logic change, just string translations)

**Step 3: Commit**

```bash
git add packages/solid/src/**/*.spec.ts
git commit -m "test(i18n): wrap component tests with I18nProvider"
```

---

## Task 21: Create i18n-specific tests

**Files:**
- Create: `packages/solid/src/providers/i18n/I18nContext.spec.ts`

**Step 1: Write i18n provider tests**

```typescript
import { render } from "@solidjs/testing-library";
import { useI18n, useI18nOptional, I18nProvider } from "./I18nContext";

describe("I18nProvider", () => {
  it("should translate keys in current locale", () => {
    const { t } = render(() => {
      const i18n = useI18n();
      return i18n.t("calendar.weeks.sun");
    }, { wrapper: I18nProvider });

    expect(t()).toBe("Sun");
  });

  it("should fallback to en when key not found in ko", () => {
    const { t } = render(() => {
      const i18n = useI18n();
      i18n.setLocale("ko");
      return i18n.t("unknown.key");
    }, { wrapper: I18nProvider });

    expect(t()).toBe("unknown.key"); // fallback to key itself
  });

  it("should interpolate template parameters", () => {
    const { t } = render(() => {
      const i18n = useI18n();
      return i18n.t("statePreset.savedMessage", { name: "test" });
    }, { wrapper: I18nProvider });

    expect(t()).toBe("Preset \"test\" has been saved.");
  });

  it("should change locale with setLocale", () => {
    const { t } = render(() => {
      const i18n = useI18n();
      const text = () => i18n.t("calendar.weeks.sun");
      return () => {
        i18n.setLocale("ko");
        return text();
      };
    }, { wrapper: I18nProvider });

    expect(t()).toBe("일");
  });

  it("should configure and merge dictionaries", () => {
    const { t } = render(() => {
      const i18n = useI18n();
      i18n.configure({
        locale: "ja",
        dict: {
          ja: { "calendar.weeks.sun": "日" },
        },
      });
      return i18n.t("calendar.weeks.sun");
    }, { wrapper: I18nProvider });

    expect(t()).toBe("日");
  });

  it("should work without provider (optional hook)", () => {
    const i18n = useI18nOptional(); // outside I18nProvider
    expect(i18n).toBeUndefined();
  });
});
```

**Step 2: Run tests**

```bash
pnpm vitest packages/solid/src/providers/i18n/I18nContext.spec.ts --run
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add packages/solid/src/providers/i18n/I18nContext.spec.ts
git commit -m "test(i18n): add I18nProvider unit tests"
```

---

## Task 22: Run full test suite and verify no regressions

**Files:**
- No files to modify (verification only)

**Step 1: Run all tests**

```bash
cd /d/workspaces-13/simplysm/.worktrees/solid-i18n
pnpm vitest packages/solid --run
```

Expected: All tests pass, no failures

**Step 2: Check TypeScript**

```bash
pnpm tsc -p packages/solid --noEmit
```

Expected: No type errors

**Step 3: Commit (implicit in plan completion)**

If any issues, create small commits to fix them before proceeding.

---

## Task 23: Build and verify bundle

**Files:**
- No files to modify

**Step 1: Build solid package**

```bash
pnpm build -F @simplysm/solid
```

Expected: Build completes without errors

**Step 2: Verify bundle includes i18n**

```bash
ls -la packages/solid/dist/
```

Expected: `index.d.ts` and `.js` files include i18n exports

---

## Summary

After all 23 tasks:
- ✅ I18nProvider + useI18n implemented with LoggerProvider pattern
- ✅ en/ko dictionaries built-in + app override capability
- ✅ 60+ components refactored to use `t()` for all user-facing strings
- ✅ localStorage persistence for locale setting
- ✅ All tests passing, no regressions
- ✅ TypeScript types complete
- ✅ Bundle verified
