# Dialog Confirm Feature Design

**Date:** 2026-03-04
**Status:** Validated

## Summary

Add a `confirm()` method to `useDialog()` that displays a simple confirm dialog with OK/Cancel buttons and returns a `Promise<boolean>`.

## Requirements (Confirmed)

| Requirement | Decision |
|---|---|
| API style | Programmatic only — `await useDialog().confirm(...)` |
| Return value | `Promise<boolean>` — `true` for confirm, `false` for cancel |
| Parameters | `title: string`, `message?: string`, `options?: ConfirmOptions` |
| Button customization | `confirmLabel?`, `cancelLabel?`, `confirmTheme?: SemanticTheme` |
| Button defaults | i18n-managed (`confirm.confirm`, `confirm.cancel`) |
| X button | Hidden (`closable: false`) |
| ESC key | Disabled (`closeOnEscape: false`) |
| Backdrop click | Disabled (`closeOnBackdrop: false`) |
| Draggable | Disabled (`movable: false`) |
| Multiple confirms | Allowed to stack, same as `show()` |
| Placement | Added to `useDialog()` / `DialogContextValue` |

## API Interface

```typescript
// ConfirmOptions (added to Dialog.tsx)
export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTheme?: SemanticTheme;
}

// DialogContextValue.confirm (new method)
confirm(
  title: string,
  message?: string,
  options?: ConfirmOptions,
): Promise<boolean>;
```

### Usage Examples

```typescript
// Basic
const ok = await dialog.confirm("삭제하시겠습니까?");
if (ok) { /* delete */ }

// With message + danger theme
const ok = await dialog.confirm(
  "정말 삭제하시겠습니까?",
  "이 작업은 되돌릴 수 없습니다.",
  { confirmTheme: "danger", confirmLabel: "삭제" },
);
```

## Architecture

### Approach: ConfirmDialog internal component + DialogProvider.confirm()

`confirm()` is implemented internally using the existing `show()` infrastructure. This reuses z-index management, mount animation, Portal rendering, and all other dialog features at zero additional cost.

### Data Flow

```
useDialog().confirm(title, message?, options?)
  → DialogProvider.confirm()
  → show(ConfirmDialog, { message, confirmLabel, cancelLabel, confirmTheme }, options)
  → DialogProvider renders <Dialog> with <ConfirmDialog>
  → User clicks OK → props.close(true) → Promise resolves true
  → User clicks Cancel → props.close(false) → Promise resolves false
```

## Component Design

```tsx
// packages/solid/src/components/feedback/ConfirmDialog.tsx (internal, not exported)

interface ConfirmDialogProps {
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTheme?: SemanticTheme;
  close?: (result: boolean) => void;
}

const ConfirmDialog: Component<ConfirmDialogProps> = (props) => {
  const i18n = useI18n();

  return (
    <div class="flex flex-col gap-4 p-4 min-w-[18rem] max-w-[28rem]">
      <Show when={props.message}>
        <p class="text-sm text-base-600 dark:text-base-400">{props.message}</p>
      </Show>
      <div class="flex justify-end gap-2">
        <Button variant="outline" onClick={() => props.close?.(false)}>
          {props.cancelLabel ?? i18n.t("confirm.cancel")}
        </Button>
        <Button
          theme={props.confirmTheme ?? "primary"}
          variant="solid"
          onClick={() => props.close?.(true)}
        >
          {props.confirmLabel ?? i18n.t("confirm.confirm")}
        </Button>
      </div>
    </div>
  );
};
```

### DialogProvider.confirm() Implementation

```typescript
const confirm = (
  title: string,
  message?: string,
  options?: ConfirmOptions,
): Promise<boolean> => {
  return show(
    ConfirmDialog,
    {
      message,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      confirmTheme: options?.confirmTheme,
    },
    {
      header: title,
      closable: false,
      closeOnEscape: false,
      closeOnBackdrop: false,
      movable: false,
    },
  ).then((result) => result ?? false);
};
```

## i18n Keys

```typescript
// ko.ts
confirm: {
  confirm: "확인",
  cancel: "취소",
},

// en.ts
confirm: {
  confirm: "Confirm",
  cancel: "Cancel",
},
```

## Files to Change

| File | Change |
|---|---|
| `packages/solid/src/components/disclosure/Dialog.tsx` | Add `ConfirmOptions` interface; add `confirm()` to `DialogContextValue`; implement `confirm()` in `DialogProvider` |
| `packages/solid/src/components/feedback/ConfirmDialog.tsx` | New file (internal, not exported from `index.ts`) |
| `packages/solid/src/providers/i18n/locales/ko.ts` | Add `confirm` i18n keys |
| `packages/solid/src/providers/i18n/locales/en.ts` | Add `confirm` i18n keys |
