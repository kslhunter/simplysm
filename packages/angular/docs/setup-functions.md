# Setup Functions

Setup functions are called inside component/directive constructors (within injection context). They use `inject()` internally.

## `setupBgTheme`

Sets the body `--background-color` CSS variable based on theme. Cleans up on destroy.

```typescript
function setupBgTheme(options?: {
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
  lightness?: "lightest" | "lighter";
}): void;
```

## `setupRipple`

Adds a material-style ripple effect to the host element on pointer interaction.

```typescript
function setupRipple(enableFn?: () => boolean): void;
```

- `enableFn`: Optional function that returns whether ripple is active. Called on each pointer down.

## `setupRevealOnShow`

Animates element visibility when it enters the viewport using IntersectionObserver. Applies opacity and transform transitions.

```typescript
function setupRevealOnShow(
  optFn?: () => {
    type?: "l2r" | "t2b";
    enabled?: boolean;
  },
): void;
```

## `setupInvalid`

Adds form validation indicator to the host element. Creates a hidden input element for validity tracking and shows a red dot indicator when invalid.

```typescript
function setupInvalid(getInvalidMessage: () => string): void;
```

- `getInvalidMessage`: Returns the validation error message. Return empty string `""` for valid state.

## `setupModelHook`

Intercepts a writable signal's `set` method with an async guard function. If the guard returns `false` or a promise resolving to `false`, the set is prevented.

```typescript
function setupModelHook<T, S extends WritableSignal<T>>(
  model: S,
  canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void;
```

## `setupCanDeactivate`

Registers a route or modal can-deactivate guard. When inside a modal, sets `SdActivatedModalProvider.canDeactiveFn`. When inside a route, pushes a `CanDeactivateFn` to the route config.

```typescript
function setupCanDeactivate(fn: () => boolean): void;
```
