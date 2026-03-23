# Core - Plugins

## Command Event Plugins

These plugins register global keyboard shortcuts that can be listened to via Angular's event binding syntax. All command plugins are modal-aware: when a modal is open, the command only fires for elements inside the topmost modal.

### SdSaveCommandEventPlugin

**Type:** `@Injectable` (EventManagerPlugin) | **Event name:** `sdSaveCommand`

Listens for **Ctrl+S** and dispatches a save command event.

```html
<div (sdSaveCommand)="onSave()">...</div>
```

---

### SdRefreshCommandEventPlugin

**Type:** `@Injectable` (EventManagerPlugin) | **Event name:** `sdRefreshCommand`

Listens for **Ctrl+Alt+L** and dispatches a refresh command event.

```html
<div (sdRefreshCommand)="onRefresh()">...</div>
```

---

### SdInsertCommandEventPlugin

**Type:** `@Injectable` (EventManagerPlugin) | **Event name:** `sdInsertCommand`

Listens for **Ctrl+Insert** and dispatches an insert command event.

```html
<div (sdInsertCommand)="onInsert()">...</div>
```

---

## Event Plugins

### SdBackbuttonEventPlugin

> **Deprecated**

**Type:** `@Injectable` (EventManagerPlugin) | **Event name:** `sdBackbutton`

Handles hardware/software back button events. Supports Capacitor `@capacitor/app` back button, Cordova `backbutton` event, and **Alt+Left Arrow** keyboard shortcut.

---

### SdIntersectionEventPlugin

**Type:** `@Injectable` (EventManagerPlugin) | **Event name:** `sdIntersection`

Wraps `IntersectionObserver` as an Angular event. Fires when the element's intersection state changes.

```html
<div (sdIntersection)="onIntersection($event)">...</div>
```

#### ISdIntersectionEvent

```typescript
interface ISdIntersectionEvent {
  entry: IntersectionObserverEntry;
}
```

---

### SdOptionEventPlugin

**Type:** `@Injectable` (EventManagerPlugin)

Enables `.capture`, `.passive`, and `.once` modifiers on native DOM events in Angular templates. Supports any event that exists on `window`, `document`, or `HTMLElement.prototype`.

```html
<div (scroll.passive)="onScroll($event)">...</div>
<div (click.capture)="onClickCapture($event)">...</div>
<div (transitionend.once)="onTransitionEnd($event)">...</div>
```

---

### SdResizeEventPlugin

**Type:** `@Injectable` (EventManagerPlugin) | **Event name:** `sdResize`

Wraps `ResizeObserver` and `IntersectionObserver` as an Angular event. Fires when the element's size changes, with debouncing via `requestAnimationFrame`.

```html
<div (sdResize)="onResize($event)">...</div>
```

#### ISdResizeEvent

```typescript
interface ISdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: Element;
  contentRect: DOMRectReadOnly;
}
```

---

## SdGlobalErrorHandlerPlugin

**Type:** `@Injectable` (implements `ErrorHandler`)

Global error handler that catches unhandled errors and promise rejections. Handles:
- `PromiseRejectionEvent` (unhandled promise rejections)
- `ErrorEvent` (uncaught errors)
- `Error` objects

On error, it:
1. Logs the error via `SdSystemLogProvider`
2. Destroys the `ApplicationRef`
3. Displays a full-screen error overlay with error details
4. Clicking the overlay reloads the page (in production, resets to `/` first)
