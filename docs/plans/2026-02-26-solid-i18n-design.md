# Solid Package i18n Design

## Summary

`@simplysm/solid` 패키지에 `@solid-primitives/i18n`을 활용한 다국어 지원 추가.

## Decisions

| Item | Decision |
|------|----------|
| Library | `@solid-primitives/i18n@2.2.1` (peer: `solid-js ^1.6.12`, 현재 `^1.9.11` OK) |
| Built-in locales | `en`, `ko` |
| Scope | UI 라벨 + 비즈니스 메시지 모두 포함 |
| Default locale | `navigator.language` 기반 자동 감지, 미지원 언어면 `en` fallback |
| Persist | `useSyncConfig`로 localStorage에 저장 |
| Key naming | 컴포넌트 기반 — `calendar.weeks.sun`, `dataSheet.collapseAll` |
| Dict format | nested object로 작성, 라이브러리 내부에서 flatten |
| Missing key | en fallback |
| Provider pattern | LoggerProvider와 동일 — props 없이 배치, `configure()`로 나중에 설정 |
| Provider 위치 | SystemProvider 체인에서 ConfigProvider 바로 안쪽 |
| configure 다중 호출 | 누적 merge (dict merge, locale은 마지막 값) |
| Interpolation | template 방식 `{{name}}` |
| Override/확장 | 앱에서 `configure({ dict: { ko: {...}, ja: {...} } })`로 내장 override 및 새 언어 추가 |

## Architecture

### File Structure

```
packages/solid/src/
├── providers/
│   └── i18n/
│       ├── I18nContext.tsx        # Context, Provider, useI18n, useI18nOptional
│       ├── I18nContext.types.ts   # 타입 정의
│       ├── locales/
│       │   ├── en.ts              # 영어 내장 dictionary (nested)
│       │   └── ko.ts              # 한국어 내장 dictionary (nested)
│       └── i18nUtils.ts           # template interpolation 유틸
```

### SystemProvider Chain

```
ConfigProvider
  └─ I18nProvider          ← NEW
    └─ SyncStorageProvider
      └─ LoggerProvider
        └─ ...
```

## API

### useI18n()

```ts
interface I18nContextValue {
  t: (key: string, params?: Record<string, string>) => string;
  locale: Accessor<string>;
  setLocale: (locale: string) => void;
  configure: (options: I18nConfigureOptions) => void;
}

interface I18nConfigureOptions {
  locale?: string;
  dict?: Record<string, Record<string, unknown>>;
}
```

### Flow

1. **I18nProvider mount** — `navigator.language` → locale 추출 (e.g. `"ko-KR"` → `"ko"`), localStorage에 저장된 값 있으면 사용, 내장 dict flatten
2. **configure (optional)** — dict: nested → flatten → 기존에 merge, locale: 전환 + persist
3. **t(key, params?)** — 현재 locale dict 조회 → 없으면 en fallback → params 있으면 `{{key}}` 치환
4. **setLocale(locale)** — locale signal 변경 → 모든 t() 자동 re-render → persist

### useI18nOptional()

I18nProvider 없이 컴포넌트가 사용될 경우를 위한 optional hook. Provider 없으면 en 내장 dict로 fallback.

## Built-in Dictionary Keys

```ts
{
  calendar: { weeks: { sun, mon, tue, wed, thu, fri, sat } },
  dataSheet: { collapseAll, expandAll, sheetSettings },
  dataSheetConfigDialog: { column, fixed, hidden, width, autoPlaceholder, resetConfirm, reset, cancel, confirm },
  dateRangePicker: { day, month, range },
  select: { searchPlaceholder },
  topbar: { toggleSidebar },
  sidebar: { closeSidebar },
  editorToolbar: { heading1, heading2, bold, italic, underline, strikethrough, textColor, bgColor, bulletList, numberedList, increaseIndent, decreaseIndent, blockquote, codeBlock, alignLeft, alignCenter, alignRight, justify, insertTable, insertImage, clearFormatting },
  statePreset: { addPreset, overwrite, deletePreset, namePlaceholder, duplicateName, duplicateMessage, saved, savedMessage, overwritten, overwrittenMessage, undo, deleted, deletedMessage },
  permissionTable: { permissionItem },
  crudSheet: { lastModified, modifiedBy, notice, noChanges, saveCompleted, saveSuccess, deleteCompleted, deleteSuccess, restoreCompleted, restoreSuccess, excelCompleted, excelUploadSuccess, lookupFailed, saveFailed, deleteFailed, restoreFailed, excelDownloadFailed, excelUploadFailed, discardChanges },
  crudDetail: { discardChanges },
  sharedDataSelect: { search, edit },
  dataSelectButton: { deselect, search },
  notification: { close },
  topbarMenu: { menu },
}
```

## Component Integration Pattern

```tsx
// Before
const WEEKS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// After
const { t } = useI18n();
const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
// use t(`calendar.weeks.${keys[i]}`)
```

```tsx
// Template interpolation
t("statePreset.savedMessage", { name: presetName })
// → "Preset \"test\" has been saved."
```

## Testing

기존 테스트에서 `I18nProvider`로 감싸줌:

```tsx
render(() => (
  <I18nProvider>
    <Component ... />
  </I18nProvider>
));
```
