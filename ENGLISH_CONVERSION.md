# Codebase English Conversion — Getting Started

**Goal:** Convert all Korean text in the simplysm monorepo to English, making it appear as if maintained by English-speaking developers.

**Status:** ✅ Ready for incremental execution

**Progress:** Phase 1 (156/369 files) ✅ Complete, Phases 2-5 Pending

---

## Quick Start

### 1. Understand the Plan
Start here: **`docs/plans/2026-02-25-english-convert-master-incremental.md`**

This master plan explains:
- Overall phases and progress
- Execution strategies (parallel, sequential, hybrid)
- Individual step plans with file counts and estimates
- Git strategy and testing approach

### 2. Track Progress
Use the checklist: **`docs/references/codebase-english-conversion-checklist.md`**

This tracks:
- Which packages are done
- Which are pending
- Phase dependencies
- Exemptions (what to keep in Korean)

### 3. Execute Steps

Each step has its own plan file:

**Phase 1 — Comments/JSDoc/Regions** (Ready to start)
- Step 1: **`docs/plans/2026-02-25-english-convert-phase1-step1-core-common.md`** (34 files, 3-4h)
- Step 2: **`docs/plans/2026-02-25-english-convert-phase1-step2-orm-common.md`** (32 files, 4-5h)
- Step 3: **`docs/plans/2026-02-25-english-convert-phase1-step3-solid-components.md`** (~80 files, 5-6h)
- Step 4-7: Plans will be created as needed

**Phase 2 — Error/Log Messages** (After Phase 1 complete)
**Phase 3 — Test Descriptions** (After Phase 2 complete)
**Phase 4 — Metadata/Config** (Can run independently)
**Phase 5 — Function Naming** (After other phases)

---

## Key Principles

### What We're Converting
- `//` Comments
- `/* */` Block comments
- `/** */` JSDoc comments
- `//#region` Labels
- Error/log/alert messages (Phase 2)
- Test descriptions (Phase 3)
- package.json descriptions and author (Phase 4)
- Function names (Phase 5)

### What We're Keeping (Korean)
- Korean particle literals: `"을"`, `"는"`, `"이"`, `"와"`, etc. (used by `koreanGetSuffix` function)
- Korean character mapping tables: Choseong/Jungseong/Jongseong arrays
- Korean encoding test data: `"한글 내용"` in zip/excel tests (verifies Korean support)
- Korean locale data: day names, AM/PM (will be revisited in Phase 5)

### Translation Style
- **Concise by default**: `// 구현` → `// Implementation`
- **Descriptive when needed**: Complex algorithm comments get extra clarifying lines
- **Consistent**: Same Korean term always maps to the same English

---

## Recommended Execution Strategy

### Option A: Parallel (Fastest) — 1 Week
Execute Phase 1 Steps 1, 2, 3 simultaneously (different agents/terminals):
- Week 1, Days 1-2: Steps 1, 2, 3 (all parallel)
- Week 1, Days 3-4: Steps 4, 5, 6
- Week 1, Day 5: Step 7 + verification

### Option B: Sequential (Safest) — 2-3 Weeks
Execute steps one at a time:
- Step 1: ~4h → Step 2: ~5h → Step 3: ~6h → ...
- Better for learning the codebase structure
- Easier to debug issues

### Option C: Hybrid (Balanced) — 1.5 Weeks
Do steps 1-3 in parallel, then sequential for 4-7.

**Recommendation for this project:** Start with **Option A** (parallel) since the codebase is well-organized and steps touch different packages.

---

## File Structure

```
docs/
├── plans/
│   ├── 2026-02-24-codebase-english-conversion-design.md      ← Design principles
│   ├── 2026-02-24-codebase-english-conversion-plan.md        ← Original big plan (reference)
│   └── 2026-02-25-english-convert-master-incremental.md      ← Master plan (START HERE)
│   └── 2026-02-25-english-convert-phase1-step1-core-common.md
│   └── 2026-02-25-english-convert-phase1-step2-orm-common.md
│   └── 2026-02-25-english-convert-phase1-step3-solid-components.md
│
└── references/
    └── codebase-english-conversion-checklist.md              ← Progress tracker
```

