# Test File English Localization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert all Korean `describe`/`it` strings and `//` comments in test files to English, per CLAUDE.md code language policy.

**Architecture:** Bulk text replacement across ~60 test files in `packages/` and `tests/`. No logic changes — only string translations. Parallel execution by package group.

**Tech Stack:** TypeScript test files (vitest), SolidJS component tests, ORM query tests.

---

## Translation Rules (apply to ALL tasks)

**TRANSLATE** (Korean → English):
- `describe("한글")` / `it("한글")` → concise idiomatic English
- `// 한글 주석` → `// English comment`
- `//#region ========== 한글 ==========` → `//#region ========== English ==========`

**KEEP AS-IS** (do NOT translate):
- Test data in `expect()`, function arguments, string literals being tested
- Korean strings that ARE the test subject (e.g., `koreanGetSuffix("책", "을")`, IME input `"한글"`, date format `"토"`)
- Fixture filenames (e.g., `초기화.xlsx`)
- Variable/function names (already English)

**Style:**
- Active voice: "renders", "returns", "throws", "handles"
- Short: `it("renders children")` not `it("should render the children correctly")`
- Keep technical terms: prop, state, callback, handler, etc.

---

### Task 1: solid — display, disclosure, feedback components

**Files (13):**
- `packages/solid/tests/components/display/Alert.spec.tsx`
- `packages/solid/tests/components/display/Barcode.spec.tsx`
- `packages/solid/tests/components/display/Card.spec.tsx`
- `packages/solid/tests/components/display/Link.spec.tsx`
- `packages/solid/tests/components/display/Tag.spec.tsx`
- `packages/solid/tests/components/disclosure/Collapse.spec.tsx`
- `packages/solid/tests/components/disclosure/Dialog.spec.tsx`
- `packages/solid/tests/components/disclosure/DialogProvider.spec.tsx`
- `packages/solid/tests/components/disclosure/Dropdown.spec.tsx`
- `packages/solid/tests/components/disclosure/Tabs.spec.tsx`
- `packages/solid/tests/components/feedback/busy/BusyContainer.spec.tsx`
- `packages/solid/tests/components/feedback/notification/NotificationBell.spec.tsx`
- `packages/solid/tests/components/feedback/print/Print.spec.tsx`

**Steps:**
1. Read each file
2. Translate all Korean in `describe()`/`it()` strings to concise English
3. Translate all Korean `//` comments to English
4. Keep all test data (string literals in expect/render calls) as-is
5. Save each file

---

### Task 2: solid — form-control components

**Files (15):**
- `packages/solid/tests/components/form-control/Button.spec.tsx`
- `packages/solid/tests/components/form-control/checkbox/Checkbox.spec.tsx`
- `packages/solid/tests/components/form-control/checkbox/CheckboxGroup.spec.tsx`
- `packages/solid/tests/components/form-control/checkbox/Radio.spec.tsx`
- `packages/solid/tests/components/form-control/checkbox/RadioGroup.spec.tsx`
- `packages/solid/tests/components/form-control/color-picker/ColorPicker.spec.tsx`
- `packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx`
- `packages/solid/tests/components/form-control/combobox/ComboboxItem.spec.tsx`
- `packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx`
- `packages/solid/tests/components/form-control/field/DatePicker.spec.tsx`
- `packages/solid/tests/components/form-control/field/DateTimePicker.spec.tsx`
- `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx`
- `packages/solid/tests/components/form-control/field/Textarea.spec.tsx`
- `packages/solid/tests/components/form-control/field/TextInput.spec.tsx`
- `packages/solid/tests/components/form-control/field/TimePicker.spec.tsx`
- `packages/solid/tests/components/form-control/numpad/Numpad.spec.tsx`
- `packages/solid/tests/components/form-control/select/Select.spec.tsx`
- `packages/solid/tests/components/form-control/select/SelectItem.spec.tsx`

**Steps:** Same as Task 1.

---

### Task 3: solid — features, data, hooks, helpers, providers

**Files (16):**
- `packages/solid/tests/components/features/address/AddressSearch.spec.tsx`
- `packages/solid/tests/components/features/crud-detail/CrudDetail.spec.tsx`
- `packages/solid/tests/components/features/crud-sheet/CrudSheet.spec.tsx`
- `packages/solid/tests/components/features/data-select-button/DataSelectButton.spec.tsx`
- `packages/solid/tests/components/features/permission-table/PermissionTable.spec.tsx`
- `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx`
- `packages/solid/tests/components/data/List.spec.tsx`
- `packages/solid/tests/components/data/Pagination.spec.tsx`
- `packages/solid/tests/components/data/Table.spec.tsx`
- `packages/solid/tests/components/data/sheet/DataSheet.spec.tsx`
- `packages/solid/tests/components/data/kanban/Kanban.selection.spec.tsx`
- `packages/solid/tests/hooks/createIMEHandler.spec.ts`
- `packages/solid/tests/helpers/createAppStructure.spec.tsx`
- `packages/solid/tests/helpers/mergeStyles.spec.ts`
- `packages/solid/tests/providers/i18n/I18nContext.spec.tsx`

