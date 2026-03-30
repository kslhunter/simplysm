# Event Plugins

All event plugins are automatically registered by `provideSdAngular`.

## `SdOptionEventPlugin`

Adds `.capture`, `.passive`, `.once` modifiers to native DOM events in Angular templates.

```typescript
@Injectable({ providedIn: null })
class SdOptionEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;
  addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void;
}
```

Usage in template:
```html
<div (click.capture)="onCapture($event)"></div>
<div (scroll.passive)="onScroll($event)"></div>
<div (click.once)="onClickOnce($event)"></div>
<div (click.capture.once)="onCaptureOnce($event)"></div>
```

## `SdResizeEventPlugin`

Provides `(sdResize)` event binding via `ResizeObserver`.

```typescript
@Injectable({ providedIn: null })
class SdResizeEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;   // "sdResize"
  addEventListener(element: HTMLElement, eventName: string, handler: (entry: ISdResizeEvent) => void): () => void;
}
```

### `ISdResizeEvent`

| Field | Type | Description |
|-------|------|-------------|
| `heightChanged` | `boolean` | Whether height changed since last event |
| `widthChanged` | `boolean` | Whether width changed since last event |
| `target` | `Element` | The observed element |
| `contentRect` | `DOMRectReadOnly` | Content rectangle of the element |

## `SdIntersectionEventPlugin`

Provides `(sdIntersection)` event binding via `IntersectionObserver`.

```typescript
@Injectable({ providedIn: null })
class SdIntersectionEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;   // "sdIntersection"
  addEventListener(element: HTMLElement, eventName: string, handler: (entry: ISdIntersectionEvent) => void): () => void;
}
```

### `ISdIntersectionEvent`

| Field | Type | Description |
|-------|------|-------------|
| `entry` | `IntersectionObserverEntry` | The intersection observer entry |

## `SdSaveCommandEventPlugin`

Provides `(sdSaveCommand)` event binding that triggers on Ctrl+S. Respects modal stacking (only fires for the topmost open modal).

```typescript
@Injectable({ providedIn: null })
class SdSaveCommandEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;   // "sdSaveCommand"
  addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void;
}
```

## `SdRefreshCommandEventPlugin`

Provides `(sdRefreshCommand)` event binding that triggers on Ctrl+Alt+L. Respects modal stacking.

```typescript
@Injectable({ providedIn: null })
class SdRefreshCommandEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;   // "sdRefreshCommand"
  addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void;
}
```

## `SdInsertCommandEventPlugin`

Provides `(sdInsertCommand)` event binding that triggers on Ctrl+Insert. Respects modal stacking.

```typescript
@Injectable({ providedIn: null })
class SdInsertCommandEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;   // "sdInsertCommand"
  addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void;
}
```

## `SdGlobalErrorHandlerPlugin`

Global error handler implementing Angular's `ErrorHandler`. Handles `PromiseRejectionEvent`, `ErrorEvent`, `Error`, and unknown errors. Displays error overlay and destroys the application on unrecoverable errors.

```typescript
@Injectable({ providedIn: null })
class SdGlobalErrorHandlerPlugin implements ErrorHandler {
  handleError(event: any): false;
}
```