---

## Key Statistics

### Phase 1: Comments/JSDoc (In Progress)

**✅ Already Done (156 files):**
- core-browser (6), core-node (6)
- service-common (5), service-client (10), service-server (13)
- solid hooks/providers/utils (35)
- solid-demo (48)
- excel (18), storage (3), capacitor-plugins (12)

**📋 Ready to Start (213 files):**
- core-common (34)
- orm-common (32)
- solid/components (80)
- orm-node (8)
- sd-cli (50)
- sd-claude (2), lint (6)
- tsconfig.json (1)

### Total Effort
- **Phase 1**: 369 files, ~20 hours (parallel: 7 hours)
- **Phase 2**: ~75 files, ~5 hours
- **Phase 3**: ~190 test files, ~15 hours
- **Phase 4**: ~25 config files, ~2 hours
- **Phase 5**: 1 rename + decisions, ~2 hours
- **Total**: ~582 files, ~44 hours (sequential), ~15 hours (full parallel)

---

## How to Start

1. **Read the master plan**: `docs/plans/2026-02-25-english-convert-master-incremental.md`
2. **Check the checklist**: `docs/references/codebase-english-conversion-checklist.md`
3. **Pick a step and start**: Use the step plans as guides
   - For parallel: Start Step 1, 2, 3 simultaneously
   - For sequential: Start Step 1 first
4. **Track progress**: Update checklist as you complete each step
5. **Test after each step**: `pnpm build [package]`, `pnpm vitest [package] --run`
6. **Commit**: One commit per step

---

## Translation Glossary (Common Terms)

Each step plan includes a domain-specific glossary. Here are universal terms:

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

See individual step plans for complete glossaries.

---

## FAQ

**Q: Can I skip any packages?**
A: No. All packages have Korean text. Complete conversion requires all steps.

**Q: What if I make a mistake?**
A: No problem! Just fix it and re-test. All changes are source code, no data loss.

**Q: How long will this take?**
A: Depends on execution strategy:
- Parallel: 1 week (Phase 1) + 2 weeks (Phases 2-5) = ~3 weeks total
- Sequential: 2-3 months
- Hybrid: ~1.5 months

**Q: Can I work on multiple steps simultaneously?**
A: Yes! Steps in Phase 1 are independent, so you can parallelize:
- Step 1 (core-common) — one person
- Step 2 (orm-common) — another person
- Step 3 (solid/components) — another person

**Q: What if a package has both Korean comments AND Korean strings?**
A: Separate phases handle them:
- Phase 1: Comments only
- Phase 2: Error messages, logs, alerts
- Phase 3: Test descriptions
- Phase 4: Metadata
- Phase 5: Function names + locale data decision

**Q: How do I handle Korean strings in JSX?**
A: Leave them unchanged in Phase 1 and 2 (comments). Phase 2 handles message strings, Phase 3 handles test text, but JSX content strings are discussed further as we progress.

---

## Design Principles

From `docs/plans/2026-02-24-codebase-english-conversion-design.md`:

| Principle | Description |
|-----------|-------------|
| **Scope** | Source files only (exclude dist/, .back/, docs/, node_modules/, .claude/) |
| **Style** | Concise by default; descriptive for complex logic |
| **Consistency** | Same Korean term → same English across codebase |
| **Exemptions** | Korean particles, char tables, encoding test data remain Korean |
| **Metadata** | Set author to "simplysm" (not personal names) |

---

## Questions or Issues?

Refer to:
1. **Master plan**: `docs/plans/2026-02-25-english-convert-master-incremental.md`
2. **Checklist**: `docs/references/codebase-english-conversion-checklist.md`
3. **Design doc**: `docs/plans/2026-02-24-codebase-english-conversion-design.md`
4. **Step plans**: Individual files for each phase/step

All guides are self-contained and include translation glossaries, exemptions, and examples.

---

**Ready to start? Pick Step 1 or your favorite Phase 1 step and go!** 🚀

