# Korean to English Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert all Korean text (comments, error messages, test descriptions, UI text) to English across the entire codebase, excluding `docs/` and `.back/`.

**Architecture:** Package-by-package bottom-up conversion following dependency order. Each package is fully converted, verified with `/sd-check`, then committed. No code logic changes — only string/comment translations.

**Tech Stack:** TypeScript, SolidJS, CSS, Markdown, JSON

---

## Conversion Rules (apply to ALL tasks)

1. **Comments/JSDoc**: Translate meaningfully. Remove unnecessary comments where code is self-explanatory. Keep only non-obvious logic explanations.
2. **Error/log messages**: Natural English. e.g., `"테이블 정의를 찾을 수 없습니다"` → `"Table definition not found"`
3. **Test descriptions**: Natural English. e.g., `it("날짜를 파싱한다")` → `it("parses a date")`
4. **UI text**: English equivalents. e.g., `"이름"` → `"Name"`
5. **package.json**: Translate `description` field to English
6. **Markdown**: Translate full content to English
7. **Exception**: `packages/solid/src/components/features/address/AddressSearch.tsx` — keep Korean

## How to find Korean text in each file

Use Grep with pattern `[가-힣]` on each file to find all Korean lines, then read the file and translate.

---

### Task 1: core-common

**Files:**
- Modify: `packages/core-common/src/utils/str.ts`
- Modify: `packages/core-common/src/utils/obj.ts`
- Modify: `packages/core-common/src/utils/num.ts`
- Modify: `packages/core-common/src/utils/transferable.ts`
- Modify: `packages/core-common/src/utils/json.ts`
- Modify: `packages/core-common/tests/types/date-only.spec.ts`
- Modify: `packages/core-common/tests/types/date-time.spec.ts`
- Modify: `packages/core-common/tests/zip/sd-zip.spec.ts`
- Modify: `packages/core-common/tests/utils/string.spec.ts`
- Modify: `packages/core-common/tests/utils/date-format.spec.ts`
- Modify: `packages/core-common/docs/types.md`
- Modify: `packages/core-common/docs/utils.md`
- Modify: `packages/core-common/package.json` (description field)

**Step 1:** Read each source file, find Korean with `[가-힣]`, translate comments/error messages to English. Remove self-explanatory comments.

**Step 2:** Read each test file, translate `describe`/`it` descriptions and comments to English.

**Step 3:** Translate markdown docs to English.

**Step 4:** Update `package.json` description to English.

**Step 5:** Verify.

Run: `/sd-check packages/core-common`

**Step 6:** Commit.

```
i18n(core-common): convert Korean to English
```

---

### Task 2: core-node

**Files:**
- Modify: `packages/core-node/src/utils/path.ts`
- Modify: `packages/core-node/src/utils/fs.ts`
- Modify: `packages/core-node/src/worker/create-worker.ts`
- Modify: `packages/core-node/src/worker/types.ts`
- Modify: `packages/core-node/src/worker/worker.ts`
- Modify: `packages/core-node/src/features/fs-watcher.ts`
- Modify: `packages/core-node/tests/utils/fs.spec.ts`
- Modify: `packages/core-node/tests/utils/fs-watcher.spec.ts`
- Modify: `packages/core-node/tests/worker/fixtures/test-worker.ts`
- Modify: `packages/core-node/lib/worker-dev-proxy.js`
- Modify: `packages/core-node/package.json` (description field)

**Step 1:** Read each source file, find Korean with `[가-힣]`, translate comments/error messages to English.

**Step 2:** Read each test file, translate descriptions and comments to English.

**Step 3:** Translate `worker-dev-proxy.js` comments to English.

**Step 4:** Update `package.json` description to English.

**Step 5:** Verify.

Run: `/sd-check packages/core-node`

**Step 6:** Commit.

```
i18n(core-node): convert Korean to English
```

---

### Task 3: core-browser

**Files:**
- Modify: `packages/core-browser/src/extensions/element-ext.ts`
- Modify: `packages/core-browser/src/extensions/html-element-ext.ts`
- Modify: `packages/core-browser/src/utils/fetch.ts`
- Modify: `packages/core-browser/src/utils/file-dialog.ts`
- Modify: `packages/core-browser/src/utils/download.ts`
- Modify: `packages/core-browser/src/index.ts`
- Modify: `packages/core-browser/package.json` (description field)

