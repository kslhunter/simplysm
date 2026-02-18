# Providers

## InitializeProvider

Root provider that wraps the entire application. Automatically sets up all required providers: configuration context, theme (dark/light/system), notification system with banner, global error capturing (window.onerror, unhandledrejection), busy overlay, and programmatic dialog support.

See [Getting Started](getting-started.md#provider-setup) for setup instructions and `AppConfig` options.

---

## ServiceClientProvider

WebSocket client provider for RPC communication with `@simplysm/service-server`. Wraps `ServiceClient` from `@simplysm/service-client`.

```tsx
import { ServiceClientProvider } from "@simplysm/solid";

<ServiceClientProvider url="ws://localhost:3000">
  <App />
</ServiceClientProvider>
```

---

## SharedDataProvider

Shared data provider for managing server-side data subscriptions. Works with `ServiceClientProvider` to provide reactive shared data across components.

```tsx
import { SharedDataProvider, SharedDataChangeEvent } from "@simplysm/solid";

<SharedDataProvider>
  <App />
</SharedDataProvider>
```
