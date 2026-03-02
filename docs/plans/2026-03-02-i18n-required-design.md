# i18n 필수화 디자인

## 목적

`useI18nOptional()` 제거 및 i18n을 필수 의존성으로 전환하여, fallback 문자열 중복 관리를 제거한다.

## 현재 상태

- `useI18nOptional()` 반환 타입: `I18nContextValue | undefined`
- 35개 파일에서 `useI18nOptional()` 사용
- 146곳에서 `i18n?.t("key") ?? "fallback"` 패턴
- 104개 고유 fallback 문자열 (en.ts 값과 동일)

## 변경 사항

### 1. `I18nContext.tsx`

- `useI18nOptional()` 함수 제거
- `useI18n()` 유지 (변경 없음)

### 2. 컴포넌트/훅 파일 (35개)

**Import:**
```typescript
// Before
import { useI18nOptional } from "...";
// After
import { useI18n } from "...";
```

**Hook 호출:**
```typescript
// Before
const i18n = useI18nOptional();
// After
const i18n = useI18n();
```

**번역 호출 (146곳):**
```typescript
// Before
i18n?.t("validation.required") ?? "This is a required field"
// After
i18n.t("validation.required")

// Before (파라미터)
i18n?.t("validation.minLength", { min: String(value) }) ?? `Enter at least ${value} characters`
// After
i18n.t("validation.minLength", { min: String(value) })
```

### 3. Locale 파일

변경 없음 (en.ts, ko.ts 유지)

## 대상 파일 목록

- `providers/i18n/I18nContext.tsx`
- `components/data/calendar/Calendar.tsx`
- `components/data/sheet/DataSheet.tsx`
- `components/data/sheet/DataSheetConfigDialog.tsx`
- `components/disclosure/Dialog.tsx`
- `components/features/crud-detail/CrudDetail.tsx`
- `components/features/crud-sheet/CrudSheet.tsx`
- `components/features/data-select-button/DataSelectButton.tsx`
- `components/features/permission-table/PermissionTable.tsx`
- `components/features/shared-data/SharedDataSelect.tsx`
- `components/features/shared-data/SharedDataSelectList.tsx`
- `components/feedback/notification/NotificationBanner.tsx`
- `components/feedback/notification/NotificationBell.tsx`
- `components/feedback/notification/NotificationProvider.tsx`
- `components/form-control/ThemeToggle.tsx`
- `components/form-control/checkbox/Checkbox.tsx`
- `components/form-control/checkbox/Radio.tsx`
- `components/form-control/color-picker/ColorPicker.tsx`
- `components/form-control/combobox/Combobox.tsx`
- `components/form-control/date-range-picker/DateRangePicker.tsx`
- `components/form-control/editor/EditorToolbar.tsx`
- `components/form-control/field/DatePicker.tsx`
- `components/form-control/field/DateTimePicker.tsx`
- `components/form-control/field/NumberInput.tsx`
- `components/form-control/field/Textarea.tsx`
- `components/form-control/field/TextInput.tsx`
- `components/form-control/field/TimePicker.tsx`
- `components/form-control/numpad/Numpad.tsx`
- `components/form-control/select/Select.tsx`
- `components/form-control/state-preset/StatePreset.tsx`
- `components/layout/sidebar/SidebarContainer.tsx`
- `components/layout/sidebar/SidebarMenu.tsx`
- `components/layout/topbar/Topbar.tsx`
- `components/layout/topbar/TopbarMenu.tsx`
- `hooks/createSelectionGroup.tsx`