**Step 1:** Read each source file, find Korean with `[가-힣]`, translate comments/error messages to English.

**Step 2:** Update `package.json` description to English.

**Step 3:** Verify.

Run: `/sd-check packages/core-browser`

**Step 4:** Commit.

```
i18n(core-browser): convert Korean to English
```

---

### Task 4: lint

**Files:**
- Modify: `packages/lint/tests/recommended.spec.ts`
- Modify: `packages/lint/tests/ts-no-throw-not-implemented-error.spec.ts`
- Modify: `packages/lint/tests/vitest.setup.ts`
- Modify: `packages/lint/tests/no-hard-private.spec.ts`
- Modify: `packages/lint/tests/no-subpath-imports-from-simplysm.spec.ts`
- Modify: `packages/lint/README.md`
- Modify: `packages/lint/package.json` (description field)

**Step 1:** Read each test file, translate `describe`/`it` descriptions and comments to English.

**Step 2:** Translate `README.md` to English.

**Step 3:** Update `package.json` description to English.

**Step 4:** Verify.

Run: `/sd-check packages/lint`

**Step 5:** Commit.

```
i18n(lint): convert Korean to English
```

---

### Task 5: excel

**Files:**
- Modify: `packages/excel/src/xml/excel-xml-worksheet.ts`
- Modify: `packages/excel/src/xml/excel-xml-style.ts`
- Modify: `packages/excel/src/excel-wrapper.ts`
- Modify: `packages/excel/src/excel-cell.ts`
- Modify: `packages/excel/tests/excel-wrapper.spec.ts`
- Modify: `packages/excel/tests/utils/excel-utils.spec.ts`
- Modify: `packages/excel/tests/excel-col.spec.ts`
- Modify: `packages/excel/tests/excel-cell.spec.ts`

**Step 1:** Read each source file, find Korean with `[가-힣]`, translate comments/error messages to English.

**Step 2:** Read each test file, translate descriptions and comments to English.

**Step 3:** Verify.

Run: `/sd-check packages/excel`

**Step 4:** Commit.

```
i18n(excel): convert Korean to English
```

---

### Task 6: orm-common

This is the largest package (~55 files). Work through systematically: src → tests/setup → tests/spec → tests/expected → docs.

**Source files:**
- Modify: `packages/orm-common/src/query-builder/postgresql/postgresql-query-builder.ts`
- Modify: `packages/orm-common/src/query-builder/postgresql/postgresql-expr-renderer.ts`
- Modify: `packages/orm-common/src/query-builder/mysql/mysql-query-builder.ts`
- Modify: `packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts`
- Modify: `packages/orm-common/src/query-builder/mssql/mssql-query-builder.ts`
- Modify: `packages/orm-common/src/query-builder/mssql/mssql-expr-renderer.ts`
- Modify: `packages/orm-common/src/query-builder/base/query-builder-base.ts`
- Modify: `packages/orm-common/src/query-builder/base/expr-renderer-base.ts`
- Modify: `packages/orm-common/src/query-builder/query-builder.ts`
- Modify: `packages/orm-common/src/types/column.ts`
- Modify: `packages/orm-common/src/types/db.ts`
- Modify: `packages/orm-common/src/types/query-def.ts`
- Modify: `packages/orm-common/src/types/expr.ts`
- Modify: `packages/orm-common/src/expr/expr.ts`
- Modify: `packages/orm-common/src/utils/result-parser.ts`
- Modify: `packages/orm-common/src/exec/queryable.ts`
- Modify: `packages/orm-common/src/ddl/table-ddl.ts`
- Modify: `packages/orm-common/src/ddl/initialize.ts`
- Modify: `packages/orm-common/src/schema/table-builder.ts`
- Modify: `packages/orm-common/src/schema/view-builder.ts`
- Modify: `packages/orm-common/src/schema/factory/column-builder.ts`
- Modify: `packages/orm-common/src/schema/factory/relation-builder.ts`
- Modify: `packages/orm-common/src/schema/factory/index-builder.ts`
- Modify: `packages/orm-common/src/schema/procedure-builder.ts`

