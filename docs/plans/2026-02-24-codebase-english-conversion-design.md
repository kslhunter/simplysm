# Codebase English Conversion Design

Convert all Korean text in the codebase to English, making the repository appear as if maintained by English-speaking developers.

## Principles

| Rule | Description |
|------|-------------|
| Target | Source files only (exclude `dist/`, `.back/`, `docs/`, `node_modules/`, `.claude/`) |
| Translation style | Concise by default; descriptive supplement for complex logic |
| Keep Korean | (1) Korean language utility literals (`"을"`, `"는"`, etc.) (2) Korean encoding test data |
| Function naming | Clarify Korean utility naming (e.g., `strGetSuffix` → `koreanGetSuffix`) |
| author | Set to `"simplysm"` |

### Translation Style Examples

```ts
// Before
//#region 구현
/** 측정 대상 요소 */

// After
//#region Implementation
/** Target element to measure */
```

```ts
// Before (complex case)
// 주의 시작 요일 기준으로 현재 날짜의 요일 인덱스 계산 (0 = 주 시작일)

// After
// Calculate day-of-week index relative to the starting day (0 = week start).
// Adjusts the raw day index so that the configured start day maps to 0.
```

## Phases

### Phase 1 — Comments / JSDoc (~70%, ~13,000 lines)

| Item | Detail |
|------|--------|
| Target | `//` comments, `/* */` blocks, `//#region`, JSDoc (`/** */`) |
| File types | `.ts`, `.tsx` |
| Estimated files | ~600 |
| Commit message | `refactor: convert Korean comments and JSDoc to English` |

### Phase 2 — Error / Log Messages (~15%, ~2,800 lines)

| Item | Detail |
|------|--------|
| Target | `throw new Error(...)`, `console.log/warn/error(...)`, `alert(...)` |
| File types | `.ts`, `.tsx` |
| Estimated files | ~80 |
| Commit message | `refactor: convert Korean error and log messages to English` |

### Phase 3 — Test Descriptions (~10%, ~1,900 lines)

| Item | Detail |
|------|--------|
| Target | `describe("...")`, `it("...")`, Korean strings in tests (except functional test data) |
| File types | `.spec.ts`, `.test.ts` |
| Estimated files | ~50 |
| Commit message | `refactor: convert Korean test descriptions to English` |

### Phase 4 — Metadata / Config (~5%, ~400 lines)

| Item | Detail |
|------|--------|
| Target | `package.json` description/author, `.yaml` comments, Zod `.describe()` |
| File types | `.json`, `.yaml`, `.ts` |
| Estimated files | ~30 |
| Commit message | `refactor: convert Korean metadata and config to English` |

### Phase 5 — Function Name Clarification

| Item | Detail |
|------|--------|
| Target | Korean utility function naming (e.g., `strGetSuffix` → `koreanGetSuffix`) |
| Scope | Function name + export name + all call sites |
| Commit message | `refactor: rename Korean utility functions for clarity` |

## Decision Criteria — Convert vs Keep

### Convert (English)

| Case | Before | After |
|------|--------|-------|
| General comment | `// 구현` | `// Implementation` |
| JSDoc | `/** 비동기 필터 (순차 실행) */` | `/** Async filter (sequential) */` |
| Region marker | `//#region 주차 계산` | `//#region Week number calculation` |
| Error message | `"안드로이드만 지원합니다."` | `"Only Android is supported."` |
| Log message | `console.log("서버에서 최신버전 정보를 가져오지 못했습니다.")` | `console.log("Failed to fetch latest version from server.")` |
| Test name | `it("요소를 첫 번째 자식으로 삽입")` | `it("insert element as first child")` |
| description | `"심플리즘 패키지"` | `"Simplysm package"` |
| author | `"김석래"` | `"simplysm"` |
| Config comment | `# 한 줄 최대 길이` | `# Max line length` |
| Zod describe | `.describe("제목")` | `.describe("title")` |
| Demo UI text | `"제목"`, `"저장"` | `"Title"`, `"Save"` |

### Keep (Korean)

| Case | Example | Reason |
|------|---------|--------|
| Korean utility literals | `"을"`, `"는"`, `"이"` | Part of Korean suffix processing logic |
| Korean encoding test data | `"한글 내용"` (zip test) | Verifies Korean encoding |
| Korean utility mapping tables | Choseong/Jungseong/Jongseong code tables | Data for Korean processing logic |

### Decision Flowchart

```
Korean found → Is this part of "Korean language processing functionality"?
  ├─ YES → Keep
  └─ NO  → Convert to English
```

## Execution Order and Dependencies

```
Phase 1 (Comments/JSDoc)
  └─ Independent, no impact on other phases
       ↓ commit
Phase 2 (Error/Log)
  └─ Independent, no runtime impact (string-only changes)
       ↓ commit
Phase 3 (Tests)
  └─ Run after Phase 2 (error message changes may require test message updates)
       ↓ commit
Phase 4 (Metadata)
  └─ Independent
       ↓ commit
Phase 5 (Function naming)
  └─ Run last (renames affect all call sites)
       ↓ commit
```

### Dependency Notes

| Dependency | Description |
|------------|-------------|
| Phase 2 → 3 | Error message changes may break string-matching tests. Phase 3 updates these. |
| Phase 5 last | Function renames affect exports/imports/call sites. Run after all other changes. |
| Phase 1, 4 | Fully independent. Ordered by size (largest first). |

### Verification After Each Phase

```
Phase complete → pnpm build → pnpm test → commit
```

## Exclusions

| Excluded | Reason |
|----------|--------|
| `dist/` | Build output, auto-generated from source |
| `.back/` | Backup folder |
| `docs/` | Documentation folder (managed separately) |
| `node_modules/` | External dependencies |
| `.claude/` | Claude config/rules |
| Git history | Past commit messages are not modified |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test failure after error message change | Phase 2 → 3 mismatch | Update message-matching tests in Phase 3 |
| Translation inconsistency | Same concept translated differently across files | Maintain term consistency (e.g., `구현` → always `Implementation`) |
| Build breakage | String changes affect logic | `pnpm build && pnpm test` after each phase |
| Missed Korean | Some Korean remains | Final scan with `grep '[가-힣]'` |

## Final Verification (After All Phases)

```
1. Scan remaining Korean with grep '[가-힣]' (excluding exempted folders)
2. Verify each found Korean is in the "Keep" category
3. pnpm build → pnpm test → all pass
```
