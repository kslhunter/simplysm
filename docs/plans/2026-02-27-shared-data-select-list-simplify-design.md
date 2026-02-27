# SharedDataSelectList: Remove modal prop, change header to JSX.Element

## Problem

`SharedDataSelectList` has a `modal` prop that provides no special logic — it just renders an `IconExternalLink` button that calls `dialog.show()`. This can be done by consumers directly. The `header` prop is limited to `string` when it should accept `JSX.Element` so consumers can place any content (including buttons) in the header area.

## Design

### Props Changes

```typescript
// Before
header?: string;
modal?: () => JSX.Element;

// After
header?: JSX.Element;
// modal removed
```

`JSX.Element` includes `string`, so existing `header="text"` usage continues to work without changes.

### Code Removals in `SharedDataSelectList.tsx`

1. **Imports removed:**
   - `IconExternalLink` from `@tabler/icons-solidjs`
   - `useDialog` from `../../disclosure/DialogContext`
   - `Button` from `../../form-control/Button`
   - `Icon` from `../../display/Icon`

2. **Code removed:**
   - `const dialog = useDialog()` (line 87)
   - `handleOpenModal` function (lines 195-198)
   - `modal` from props/splitProps

3. **Header rendering simplified:**

```tsx
// Before
<Show when={local.header != null || local.modal != null}>
  <div class="flex items-center gap-1 px-2 py-1 text-sm font-bold text-base-400">
    <Show when={local.header != null}>{local.header}</Show>
    <Show when={local.modal != null}>
      <Button size="sm" onClick={() => void handleOpenModal()}>
        <Icon icon={IconExternalLink} />
      </Button>
    </Show>
  </div>
</Show>

// After
<Show when={local.header != null}>{local.header}</Show>
```

Header styling is now the consumer's responsibility (they pass styled JSX).

### Test Changes in `SharedDataSelectList.spec.tsx`

- `header="과일 목록"` test: **unchanged** (string is valid JSX.Element)
- `modal={() => <div>Modal</div>}` test: **deleted** (prop removed)

### Files Modified

| File | Change |
|------|--------|
| `packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx` | Remove modal prop/code, change header type |
| `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx` | Remove modal test |
