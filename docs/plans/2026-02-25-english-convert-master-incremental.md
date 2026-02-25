# Codebase English Conversion — Master Incremental Plan

**Status:** Ready to execute
**Last Updated:** 2026-02-25
**Overall Progress:** Phase 1 Step 1-4 Done, 5-7 Ready, Phase 2-5 Pending

---

## Quick Reference

### Phase 1 — Comments/JSDoc/Regions (In Progress)

#### ✅ Complete (merged to main)
- [x] **core-browser** — 6 files → Commit: `a9920e33f`
- [x] **core-node** — 6 files → Commit: `a9920e33f`
- [x] **service-common** — 5 files → Commit: `a9920e33f`
- [x] **service-client** — 10 files → Commit: `a9920e33f`
- [x] **service-server** — 13 files → Commit: `a9920e33f`
- [x] **solid/hooks, providers, utils** — ~35 files → Commit: `100ab1092`
- [x] **solid-demo, solid-demo-server** — 48 files → Commit: `347131439`
- [x] **excel** — 18 files → Commit: `3852b1583`
- [x] **storage** — 3 files → Commit: `3852b1583`
- [x] **capacitor-plugins** — 12 files → Commit: `3852b1583`

**Subtotal Complete: 156 files ✅**

#### 📋 Next (Ready to Execute)
- [ ] **Phase 1 Step 1: core-common** — 34 files
  - Plan: `docs/plans/2026-02-25-english-convert-phase1-step1-core-common.md`
  - Estimate: 3-4 hours
  - Status: Ready

- [ ] **Phase 1 Step 2: orm-common** — 32 files
  - Plan: `docs/plans/2026-02-25-english-convert-phase1-step2-orm-common.md`
  - Estimate: 4-5 hours
  - Dependency: Can run in parallel with Step 1
  - Status: Ready

- [ ] **Phase 1 Step 3: solid/src/components** — ~80 files
  - Plan: `docs/plans/2026-02-25-english-convert-phase1-step3-solid-components.md`
  - Estimate: 5-6 hours
  - Dependency: Can run in parallel
  - Status: Ready

- [ ] **Phase 1 Step 4: orm-node** — 8 files
  - Estimate: 1 hour
  - Dependency: orm-common should be done first
  - Status: Plan needed

- [ ] **Phase 1 Step 5: sd-cli** — 50 files
  - Estimate: 3-4 hours
  - Status: Plan needed

- [ ] **Phase 1 Step 6: sd-claude + lint** — 8 files
  - Estimate: 1 hour
  - Status: Plan needed

- [ ] **Phase 1 Step 7: tsconfig + verification** — 1 file + full scan
  - Estimate: 30 mins + 30 mins
  - Status: Plan needed

**Subtotal Phase 1 Remaining: 213 files**

#### ⏳ Pending (depends on Phase 1+2 complete)
- [ ] **Phase 2: Error / Log Messages** — ~75 files across all packages
  - Plan needed
  - Dependencies: Phase 1 complete

- [ ] **Phase 3: Test Descriptions** — ~190 test files
  - Plan needed
  - Dependencies: Phase 2 complete (error message assertions)

- [ ] **Phase 4: Metadata / Config** — 25+ files (package.json, YAML, etc.)
  - Plan needed
  - Dependencies: None, can run independently

- [ ] **Phase 5: Function Naming** — 1 rename + decision on locale data
  - Plan needed
  - Dependencies: Phase 1-4 ideally complete

#### 📊 Final Verification
- [ ] Comprehensive Korean scan
- [ ] Full build & test
- [ ] Final commit

---

## Individual Step Plans (Ready to Execute)

### Phase 1 — Comments / JSDoc / Regions

| Step | Package(s) | Files | Plan | Est. Time | Status |
|------|-----------|-------|------|-----------|--------|
| 1 | core-common | 34 | [Link](2026-02-25-english-convert-phase1-step1-core-common.md) | 3-4h | 📋 Ready |
| 2 | orm-common | 32 | [Link](2026-02-25-english-convert-phase1-step2-orm-common.md) | 4-5h | 📋 Ready |
| 3 | solid/src/components | ~80 | [Link](2026-02-25-english-convert-phase1-step3-solid-components.md) | 5-6h | 📋 Ready |
| 4 | orm-node | 8 | — | 1h | 🔲 Needs plan |
| 5 | sd-cli | 50 | — | 3-4h | 🔲 Needs plan |
| 6 | sd-claude, lint | 8 | — | 1h | 🔲 Needs plan |
| 7 | tsconfig.json | 1 | — | 30m | 🔲 Needs plan |
| Final | All packages | — | — | 1h | 🔲 Verification |

---

## Execution Strategy

### Option A: Parallel Execution (Recommended)
- **Week 1, Day 1-2**: Execute Steps 1, 2, 3 in **parallel** (different terminals/agents)
  - All three are independent (different file trees)
  - Can complete simultaneously

- **Week 1, Day 3-4**: Execute Steps 4, 5, 6
  - Step 4 (orm-node) depends on Step 2 completion
  - Steps 5, 6 are independent

- **Week 1, Day 5**: Execute Step 7 + Final Verification
  - Full build & test across all changes

**Total: 1 week to complete Phase 1**

### Option B: Sequential Execution
- Execute steps 1-7 sequentially
- More conservative, easier to track progress
- Estimated: 2-3 weeks (due to manual effort per step)