**Test setup files:**
- Modify: `packages/orm-common/tests/setup/MockExecutor.ts`
- Modify: `packages/orm-common/tests/setup/test-utils.ts`
- Modify: `packages/orm-common/tests/setup/models/Employee.ts`
- Modify: `packages/orm-common/tests/setup/views/ActiveUsers.ts`
- Modify: `packages/orm-common/tests/setup/views/UserSummary.ts`
- Modify: `packages/orm-common/tests/setup/procedure/GetAllUsers.ts`
- Modify: `packages/orm-common/tests/setup/procedure/GetUserById.ts`

**Test spec files:**
- Modify: `packages/orm-common/tests/select/join.spec.ts`
- Modify: `packages/orm-common/tests/select/window.spec.ts`
- Modify: `packages/orm-common/tests/select/view.spec.ts`
- Modify: `packages/orm-common/tests/select/subquery.spec.ts`
- Modify: `packages/orm-common/tests/select/recursive-cte.spec.ts`
- Modify: `packages/orm-common/tests/select/order.spec.ts`
- Modify: `packages/orm-common/tests/select/group.spec.ts`
- Modify: `packages/orm-common/tests/select/filter.spec.ts`
- Modify: `packages/orm-common/tests/select/basic.spec.ts`
- Modify: `packages/orm-common/tests/utils/result-parser-perf.spec.ts`
- Modify: `packages/orm-common/tests/utils/result-parser.spec.ts`
- Modify: `packages/orm-common/tests/expr/utility.spec.ts`
- Modify: `packages/orm-common/tests/expr/string.spec.ts`
- Modify: `packages/orm-common/tests/expr/date.spec.ts`
- Modify: `packages/orm-common/tests/expr/conditional.spec.ts`
- Modify: `packages/orm-common/tests/expr/comparison.spec.ts`
- Modify: `packages/orm-common/tests/exec/search-parser.spec.ts`
- Modify: `packages/orm-common/tests/examples/sampling.spec.ts`
- Modify: `packages/orm-common/tests/examples/pivot.spec.ts`
- Modify: `packages/orm-common/tests/errors/queryable-errors.spec.ts`
- Modify: `packages/orm-common/tests/dml/upsert.spec.ts`
- Modify: `packages/orm-common/tests/dml/update.spec.ts`
- Modify: `packages/orm-common/tests/dml/insert.spec.ts`
- Modify: `packages/orm-common/tests/dml/delete.spec.ts`
- Modify: `packages/orm-common/tests/ddl/procedure-builder.spec.ts`
- Modify: `packages/orm-common/tests/ddl/index-builder.spec.ts`
- Modify: `packages/orm-common/tests/ddl/column-builder.spec.ts`
- Modify: `packages/orm-common/tests/ddl/basic.spec.ts`
- Modify: `packages/orm-common/tests/db-context/create-db-context.spec.ts`
- Modify: `packages/orm-common/tests/escape.spec.ts`

**Test expected files:**
- Modify: `packages/orm-common/tests/select/join.expected.ts`
- Modify: `packages/orm-common/tests/select/subquery.expected.ts`
- Modify: `packages/orm-common/tests/select/view.expected.ts`
- Modify: `packages/orm-common/tests/select/recursive-cte.expected.ts`
- Modify: `packages/orm-common/tests/select/order.expected.ts`
- Modify: `packages/orm-common/tests/select/basic.expected.ts`
- Modify: `packages/orm-common/tests/select/filter.expected.ts`
- Modify: `packages/orm-common/tests/select/group.expected.ts`
- Modify: `packages/orm-common/tests/expr/utility.expected.ts`
- Modify: `packages/orm-common/tests/expr/comparison.expected.ts`
- Modify: `packages/orm-common/tests/expr/conditional.expected.ts`
- Modify: `packages/orm-common/tests/examples/sampling.expected.ts`
- Modify: `packages/orm-common/tests/examples/unpivot.expected.ts`
- Modify: `packages/orm-common/tests/examples/pivot.expected.ts`
- Modify: `packages/orm-common/tests/dml/delete.expected.ts`
- Modify: `packages/orm-common/tests/dml/insert.expected.ts`
- Modify: `packages/orm-common/tests/dml/upsert.expected.ts`
- Modify: `packages/orm-common/tests/dml/update.expected.ts`
- Modify: `packages/orm-common/tests/ddl/column-builder.expected.ts`
- Modify: `packages/orm-common/tests/ddl/procedure-builder.expected.ts`
- Modify: `packages/orm-common/tests/ddl/basic.expected.ts`

