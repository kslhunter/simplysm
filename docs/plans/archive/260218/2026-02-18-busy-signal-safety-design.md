# Busy Signal Safety: boolean → busyCount + ready rename

## Problem

`createSignal(false)` based busy patterns are prone to race conditions when multiple
async operations run concurrently — one operation finishing can prematurely clear the
busy state while another is still running.

Two places in `packages/solid` still use the boolean pattern:

1. **`useSyncConfig`** — initialization readiness check (not truly "busy")
2. **`Combobox`** — search loading state (genuinely "busy")

Meanwhile, `BusyProvider` and `SharedDataProvider` already use the safer `busyCount` pattern.

## Design

### 1. `useSyncConfig` — rename `busy` → `ready`

This signal represents "has initialization completed", not "is an operation in progress".
Renaming to `ready` with inverted semantics is more accurate.

**Changes:**
- `const [busy, setBusy] = createSignal(false)` → `const [ready, setReady] = createSignal(false)`
- Sync localStorage path: set `ready(true)` immediately after sync read (or use initial `true`)
- Async syncStorage path: `setReady(true)` in `finally` block
- Return type stays `[Accessor<TValue>, Setter<TValue>, Accessor<boolean>]`
- JSDoc: update `busy` references to `ready`

### 2. `Combobox` — boolean → busyCount

Future-proof against concurrent search operations.

**Changes:**
- `const [busy, setBusy] = createSignal(false)` → `const [busyCount, setBusyCount] = createSignal(0)`
- `setBusy(true)` → `setBusyCount((c) => c + 1)`
- `setBusy(false)` → `setBusyCount((c) => c - 1)`
- `busy()` references → `busyCount() > 0`

## Affected Files

| File | Change |
|------|--------|
| `packages/solid/src/hooks/useSyncConfig.ts` | busy → ready |
| `packages/solid/tests/hooks/useSyncConfig.spec.tsx` | busy → ready in tests |
| `packages/solid/src/components/form-control/combobox/Combobox.tsx` | boolean → busyCount |
| `packages/solid/README.md` | Update useSyncConfig return value docs |

## Out of Scope

- `BusyProvider`, `SharedDataProvider` — already use busyCount
- solid-demo — no direct usage of affected APIs
- `Echarts`, `Kanban` busy props — UI toggle props, not internal state management
