# i18n 필수화 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `useI18nOptional()` 제거 및 i18n 필수화로 fallback 문자열 중복 관리를 제거한다.

**Architecture:** `useI18nOptional()` 함수를 제거하고, 35개 파일에서 `useI18n()`으로 전환한다. 146곳의 `i18n?.t("key") ?? "fallback"` 패턴을 `i18n.t("key")`로 단순화한다.

**Tech Stack:** SolidJS, TypeScript

---

### Task 1: Remove `useI18nOptional` from I18nContext.tsx

**Files:**
- Modify: `packages/solid/src/providers/i18n/I18nContext.tsx:44-46`

**Step 1: Remove `useI18nOptional` function**

Delete lines 42-46 (the `useI18nOptional` function and its JSDoc):

```typescript
// DELETE these lines:
/**
 * Get i18n context value (optional, returns undefined if not in provider)
 */
export function useI18nOptional(): I18nContextValue | undefined {
  return useContext(I18nContext);
}
```

**Step 2: Verify typecheck fails**

Run: `pnpm typecheck packages/solid`
Expected: FAIL — 35 files importing `useI18nOptional` will error.

### Task 2: Convert form-control field components (6 files)

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx`
- Modify: `packages/solid/src/components/form-control/field/Textarea.tsx`
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx`
- Modify: `packages/solid/src/components/form-control/field/DatePicker.tsx`
- Modify: `packages/solid/src/components/form-control/field/DateTimePicker.tsx`
- Modify: `packages/solid/src/components/form-control/field/TimePicker.tsx`

**Step 1: In each file, apply these mechanical replacements:**

1. Import: `useI18nOptional` → `useI18n`
2. Hook: `const i18n = useI18nOptional()` → `const i18n = useI18n()`
3. All calls: `i18n?.t("key") ?? "fallback"` → `i18n.t("key")`
4. All calls with params: `i18n?.t("key", { param: val }) ?? \`fallback\`` → `i18n.t("key", { param: val })`

### Task 3: Convert form-control components (7 files)

**Files:**
- Modify: `packages/solid/src/components/form-control/checkbox/Checkbox.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/Radio.tsx`
- Modify: `packages/solid/src/components/form-control/color-picker/ColorPicker.tsx`
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx`
- Modify: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx`
- Modify: `packages/solid/src/components/form-control/numpad/Numpad.tsx`
- Modify: `packages/solid/src/components/form-control/select/Select.tsx`

**Step 1: Same mechanical replacements as Task 2.**

### Task 4: Convert form-control special components (3 files)

**Files:**
- Modify: `packages/solid/src/components/form-control/ThemeToggle.tsx`
- Modify: `packages/solid/src/components/form-control/state-preset/StatePreset.tsx`
- Modify: `packages/solid/src/components/form-control/editor/EditorToolbar.tsx`

**Step 1: ThemeToggle — special handling**

In ThemeToggle.tsx, in addition to the standard replacements:
- Remove the `defaultModeLabels` constant (lines 22-26) — no longer needed as fallback
- Change: `i18n?.t(modeLabelKeys[mode()]) ?? defaultModeLabels[mode()]` → `i18n.t(modeLabelKeys[mode()])`

**Step 2: StatePreset and EditorToolbar — standard replacements as Task 2.**

### Task 5: Convert feature components (6 files)

**Files:**
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx`
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx`
- Modify: `packages/solid/src/components/features/data-select-button/DataSelectButton.tsx`
- Modify: `packages/solid/src/components/features/permission-table/PermissionTable.tsx`
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelect.tsx`
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx`

**Step 1: Same mechanical replacements as Task 2.**

### Task 6: Convert data, disclosure, feedback, layout components (10 files)

**Files:**
- Modify: `packages/solid/src/components/data/calendar/Calendar.tsx`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`
- Modify: `packages/solid/src/components/data/sheet/DataSheetConfigDialog.tsx`
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx`
- Modify: `packages/solid/src/components/feedback/notification/NotificationBanner.tsx`
- Modify: `packages/solid/src/components/feedback/notification/NotificationBell.tsx`
- Modify: `packages/solid/src/components/feedback/notification/NotificationProvider.tsx`
- Modify: `packages/solid/src/components/layout/sidebar/SidebarContainer.tsx`
- Modify: `packages/solid/src/components/layout/sidebar/SidebarMenu.tsx`
- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx`
- Modify: `packages/solid/src/components/layout/topbar/TopbarMenu.tsx`

**Step 1: Same mechanical replacements as Task 2.**

### Task 7: Convert createSelectionGroup hook

**Files:**
- Modify: `packages/solid/src/hooks/createSelectionGroup.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx`
- Modify: `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx`

**Step 1: createSelectionGroup.tsx — special handling**

1. Import: `useI18nOptional` → `useI18n`
2. Hook: `const i18n = useI18nOptional()` → `const i18n = useI18n()`
3. Special pattern change:
   ```typescript
   // Before
   (config.emptyErrorMsgKey != null ? i18n?.t(config.emptyErrorMsgKey) : undefined) ?? config.emptyErrorMsg;
   // After
   config.emptyErrorMsgKey != null ? i18n.t(config.emptyErrorMsgKey) : config.emptyErrorMsg;
   ```

4. Remove `emptyErrorMsg` from config interfaces and callers since all callers provide `emptyErrorMsgKey`:
   - In `MultiGroupConfig` and `SingleGroupConfig`: remove `emptyErrorMsg`, make `emptyErrorMsgKey` required (remove `?`)
   - In `CheckboxGroup.tsx` and `RadioGroup.tsx`: remove `emptyErrorMsg` prop from the config
   - Simplify: `config.emptyErrorMsgKey != null ? i18n.t(config.emptyErrorMsgKey) : config.emptyErrorMsg` → `i18n.t(config.emptyErrorMsgKey)`

### Task 8: Typecheck verification

**Step 1: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS — no errors.