**Other:**
- Modify: `packages/orm-common/docs/queries.md`
- Modify: `packages/orm-common/package.json` (description field)

**Step 1:** Translate all source files — comments, error messages, JSDoc.

**Step 2:** Translate test setup files — comments, model/view/procedure descriptions.

**Step 3:** Translate test spec files — `describe`/`it` descriptions and comments.

**Step 4:** Translate test expected files — comments.

**Step 5:** Translate `docs/queries.md` and update `package.json` description.

**Step 6:** Verify.

Run: `/sd-check packages/orm-common`

**Step 7:** Commit.

```
i18n(orm-common): convert Korean to English
```

---

### Task 7: service-common

**Files:**
- Modify: `packages/service-common/tests/protocol/service-protocol.spec.ts`
- Modify: `packages/service-common/tests/define-event.spec.ts`
- Modify: `packages/service-common/package.json` (description field)

**Step 1:** Translate test descriptions and comments to English.

**Step 2:** Update `package.json` description.

**Step 3:** Verify.

Run: `/sd-check packages/service-common`

**Step 4:** Commit.

```
i18n(service-common): convert Korean to English
```

---

### Task 8: service-server

**Files:**
- Modify: `packages/service-server/tests/service-executor.spec.ts`
- Modify: `packages/service-server/tests/define-service.spec.ts`
- Modify: `packages/service-server/package.json` (description field)

**Step 1:** Translate test descriptions and comments to English.

**Step 2:** Update `package.json` description.

**Step 3:** Verify.

Run: `/sd-check packages/service-server`

**Step 4:** Commit.

```
i18n(service-server): convert Korean to English
```

---

### Task 9: service-client + orm-node

Small packages with only `package.json` changes.

**Files:**
- Modify: `packages/service-client/package.json` (description field)
- Modify: `packages/orm-node/package.json` (description field)

**Step 1:** Update both `package.json` description fields to English.

**Step 2:** Commit.

```
i18n(service-client,orm-node): convert Korean to English
```

---

### Task 10: storage

**Files:**
- Modify: `packages/storage/tests/storage-factory.spec.ts`
- Modify: `packages/storage/tests/ftp-storage-client.spec.ts`
- Modify: `packages/storage/tests/sftp-storage-client.spec.ts`

**Step 1:** Translate test descriptions and comments to English.

**Step 2:** Verify.

Run: `/sd-check packages/storage`

**Step 3:** Commit.

```
i18n(storage): convert Korean to English
```

---

### Task 11: capacitor-plugins

**Files:**
- Modify: `packages/capacitor-plugin-broadcast/src/web/BroadcastWeb.ts`
- Modify: `packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts`
- Modify: `packages/capacitor-plugin-auto-update/src/AutoUpdate.ts`

**Step 1:** Translate comments/error messages to English.

**Step 2:** Commit.

```
i18n(capacitor-plugins): convert Korean to English
```

---

### Task 12: sd-cli

**Files:**
- Modify: `packages/sd-cli/src/workers/server-runtime.worker.ts`
- Modify: `packages/sd-cli/src/workers/server.worker.ts`
- Modify: `packages/sd-cli/src/workers/dts.worker.ts`
- Modify: `packages/sd-cli/src/workers/library.worker.ts`
- Modify: `packages/sd-cli/tests/sd-cli.spec.ts`
- Modify: `packages/sd-cli/tests/run-typecheck.spec.ts`
- Modify: `packages/sd-cli/tests/run-lint.spec.ts`
- Modify: `packages/sd-cli/tests/parse-root-tsconfig.spec.ts`
- Modify: `packages/sd-cli/tests/utils/rebuild-manager.spec.ts`
- Modify: `packages/sd-cli/tests/tailwind-config-deps.spec.ts`
- Modify: `packages/sd-cli/tests/replace-deps.spec.ts`
- Modify: `packages/sd-cli/tests/infra/WorkerManager.spec.ts`
- Modify: `packages/sd-cli/tests/infra/SignalHandler.spec.ts`
- Modify: `packages/sd-cli/tests/get-types-from-package-json.spec.ts`
- Modify: `packages/sd-cli/tests/load-ignore-patterns.spec.ts`
- Modify: `packages/sd-cli/tests/get-compiler-options-for-package.spec.ts`
- Modify: `packages/sd-cli/package.json` (description field)

