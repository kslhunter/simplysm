# English Conversion — Phase 1 Step 1: core-common Comments

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert all Korean comments, JSDoc, and region labels in `packages/core-common/src/` to English.

**Architecture:** Read each file → translate comments/JSDoc/regions to English → build → test → commit.

**Tech Stack:** TypeScript, pnpm, vitest

**Reference:** `docs/plans/2026-02-24-codebase-english-conversion-design.md`

**Checklist:** `docs/references/codebase-english-conversion-checklist.md`

---

## Global Translation Rules

### What to Translate
- `//` single-line comments
- `/* */` block comments
- `/** */` JSDoc comments
- `//#region` and `//#endregion` labels

### What to KEEP (Korean)
- Korean particle literals in `utils/str.ts`: `"을"`, `"를"`, `"은"`, `"는"`, `"이"`, `"가"`, `"와"`, `"과"`, `"랑"`, `"로"`, `"이라"`, etc.
- Korean character mapping constants: Choseong, Jungseong, Jongseong arrays in `utils/str.ts`
- Korean locale data in `utils/date-format.ts`: `["일", "월", "화", "수", "목", "금", "토"]` and `"오전"/"오후"` — **KEEP FOR NOW** (decide in Phase 5)
- String literals inside `throw new Error/ArgumentError(...)`, `console.*()`, `alert()` — handled in Phase 2

### Translation Style
- **Concise**: `// 구현` → `// Implementation`
- **Descriptive**: Complex multi-line algorithm comments → add extra clarifying line if needed
- **Consistent**: Same Korean term → same English across all files

---

## Files to Process

**Total: ~34 source files in `packages/core-common/src/`**

### By Category

**Errors** (4 files)
- [ ] `errors/argument-error.ts`
- [ ] `errors/not-implemented-error.ts`
- [ ] `errors/sd-error.ts`
- [ ] `errors/timeout-error.ts`

**Extensions** (5 files)
- [ ] `extensions/arr-ext.ts`
- [ ] `extensions/arr-ext.helpers.ts`
- [ ] `extensions/arr-ext.types.ts`
- [ ] `extensions/map-ext.ts`
- [ ] `extensions/set-ext.ts`

**Features** (3 files)
- [ ] `features/debounce-queue.ts`
- [ ] `features/event-emitter.ts`
- [ ] `features/serial-queue.ts`

**Types** (5 files)
- [ ] `types/date-only.ts`
- [ ] `types/date-time.ts`
- [ ] `types/lazy-gc-map.ts`
- [ ] `types/time.ts`
- [ ] `types/uuid.ts`

**Utils** (13 files)
- [ ] `utils/bytes.ts`
- [ ] `utils/date-format.ts` (keep Korean locale data)
- [ ] `utils/error.ts`
- [ ] `utils/json.ts`
- [ ] `utils/num.ts`
- [ ] `utils/obj.ts`
- [ ] `utils/path.ts`
- [ ] `utils/primitive.ts`
- [ ] `utils/str.ts` (keep Korean particles + char tables)
- [ ] `utils/template-strings.ts`
- [ ] `utils/transferable.ts`
- [ ] `utils/wait.ts`
- [ ] `utils/xml.ts`

**Root & Other** (4 files)
- [ ] `common.types.ts`
- [ ] `globals.ts`
- [ ] `index.ts`
- [ ] `zip/sd-zip.ts`

---

## Example Translations

### Simple Comments
```ts
// Before
// 구현

// After
// Implementation
```

### JSDoc
```ts
// Before
/** 비동기 필터 (순차 실행) */

// After
/** Async filter (sequential execution) */
```

### Region Labels
```ts
// Before
//#region 한글 조사 처리

// After
//#region Korean particle processing
```

### Parameter Documentation
```ts
// Before
/**
 * 에러를 감싸서 새로운 에러 생성
 * @param message 메시지
 */

// After
/**
 * Wrap error and create new error
 * @param message Error message
 */
```

