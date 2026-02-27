# Test File English Localization Design

## Date

2026-02-27

## Summary

Convert all Korean text in test files under `packages/` to English, per the CLAUDE.md code language policy.

## Scope

### In scope

- `describe()` / `it()` description strings containing Korean
- `//` comments containing Korean
- Test setup files (e.g., `vitest.setup.ts`)
- All packages: `solid`, `orm-common`, `excel`, `sd-cli`, `core-common`, `core-node`

### Out of scope

- `.back/` directory (backup files)
- Test data: string literals in `expect()`, fixture filenames (`초기화.xlsx`), model data
- Korean strings that are the **subject** of the test (e.g., testing Korean string handling)
- Source code files (non-test)

## Rules

1. **describe/it strings**: Translate to concise, idiomatic English test style
   - `it("children이 Alert 내부에 표시된다")` → `it("displays children inside Alert")`
   - `describe("theme 속성")` → `describe("theme prop")`
2. **Comments**: Translate to concise English
   - `// 외부 의존성 모킹` → `// Mock external dependencies`
   - `// 중복 제거됨` → `// Deduplicated`
3. **Test data**: Keep as-is
   - `expect(names).toEqual(["권한그룹", "권한그룹권한", "직원"])` — no change
4. **Translation style**: Short, conventional English test descriptions
   - Prefer active voice: "renders", "returns", "throws"
   - Avoid verbose descriptions

## Affected files

- **47 files** with Korean in describe/it strings
- **28 files** with Korean comments (overlap with above)
- Estimated total: ~50-55 unique files

## Execution

- Parallel agents by package group
- Full `/sd-check` after all changes
- Single commit

## Commit

Single commit: `refactor(tests): convert Korean test descriptions and comments to English`