**Step 1:** Translate worker source files — comments, error messages.

**Step 2:** Translate all test files — descriptions and comments.

**Step 3:** Update `package.json` description.

**Step 4:** Verify.

Run: `/sd-check packages/sd-cli`

**Step 5:** Commit.

```
i18n(sd-cli): convert Korean to English
```

---

### Task 13: solid

Large package. Work through: src → tests (by directory) → css → md → config.

**EXCEPTION:** Skip `packages/solid/src/components/features/address/AddressSearch.tsx` — keep Korean.

**Source files:**
- Modify: `packages/solid/src/components/layout/sidebar/SidebarContainer.tsx`
- Modify: `packages/solid/src/components/features/permission-table/PermissionTable.tsx`
- Modify: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`
- Modify: `packages/solid/src/components/data/calendar/Calendar.tsx`

**Test files (74 files):**
- Modify: `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx`
- Modify: `packages/solid/tests/providers/SyncStorageContext.spec.tsx`
- Modify: `packages/solid/tests/providers/PwaUpdateProvider.spec.tsx`
- Modify: `packages/solid/tests/providers/ServiceClientContext.spec.tsx`
- Modify: `packages/solid/tests/providers/ConfigContext.spec.tsx`
- Modify: `packages/solid/tests/providers/ErrorLoggerProvider.spec.tsx`
- Modify: `packages/solid/tests/providers/LoggerContext.spec.tsx`
- Modify: `packages/solid/tests/providers/ClipboardProvider.spec.tsx`
- Modify: `packages/solid/tests/hooks/useSyncConfig.spec.tsx`
- Modify: `packages/solid/tests/hooks/usePrint.spec.tsx`
- Modify: `packages/solid/tests/hooks/useRouterLink.spec.tsx`
- Modify: `packages/solid/tests/hooks/useLocalStorage.spec.tsx`
- Modify: `packages/solid/tests/hooks/useLogger.spec.tsx`
- Modify: `packages/solid/tests/hooks/createIMEHandler.spec.ts`
- Modify: `packages/solid/tests/hooks/createMountTransition.spec.ts`
- Modify: `packages/solid/tests/hooks/createControllableSignal.spec.ts`
- Modify: `packages/solid/tests/helpers/createAppStructure.spec.tsx`
- Modify: `packages/solid/tests/helpers/mergeStyles.spec.ts`
- Modify: `packages/solid/tests/directives/ripple.spec.tsx`
- Modify: `packages/solid/tests/components/layout/topbar/createTopbarActions.spec.tsx`
- Modify: `packages/solid/tests/components/layout/topbar/TopbarActions.spec.tsx`
- Modify: `packages/solid/tests/components/layout/topbar/TopbarContainer.spec.tsx`
- Modify: `packages/solid/tests/components/layout/sidebar/SidebarMenu.spec.tsx`
- Modify: `packages/solid/tests/components/layout/sidebar/SidebarUser.spec.tsx`
- Modify: `packages/solid/tests/components/layout/sidebar/Sidebar.spec.tsx`
- Modify: `packages/solid/tests/components/layout/sidebar/SidebarContainer.spec.tsx`
- Modify: `packages/solid/tests/components/layout/FormTable.spec.tsx`
- Modify: `packages/solid/tests/components/layout/FormGroup.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/select/SelectItem.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/select/Select.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/TimePicker.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/Textarea.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/TextInput.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/DatePicker.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/field/DateTimePicker.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/numpad/Numpad.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/combobox/ComboboxItem.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/color-picker/ColorPicker.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/checkbox/RadioGroup.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/checkbox/CheckboxGroup.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/checkbox/Radio.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/checkbox/Checkbox.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/Button.spec.tsx`
- Modify: `packages/solid/tests/components/form-control/Invalid.spec.tsx`
- Modify: `packages/solid/tests/components/feedback/print/Print.spec.tsx`
- Modify: `packages/solid/tests/components/feedback/notification/NotificationBell.spec.tsx`
- Modify: `packages/solid/tests/components/feedback/notification/NotificationContext.spec.tsx`
- Modify: `packages/solid/tests/components/feedback/notification/LiveRegion.spec.tsx`
- Modify: `packages/solid/tests/components/feedback/notification/NotificationBanner.spec.tsx`
- Modify: `packages/solid/tests/components/feedback/busy/BusyContainer.spec.tsx`
- Modify: `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx`
- Modify: `packages/solid/tests/components/features/permission-table/PermissionTable.spec.tsx`
- Modify: `packages/solid/tests/components/features/crud-sheet/CrudSheet.spec.tsx`
- Modify: `packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx`
- Modify: `packages/solid/tests/components/features/crud-detail/CrudDetail.spec.tsx`
- Modify: `packages/solid/tests/components/features/address/AddressSearch.spec.tsx`
- Modify: `packages/solid/tests/components/display/Link.spec.tsx`
- Modify: `packages/solid/tests/components/display/Tag.spec.tsx`
- Modify: `packages/solid/tests/components/display/Barcode.spec.tsx`
- Modify: `packages/solid/tests/components/display/Card.spec.tsx`
- Modify: `packages/solid/tests/components/display/Alert.spec.tsx`
- Modify: `packages/solid/tests/components/disclosure/Dropdown.spec.tsx`
- Modify: `packages/solid/tests/components/disclosure/Tabs.spec.tsx`
- Modify: `packages/solid/tests/components/disclosure/Dialog.spec.tsx`
- Modify: `packages/solid/tests/components/disclosure/DialogProvider.spec.tsx`
- Modify: `packages/solid/tests/components/disclosure/Collapse.spec.tsx`
- Modify: `packages/solid/tests/components/data/sheet/DataSheet.spec.tsx`
- Modify: `packages/solid/tests/components/data/kanban/Kanban.selection.spec.tsx`
- Modify: `packages/solid/tests/components/data/Table.spec.tsx`
- Modify: `packages/solid/tests/components/data/List.spec.tsx`
- Modify: `packages/solid/tests/components/data/Pagination.spec.tsx`

**CSS/config/md:**
- Modify: `packages/solid/tailwind.css`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.css`
- Modify: `packages/solid/src/components/form-control/editor/editor.css`
- Modify: `packages/solid/tailwind.config.ts`
- Modify: `packages/solid/component-deps.md`
- Modify: `packages/solid/docs/form-controls.md`
- Modify: `packages/solid/package.json` (description field)

