# Implementation Plan: Busy Signal Safety

Based on: `2026-02-18-busy-signal-safety-design.md`

## Tasks

### Task 1: useSyncConfig — busy → ready
- File: `packages/solid/src/hooks/useSyncConfig.ts`
- Rename signal from `busy`/`setBusy` to `ready`/`setReady`
- Invert semantics: `false` = not ready, `true` = ready
- localStorage sync path: set ready immediately after read
- syncStorage async path: `setReady(true)` in finally block
- Update JSDoc and example

### Task 2: useSyncConfig tests — busy → ready
- File: `packages/solid/tests/hooks/useSyncConfig.spec.tsx`
- Rename `busy` variables to `ready`
- Invert assertions: `busy() === false` → `ready() === true`
- Update test descriptions

### Task 3: Combobox — boolean → busyCount
- File: `packages/solid/src/components/form-control/combobox/Combobox.tsx`
- Replace `createSignal(false)` with `createSignal(0)`
- `setBusy(true)` → `setBusyCount((c) => c + 1)`
- `setBusy(false)` → `setBusyCount((c) => c - 1)`
- `busy()` → `busyCount() > 0`

### Task 4: README update
- File: `packages/solid/README.md`
- Update useSyncConfig return value documentation
