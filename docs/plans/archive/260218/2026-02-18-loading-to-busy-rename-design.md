# Rename Loading → Busy (align with `aria-busy` web standard)

## Motivation

- `LoadingContainer` was originally `BusyContainer` — renamed to `Loading` at some point
- Web standard is `aria-busy`, not `aria-loading`
- Aligning component naming with the web standard for consistency

## Rename Map

### File renames (5 files + 1 directory)

| From | To |
|------|-----|
| `feedback/loading/` | `feedback/busy/` |
| `LoadingContainer.tsx` | `BusyContainer.tsx` |
| `LoadingContainer.css` | `BusyContainer.css` |
| `LoadingContext.ts` | `BusyContext.ts` |
| `LoadingProvider.tsx` | `BusyProvider.tsx` |

### Symbol renames

| From | To | Scope |
|------|-----|-------|
| `LoadingContainer` | `BusyContainer` | component + props interface |
| `LoadingContainerProps` | `BusyContainerProps` | interface |
| `LoadingProvider` | `BusyProvider` | component + props interface |
| `LoadingProviderProps` | `BusyProviderProps` | interface |
| `LoadingContext` | `BusyContext` | context |
| `LoadingContextValue` | `BusyContextValue` | interface |
| `LoadingVariant` | `BusyVariant` | type |
| `useLoading` | `useBusy` | hook |
| `loadingVariant` | `busyVariant` | config prop in ConfigContext + InitializeProvider |

### Unchanged (already `busy` or internal/external)

- `z-busy` tailwind token — already correct
- CSS animations `sd-busy-bar-*` — already correct
- `busy` prop on BusyContainer — already correct
- Local signals (`loading`, `loadingCount`) inside components — internal, not public API
- `chart.showLoading()/hideLoading()` — echarts external API

## Files to modify

### solid package — core files (rename + content)
1. `feedback/loading/` → `feedback/busy/` (directory rename)
2. `LoadingContainer.tsx` → `BusyContainer.tsx` (rename + update imports)
3. `LoadingContainer.css` → `BusyContainer.css` (rename only, content unchanged)
4. `LoadingContext.ts` → `BusyContext.ts` (rename + update all symbols)
5. `LoadingProvider.tsx` → `BusyProvider.tsx` (rename + update imports/symbols)
6. `index.ts` — update export paths

### solid package — internal references (content only)
7. `providers/ConfigContext.ts` — `loadingVariant` → `busyVariant`
8. `providers/InitializeProvider.tsx` — `LoadingProvider` → `BusyProvider`, `loadingVariant` → `busyVariant`
9. `hooks/usePrint.ts` — `useLoading` → `useBusy`
10. `components/data/kanban/Kanban.tsx` — `LoadingContainer` → `BusyContainer`

### solid-demo package
11. `pages/feedback/LoadingPage.tsx` → `BusyPage.tsx` (rename + full update)
12. `appStructure.ts` — route title/component reference
13. `pages/feedback/PrintPage.tsx` — `LoadingProvider` → `BusyProvider`
14. `pages/service/SharedDataPage.tsx` — `LoadingContainer` → `BusyContainer`

### Documentation
15. `packages/solid/README.md` — Loading → Busy references
16. `packages/solid/docs/feedback.md` — Loading section
17. `packages/solid/docs/hooks.md` — `useLoading` → `useBusy`

## Verification

- `pnpm typecheck packages/solid` + `pnpm typecheck packages/solid-demo`
- `pnpm lint packages/solid` + `pnpm lint packages/solid-demo`