**Step 1:** Translate source component files (5 files, skip AddressSearch.tsx).

**Step 2:** Translate test files — providers, hooks, helpers, directives.

**Step 3:** Translate test files — components (layout, form-control, feedback, features, display, disclosure, data).

**Step 4:** Translate CSS comments, tailwind config comments, markdown docs.

**Step 5:** Update `package.json` description.

**Step 6:** Verify.

Run: `/sd-check packages/solid`

**Step 7:** Commit.

```
i18n(solid): convert Korean to English
```

---

### Task 14: solid-demo + solid-demo-server

**Files:**
- Modify: `packages/solid-demo/src/pages/form-control/SelectPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/FieldPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/ComboboxPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/ColorPickerPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/CheckBoxRadioGroupPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/DateRangePickerPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/StatePresetPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/RichTextEditorPage.tsx`
- Modify: `packages/solid-demo/src/pages/form-control/ThemeTogglePage.tsx`
- Modify: `packages/solid-demo/src/pages/data/TablePage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/PaginationPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/PermissionTablePage.tsx`
- Modify: `packages/solid-demo/src/pages/data/CalendarPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/KanbanPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/CrudSheetPage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/FormTablePage.tsx`
- Modify: `packages/solid-demo/src/pages/layout/FormGroupPage.tsx`
- Modify: `packages/solid-demo/src/pages/feedback/ProgressPage.tsx`
- Modify: `packages/solid-demo/src/pages/feedback/BusyPage.tsx`
- Modify: `packages/solid-demo/src/pages/feedback/PrintPage.tsx`
- Modify: `packages/solid-demo/src/pages/disclosure/DialogPage.tsx`
- Modify: `packages/solid-demo/src/pages/service/SharedDataPage.tsx`
- Modify: `packages/solid-demo/src/pages/service/ServiceClientPage.tsx`
- Modify: `packages/solid-demo/tailwind.config.ts`
- Modify: `packages/solid-demo/package.json` (description field)
- Modify: `packages/solid-demo-server/src/services/shared-data-demo-service.ts`