### Complex Algorithm Comments
```ts
// Before
// 주의 시작 요일 기준으로 현재 날짜의 요일 인덱스 계산 (0 = 주 시작일)

// After
// Calculate day-of-week index relative to the starting day (0 = week start).
// Adjusts the raw day index so that the configured start day maps to 0.
```

---

## Task: Translate All Comments

### Step 1: Scan for Korean in core-common source files

```bash
grep -rn '[가-힣]' packages/core-common/src/ --include='*.ts' | head -50
```

Expected: Shows all lines with Korean text (comments and string literals mixed).

### Step 2: Translate comments in each file

For each file in the Files list above:
1. Read the file
2. Identify all Korean in comments/JSDoc/regions (NOT in string literals)
3. Use Edit tool to translate
4. Save

Work efficiently: Read 3-5 files per batch, then Edit each.

### Step 3: Verify no untranslated Korean remains

```bash
grep -rn '[가-힣]' packages/core-common/src/ --include='*.ts' | grep -v 'throw new Error\|console\.\|alert\|"\|'\''s'
```

Expected output: ONLY Korean particles in `str.ts`, Korean locale data in `date-format.ts`, and error/log/alert strings.

### Step 4: Build

```bash
pnpm build core-common
```

Expected: Success (comments never break builds, but verify for peace of mind).

### Step 5: Run tests

```bash
pnpm vitest packages/core-common/tests/ --run
```

Expected: All tests pass (comments unchanged, no functional changes).

### Step 6: Commit

```bash
git add packages/core-common/src/
git commit -m "refactor: convert Korean comments to English in core-common"
```

---

## Translation Glossary (core-common context)

| Korean | English |
|--------|---------|
| 구현 | Implementation |
| 초기화 | Initialization |
| 정리 | Cleanup |
| 검증 | Validation |
| 에러 | Error |
| 오류 | Error |
| 경고 | Warning |
| 메서드 | Method |
| 함수 | Function |
| 배열 | Array |
| 객체 | Object |
| 맵 | Map |
| 세트 | Set |
| 리스트 | List |
| 요소 | Element |
| 지연 | Delay |
| 대기 | Wait |
| 타입 | Type |
| 파라미터 | Parameter |
| 반환 | Return |
| 반환값 | Return value |
| 주의 | Note |
| 중요 | Important |
| 확인 | Check |
| 처리 | Processing |
| 변환 | Transform |
| 정렬 | Sort |
| 필터 | Filter |
| 계산 | Calculate |
| 비교 | Compare |
| 캐시 | Cache |
| 조사 | Particle |
| 한글 | Korean |
| 문자 | Character |
| 문자열 | String |
| 매핑 | Mapping |
| 인덱스 | Index |
| 범위 | Range |
| 길이 | Length |
| 임시 | Temporary |
| 유효 | Valid |
| 무효 | Invalid |
| 성공 | Success |
| 실패 | Failure |
| 완료 | Complete |
| 미리 | Pre |
| 사후 | Post |

---

## Notes for Translator

1. **str.ts special handling**: This file contains Korean suffix particle processing logic. Keep Korean particle strings (`"을"`, `"는"`, etc.) but translate surrounding comments.

2. **date-format.ts special handling**: Contains Korean day names and AM/PM markers. These are runtime locale data, not comments. Keep for now — will be revisited in Phase 5 for potential English conversion or localization.

3. **Comment matching**: Use exact text matching in Edit tool. If a comment spans multiple lines, capture the whole block.

4. **JSDoc tags**: Translate parameter descriptions but preserve tag names (`@param`, `@returns`, `@throws`, etc.).

5. **Build efficiency**: After every 8-10 files, run `pnpm build core-common` to catch any unexpected issues early.

---

## Success Criteria

- ✅ All Korean comments translated to English in core-common/src/
- ✅ All Korean region labels translated
- ✅ All Korean JSDoc translated
- ✅ Korean particles in str.ts preserved
- ✅ Korean locale data in date-format.ts preserved
- ✅ Error/log/alert messages left unchanged (Phase 2)
- ✅ `pnpm build core-common` passes
- ✅ `pnpm vitest packages/core-common/tests/ --run` passes
- ✅ Single commit with all changes