### Option C: Hybrid
- Do Steps 1-3 in parallel (largest, take longest)
- Do Steps 4-7 sequentially as other steps complete
- Can pipeline work

---

## Checklist Document

**Main Reference**: `docs/references/codebase-english-conversion-checklist.md`

This document contains:
- Detailed file-by-file breakdown
- Progress tracking for each package
- Phase dependencies
- Translation glossary
- Notes on exemptions

Update this file as you complete each step:
```markdown
- [x] **package-name** — description
  - Completed in: commit-sha
```

---

## Translation Glossary (Master)

Each step plan includes a domain-specific glossary. For consistency:

### Universal Terms (use across all steps)
| Korean | English |
|--------|---------|
| 구현 | Implementation |
| 초기화 | Initialization |
| 정리 | Cleanup |
| 검증 | Validation |
| 처리 | Processing |
| 변환 | Transform |
| 에러 | Error |
| 경고 | Warning |
| 주의 | Note |
| 중요 | Important |

See individual step plans for domain-specific glossaries.

---

## Key Exemptions (Do NOT Translate)

### Korean Particles (in `core-common/src/utils/str.ts`)
```
"을", "를", "은", "는", "이", "가", "와", "과", "랑", "로", "이라", "라" 등
```

### Korean Character Mapping (in `core-common/src/utils/str.ts`)
- Choseong arrays
- Jungseong arrays
- Jongseong arrays

### Korean Locale Data (decision in Phase 5)
- `packages/core-common/src/utils/date-format.ts`: `["일", "월", "화", "수", "목", "금", "토"]`, `"오전"/"오후"`
- `packages/solid/src/components/data/calendar/Calendar.tsx`: `WEEKS` constant

### Error/Log/Alert Messages
- `throw new Error(...)`
- `throw new ArgumentError(...)`
- `console.log/warn/error(...)`
- `alert(...)`
- → Handled in Phase 2

### String Literals
- Regular string values in code
- JSX text content
- → Handled in Phase 2

---

## Testing Strategy

**After each step:**
```bash
pnpm build [package-name]      # Verify build succeeds
pnpm vitest [package-path]     # Run tests for changed package
```

**After Phase 1 complete (all 7 steps):**
```bash
pnpm build                     # Full monorepo build
pnpm vitest --run              # Full test suite
```

**After Phase 2 (error messages):**
- Tests may fail due to assertion mismatches
- Phase 3 will update assertions to match Phase 2 translations

---

## Git Strategy

**Commits:**
- One commit per step
- Message format: `refactor: convert Korean comments to English in [package-name]`

**Example:**
```bash
git add packages/core-common/src/
git commit -m "refactor: convert Korean comments to English in core-common"
```

**Branching:**
- Execute on `main` branch (all changes are in-repo, non-destructive)
- No need for separate branches
- Each commit is self-contained

---

## Success Criteria

**Per Step:**
- ✅ All Korean comments/JSDoc/regions translated
- ✅ All Korean exemptions preserved
- ✅ `pnpm build [package]` passes
- ✅ `pnpm vitest [package] --run` passes
- ✅ Single commit

**Phase 1 Complete:**
- ✅ All 7 steps committed
- ✅ `pnpm build` (full) passes
- ✅ `pnpm vitest --run` (full) passes
- ✅ ~156 + 213 = 369 files converted

**Full Conversion Complete:**
- ✅ Phases 1-5 all complete
- ✅ ~582 files converted
- ✅ 0 untranslated Korean except exempted categories

---

## FAQ

**Q: Can I do the steps out of order?**
A: For Phase 1, yes! Steps 1-3 are independent. Step 4 (orm-node) should wait for Step 2 (orm-common). Steps 5-7 are independent.

**Q: Can I run steps in parallel?**
A: Yes! Use separate tasks/agents for Steps 1, 2, 3 simultaneously.

**Q: What if a build fails?**
A: Investigate the error. Likely cause: incorrect comment translation (edge case syntax). Fix and re-try build.

**Q: What if a test fails?**
A: In Phase 1, tests should pass (comments don't affect logic). If they don't, likely cause: accidentally translated a string literal. Check and fix.

**Q: How long does this take total?**
A: Estimated:
- Phase 1: 1-2 weeks (parallel: 1 week, sequential: 2 weeks)
- Phase 2: 3-5 days
- Phase 3: 1-2 weeks (large, many test files)
- Phase 4: 1-2 days (config files, quick)
- Phase 5: 1-2 days (naming + decisions)
- **Total: 1-2 months if done steadily**

**Q: Can I skip any steps?**
A: No. Each package has Korean text. All must be covered for complete conversion.

---

## Next Actions

1. **Read the checklist**: `docs/references/codebase-english-conversion-checklist.md`
2. **Choose execution strategy**: Parallel (A), Sequential (B), or Hybrid (C)
3. **Start Phase 1 Step 1**: `docs/plans/2026-02-25-english-convert-phase1-step1-core-common.md`
4. **Track progress**: Update checklist as you complete each step

---

## Contact / Questions

Refer to:
- **Design principles**: `docs/plans/2026-02-24-codebase-english-conversion-design.md`
- **Translation glossaries**: Individual step plans
- **Progress tracking**: `docs/references/codebase-english-conversion-checklist.md`

