# InitializeProvider Consolidation Design

## Summary

Consolidate root-level providers (Theme, Notification, Dialog, Loading) into `InitializeProvider` as an orchestrator. This eliminates boilerplate nesting in every app's root component while preserving individual provider implementations.

## Motivation

Every app using `@simplysm/solid` must manually nest the same 5 providers in the correct order:

```tsx
<InitializeProvider config={...}>
  <ThemeProvider>
    <NotificationProvider>
      <NotificationBanner />
      <DialogProvider>
        {children}
      </DialogProvider>
    </NotificationProvider>
  </ThemeProvider>
</InitializeProvider>
```

This is repetitive boilerplate with a fixed dependency order.

## Design

### Approach: Orchestrator Pattern

`InitializeProvider` becomes a **conductor** that composes individual providers internally. Each provider file remains unchanged — only the orchestration is centralized.

### Providers to Consolidate

| Provider | Reason |
|---|---|
| ThemeProvider | Always required at root |
| NotificationProvider | Always required at root |
| DialogProvider | Always required at root |
| LoadingProvider (root) | Root-level loading overlay |

### Providers NOT Consolidated

| Provider | Reason |
|---|---|
| ServiceClientProvider | Optional, needs connection config, page-level |
| SharedDataProvider | Needs generic type params + definitions, feature-level |
| LoadingContainer | Scoped area loading, independent component |

### AppConfig Change

```typescript
// ConfigContext.ts
export interface AppConfig {
  clientName: string;
  storage?: StorageAdapter;
  loadingVariant?: "spinner" | "bar";  // NEW
}
```

### InitializeProvider Implementation

```tsx
// InitializeProvider.tsx
export const InitializeProvider: ParentComponent<{ config: AppConfig }> = (props) => {
  useClipboardValueCopy();

  return (
    <ConfigContext.Provider value={props.config}>
      <ThemeProvider>
        <NotificationProvider>
          <NotificationBanner />
          <LoadingProvider variant={props.config.loadingVariant}>
            <DialogProvider>
              {props.children}
            </DialogProvider>
          </LoadingProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ConfigContext.Provider>
  );
};
```

### Export Changes (index.ts)

**Remove from export:**
- `ThemeProvider` (component — from `ThemeContext.tsx`)
- `NotificationProvider` (component)
- `DialogProvider` (component)
- `LoadingProvider` (component)
- `NotificationBanner` (auto-rendered by InitializeProvider)

**Keep exported:**
- All hooks: `useTheme()`, `useNotification()`, `useLoading()`, `useDialog()`
- All types/contexts: `ThemeMode`, `ResolvedTheme`, `NotificationContext`, `DialogContext`, `LoadingContext`, etc.
- `LoadingContainer` (scoped area loading)
- `NotificationBell` (UI component used in pages)

### Usage After Change

```tsx
// App.tsx (before)
<InitializeProvider config={{ clientName: "demo" }}>
  <ThemeProvider>
    <NotificationProvider>
      <NotificationBanner />
      <DialogProvider>{children}</DialogProvider>
    </NotificationProvider>
  </ThemeProvider>
</InitializeProvider>

// App.tsx (after)
<InitializeProvider config={{ clientName: "demo" }}>
  {children}
</InitializeProvider>
```

## Files to Modify

| File | Change |
|---|---|
| `packages/solid/src/providers/ConfigContext.ts` | Add `loadingVariant` to `AppConfig` |
| `packages/solid/src/providers/InitializeProvider.tsx` | Compose all 4 providers + NotificationBanner |
| `packages/solid/src/index.ts` | Remove individual provider exports |
| `packages/solid-demo/src/App.tsx` | Simplify to InitializeProvider only |
| `packages/sd-cli/templates/add-client/__CLIENT__/src/App.tsx.hbs` | Simplify template |

## Nesting Order (inside InitializeProvider)

```
ConfigContext.Provider
  └─ ThemeProvider          (depends on ConfigContext for usePersisted)
      └─ NotificationProvider
          ├─ NotificationBanner
          └─ LoadingProvider  (independent, but inside Notification for future integration)
              └─ DialogProvider
                  └─ {children}
```