**Step 1:** Translate all demo page UI text (labels, placeholders, sample data) to English.

**Step 2:** Translate `solid-demo-server` service file.

**Step 3:** Update `tailwind.config.ts` comments and `package.json` descriptions.

**Step 4:** Verify.

Run: `/sd-check packages/solid-demo packages/solid-demo-server`

**Step 5:** Commit.

```
i18n(solid-demo): convert Korean to English
```

---

### Task 15: tests/orm + tests/service

**Files:**
- Modify: `tests/orm/src/db-conn/mssql-db-conn.spec.ts`
- Modify: `tests/orm/src/db-conn/postgresql-db-conn.spec.ts`
- Modify: `tests/orm/src/db-conn/mysql-db-conn.spec.ts`
- Modify: `tests/orm/src/db-context/postgresql-db-context.spec.ts`
- Modify: `tests/orm/src/db-context/mssql-db-context.spec.ts`
- Modify: `tests/orm/src/db-context/mysql-db-context.spec.ts`
- Modify: `tests/orm/src/escape/postgresql-escape.spec.ts`
- Modify: `tests/orm/src/escape/mysql-escape.spec.ts`
- Modify: `tests/orm/src/escape/mssql-escape.spec.ts`
- Modify: `tests/orm/src/test-fixtures.ts`
- Modify: `tests/orm/src/test-configs.ts`
- Modify: `tests/orm/vitest.setup.ts`
- Modify: `tests/orm/package.json` (description field)
- Modify: `tests/service/src/service-client.spec.ts`
- Modify: `tests/service/vitest.setup.ts`
- Modify: `tests/service/package.json` (description field)

**Step 1:** Translate all ORM integration test files — descriptions, comments, setup.

**Step 2:** Translate service integration test files.

**Step 3:** Update `package.json` descriptions.

**Step 4:** Commit.

```
i18n(tests): convert Korean to English
```

---

### Task 16: .claude

**Files:**
- Modify: `.claude/rules/sd-claude-rules.md`
- Modify: `.claude/rules/sd-refs-linker.md`
- Modify: `.claude/refs/sd-angular.md`
- Modify: `.claude/refs/sd-orm-v12.md`
- Modify: `.claude/skills/sd-brainstorm/SKILL.md`
- Modify: `.claude/skills/sd-email-analyze/SKILL.md`
- Modify: `.claude/skills/sd-document/SKILL.md`
- Modify: `.claude/sd-statusline.js`

**Step 1:** Translate all rule/ref markdown files to English. Preserve technical terms and code examples.

**Step 2:** Translate skill SKILL.md files to English.

**Step 3:** Translate `sd-statusline.js` comments to English.

**Step 4:** Commit.

```
i18n(.claude): convert Korean to English
```

---

### Task 17: root files

**Files:**
- Modify: `package.json` (description field)
- Modify: `vitest.config.ts`
- Modify: `eslint.config.ts`

**Step 1:** Translate comments in config files to English.

**Step 2:** Update root `package.json` description.

**Step 3:** Commit.

```
i18n(root): convert Korean to English
```

---

## Final Verification

After all tasks are complete, run a final sweep:

```bash
grep -rP '[가-힣]' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.css' --include='*.md' --include='*.json' . | grep -v '/docs/' | grep -v '/.back/' | grep -v '/node_modules/' | grep -v 'AddressSearch'
```

This should return zero results (except possibly AddressSearch.tsx related test file if it references Korean addresses).