**Steps:** Same as Task 1.

**Note:** `createIMEHandler.spec.ts` tests Korean IME input — Korean strings in test data (`"한"`, `"한글"`) must be kept.

---

### Task 4: orm-common — spec files + setup

**Files (18):**
- `packages/orm-common/tests/ddl/column-builder.spec.ts`
- `packages/orm-common/tests/ddl/index-builder.spec.ts`
- `packages/orm-common/tests/dml/update.spec.ts`
- `packages/orm-common/tests/errors/queryable-errors.spec.ts`
- `packages/orm-common/tests/escape.spec.ts`
- `packages/orm-common/tests/examples/sampling.spec.ts`
- `packages/orm-common/tests/exec/search-parser.spec.ts`
- `packages/orm-common/tests/expr/comparison.spec.ts`
- `packages/orm-common/tests/expr/conditional.spec.ts`
- `packages/orm-common/tests/select/filter.spec.ts`
- `packages/orm-common/tests/select/join.spec.ts`
- `packages/orm-common/tests/select/order.spec.ts`
- `packages/orm-common/tests/utils/result-parser.spec.ts`
- `packages/orm-common/tests/utils/result-parser-perf.spec.ts`
- `packages/orm-common/tests/setup/MockExecutor.ts`
- `packages/orm-common/tests/setup/models/Employee.ts`
- `packages/orm-common/tests/setup/views/ActiveUsers.ts`
- `packages/orm-common/tests/setup/views/UserSummary.ts`

**Steps:** Same as Task 1.

**Note:** `escape.spec.ts` and `search-parser.spec.ts` test Korean string handling — Korean strings in test data must be kept. Only translate describe/it/comments.

---

### Task 5: orm-common — expected files

**Files (12):**
- `packages/orm-common/tests/ddl/column-builder.expected.ts`
- `packages/orm-common/tests/dml/update.expected.ts`
- `packages/orm-common/tests/examples/pivot.expected.ts`
- `packages/orm-common/tests/examples/sampling.expected.ts`
- `packages/orm-common/tests/expr/comparison.expected.ts`
- `packages/orm-common/tests/expr/utility.expected.ts`
- `packages/orm-common/tests/select/basic.expected.ts`
- `packages/orm-common/tests/select/filter.expected.ts`
- `packages/orm-common/tests/select/order.expected.ts`
- `packages/orm-common/tests/select/recursive-cte.expected.ts`
- `packages/orm-common/tests/select/subquery.expected.ts`
- `packages/orm-common/tests/select/view.expected.ts`

**Steps:**
1. Read each file
2. Translate Korean in `//#region` section headers and `//` comments to English
3. Keep all expected SQL strings and test data as-is
4. Save each file

---

### Task 6: excel, sd-cli, core-common, core-node, tests/service

**Files (13):**
- `packages/excel/tests/excel-workbook.spec.ts`
- `packages/excel/tests/excel-wrapper.spec.ts`
- `packages/sd-cli/tests/infra/WorkerManager.spec.ts`
- `packages/sd-cli/tests/replace-deps.spec.ts`
- `packages/sd-cli/tests/run-lint.spec.ts`
- `packages/sd-cli/tests/run-typecheck.spec.ts`
- `packages/sd-cli/tests/sd-cli.spec.ts`
- `packages/core-common/tests/types/date-only.spec.ts`
- `packages/core-common/tests/types/date-time.spec.ts`
- `packages/core-common/tests/utils/date-format.spec.ts`
- `packages/core-common/tests/utils/string.spec.ts`
- `packages/core-common/tests/zip/sd-zip.spec.ts`
- `packages/core-node/tests/utils/fs.spec.ts`
- `tests/service/vitest.setup.ts`

**Steps:** Same as Task 1.

**Note:**
- `string.spec.ts` tests `koreanGetSuffix` — Korean data must be kept
- `date-format.spec.ts`, `date-only.spec.ts`, `date-time.spec.ts` — Korean day names (`"토"`, `"일"`) are test data
- `sd-zip.spec.ts`, `fs.spec.ts` — Korean file content strings are test data
- Some of these files may have Korean ONLY in test data (no describe/it/comment changes needed) — skip those

---

### Task 7: Verification

**Step 1:** Run `npm run check` (timeout: 600000)
**Step 2:** If any tests fail, investigate whether translation changed test semantics
**Step 3:** Fix any issues found
**Step 4:** Re-run check until all pass

---

### Task 8: Commit

```bash
git add packages/solid/tests/ packages/orm-common/tests/ packages/excel/tests/ packages/sd-cli/tests/ packages/core-common/tests/ packages/core-node/tests/ tests/service/
git commit -m "refactor(tests): convert Korean test descriptions and comments to English"
```
