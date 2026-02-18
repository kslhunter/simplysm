# Providers

## InitializeProvider

Root provider that wraps the entire application. Automatically sets up all required providers: configuration context, theme (dark/light/system), notification system with banner, global error capturing (window.onerror, unhandledrejection), busy overlay, programmatic dialog support, and form control clipboard value copy.

See the [Configuration](../README.md#configuration) section in the main README for setup instructions and `AppConfig` options.

---

## ServiceClientProvider

WebSocket client provider for RPC communication with `@simplysm/service-server`. Wraps `ServiceClient` from `@simplysm/service-client`. Provides `useServiceClient` hook to components.

`ServiceClientProvider` takes no props. After mounting, use `useServiceClient()` to connect, close, and access client instances by key.

```tsx
import { ServiceClientProvider, useServiceClient } from "@simplysm/solid";

// Wrap your app
<ServiceClientProvider>
  <App />
</ServiceClientProvider>

// In a component
function App() {
  const client = useServiceClient();

  onMount(async () => {
    await client.connect("main", { host: "localhost", port: 3000, ssl: false });
  });

  onCleanup(async () => {
    await client.close("main");
  });

  const handleCall = async () => {
    const svc = client.get("main");
    const result = await svc.call("MyService", "myMethod", [arg1, arg2]);
  };
}
```

**useServiceClient API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `(key: string, options?: Partial<ServiceConnectionConfig>) => Promise<void>` | Open WebSocket connection |
| `close` | `(key: string) => Promise<void>` | Close connection by key |
| `get` | `(key: string) => ServiceClient` | Get connected client by key (throws if not connected) |
| `isConnected` | `(key: string) => boolean` | Check connection state |

`ServiceConnectionConfig`: `{ host: string; port: number; ssl: boolean }`

Defaults for `host`, `port`, and `ssl` are derived from `window.location` when omitted.

---

## SharedDataProvider

Shared data provider for managing server-side data subscriptions. Works with `ServiceClientProvider` to provide reactive shared data across components via `useSharedData`.

```tsx
import { SharedDataProvider, type SharedDataDefinition } from "@simplysm/solid";

interface MySharedData {
  users: UserRecord;
  products: ProductRecord;
}

const definitions: { [K in keyof MySharedData]: SharedDataDefinition<MySharedData[K]> } = {
  users: {
    serviceKey: "main",
    fetch: async (changeKeys) => fetchUsers(changeKeys),
    getKey: (item) => item.id,
    orderBy: [(item) => item.name, "asc"],
  },
  products: {
    serviceKey: "main",
    fetch: async (changeKeys) => fetchProducts(changeKeys),
    getKey: (item) => item.id,
    orderBy: [(item) => item.name, "asc"],
  },
};

<SharedDataProvider definitions={definitions}>
  <App />
</SharedDataProvider>
```

**SharedDataProvider Props:**

| Prop | Type | Description |
|------|------|-------------|
| `definitions` | `{ [K in keyof TSharedData]: SharedDataDefinition<TSharedData[K]> }` | Map of data key to fetch definition |

**SharedDataDefinition type:**

```typescript
interface SharedDataDefinition<TData> {
  serviceKey: string;                                           // Connection key (matches useServiceClient key)
  fetch: (changeKeys?: Array<string | number>) => Promise<TData[]>; // Data fetch function
  getKey: (item: TData) => string | number;                    // Primary key extractor
  orderBy: [(item: TData) => unknown, "asc" | "desc"][];       // Sort order
  filter?: unknown;                                             // Optional filter for change events
}
```

**useSharedData API:**

```tsx
import { useSharedData } from "@simplysm/solid";

function MyComponent() {
  const sharedData = useSharedData<MySharedData>();

  const users = () => sharedData.users.items();           // Accessor<TData[]>
  const user = () => sharedData.users.get(userId());      // TData | undefined

  const handleUpdate = async () => {
    await sharedData.users.emit([updatedUserId]);          // trigger refetch for keys
  };
}
```

**SharedDataAccessor API:**

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `items` | `Accessor<TData[]>` | Reactive item array |
| `get` | `(key: string \| number \| undefined) => TData \| undefined` | Get item by key |
| `emit` | `(changeKeys?: Array<string \| number>) => Promise<void>` | Emit change event to server (triggers refetch in all subscribers) |

**SharedDataValue extras:**

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `wait` | `() => Promise<void>` | Wait until all initial fetches complete |
| `busy` | `Accessor<boolean>` | True while any fetch is in progress |

**SharedDataChangeEvent:**

`SharedDataChangeEvent` is the event definition used internally by `SharedDataProvider` to communicate data changes between server and clients. Export it if you need to emit changes from the server side.

```typescript
import { SharedDataChangeEvent } from "@simplysm/solid";
```
