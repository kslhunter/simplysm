# Event

## SdServiceEventClient

Manages server-sent event listener registration, removal, emission, and automatic re-registration on reconnect. Used internally by `SdServiceClient` but can also be accessed directly.

### Constructor

```typescript
constructor(private readonly _transport: SdServiceTransport)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `_transport` | `SdServiceTransport` | The transport layer used to send event commands to the server |

### Methods

#### `addListenerAsync(eventListenerType, info, cb)`

```typescript
async addListenerAsync<T extends SdServiceEventListenerBase<any, any>>(
  eventListenerType: Type<T>,
  info: T["info"],
  cb: (data: T["data"]) => PromiseLike<void>,
): Promise<string>
```

Registers an event listener with the server. Returns a unique UUID key used for removal.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventListenerType` | `Type<T>` | Event listener class (extends `SdServiceEventListenerBase`) |
| `info` | `T["info"]` | Subscription filter info |
| `cb` | `(data: T["data"]) => PromiseLike<void>` | Callback invoked when the event fires |

**Returns:** `Promise<string>` -- unique listener key.

#### `removeListenerAsync(key)`

```typescript
async removeListenerAsync(key: string): Promise<void>
```

Removes a previously registered event listener from both the server and the local listener map.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Listener key returned from `addListenerAsync` |

#### `emitAsync(eventType, infoSelector, data)`

```typescript
async emitAsync<T extends SdServiceEventListenerBase<any, any>>(
  eventType: Type<T>,
  infoSelector: (item: T["info"]) => boolean,
  data: T["data"],
): Promise<void>
```

Queries the server for all matching event listeners and emits the event to them.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | `Type<T>` | Event listener class |
| `infoSelector` | `(item: T["info"]) => boolean` | Filter function to select target listeners |
| `data` | `T["data"]` | Event payload |

#### `reRegisterAllAsync()`

```typescript
async reRegisterAllAsync(): Promise<void>
```

Re-registers all locally stored event listeners with the server. Called automatically on reconnect to restore event subscriptions.
