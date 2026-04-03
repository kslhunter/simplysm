# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/capacitor-plugin-intent` -- Android intent plugin. Provides broadcast send/receive, launch intent retrieval, new intent event listening, and `startActivityForResult`. Designed for industrial device integration (barcode scanners, PDA devices, etc.). 4 TypeScript source files.

No external dependencies (`@capacitor/core` is the only peerDependency).

## Architecture

```
src/
├── IntentPlugin.ts    ← Capacitor plugin interface and types (IntentResult, IntentPlugin, etc.)
├── Intent.ts          ← Plugin registration and static facade class
├── web/
│   └── IntentWeb.ts   ← Browser fallback (extends WebPlugin, returns stubs)
└── index.ts           ← public API re-exports
android/
└── src/main/kotlin/kr/co/simplysm/capacitor/intent/
    └── IntentPlugin.kt ← Android native implementation (Kotlin)
tests/
├── intent-rename.spec.ts            ← IntentWeb stub behavior verification
└── start-activity-for-result.spec.ts ← startActivityForResult web fallback verification
```

## Key Patterns

### Layer Structure

The plugin always consists of 3 layers:

1. **`*Plugin.ts`** -- Capacitor plugin interface and types only (no logic)
2. **`*.ts` (facade)** -- Registers the plugin via `registerPlugin()` and exposes static methods through an `abstract class`
3. **`web/*.ts`** -- Browser fallback that extends `WebPlugin`

```typescript
// 1. Plugin interface (IntentPlugin.ts)
export interface IntentPlugin {
  subscribe(options: { filters: string[] }, callback: (result: IntentResult) => void): Promise<{ id: string }>;
  startActivityForResult(options: StartActivityForResultOptions): Promise<StartActivityForResultResult>;
}

// 2. Facade (Intent.ts)
const intentPlugin = registerPlugin<IntentPlugin>("Intent", {
  web: async () => {
    const { IntentWeb } = await import("./web/IntentWeb");
    return new IntentWeb();
  },
});

export abstract class Intent {
  static async subscribe(
    filters: string[],
    callback: (result: IntentResult) => void,
  ): Promise<() => Promise<void>> {
    const { id } = await intentPlugin.subscribe({ filters }, (result) => {
      if (result.action != null) { callback(result); } // filters out initial resolve
    });
    return async () => { await intentPlugin.unsubscribe({ id }); };
  }
}
```

### subscribe/unsubscribe Return Pattern

`Intent.subscribe()` returns an unsubscribe function. It wraps the plugin-level `{ id }` return value so that callers do not need to manage IDs directly.

```typescript
const unsub = await Intent.subscribe(["com.symbol.datawedge.api.RESULT_ACTION"], (result) => {
  // process result.extras
});
// unsubscribe
await unsub();
```

### Initial Resolve Filtering

The `subscribe()` callback filters initial resolve (response containing only `id`) with the `result.action != null` condition. Removing this condition causes an extra empty callback invocation.

### Browser Fallback (Stubs)

`IntentWeb` returns no-op or stub values for all methods. Since these are Android-only features, the browser fallback does not emulate actual behavior.

- `subscribe()` -- returns `{ id: "web-stub" }`
- `getLaunchIntent()` -- returns `{}`
- `startActivityForResult()` -- returns `{ resultCode: 0 }`
- `send()`, `unsubscribe()`, `unsubscribeAll()` -- warning log or no-op

## Android Native

- File: `android/src/main/kotlin/kr/co/simplysm/capacitor/intent/IntentPlugin.kt`
- `subscribe()`: `RETURN_CALLBACK` type method. Calls `call.setKeepAlive(true)` to maintain the callback, and issues a receiver ID via `UUID`. On Android 13+ (TIRAMISU) and above, the `RECEIVER_EXPORTED` flag must be specified.
- `startActivityForResult()`: Registers `handleActivityResult()` as callback via `@ActivityCallback`.
- `handleOnDestroy()`: Cleans up all registered BroadcastReceivers. This logic must be maintained to prevent resource leaks.
- `handleOnNewIntent()`: Fires `"newIntent"` event to listeners when the activity receives a new intent.
- `populateExtras()`: Converts `String`, `Int`, `Long`, `Double`, `Boolean`, `JSONArray`, `JSONObject` to Intent extras. `JSONObject` is nested-converted to a `Bundle`.
- `bundleToJson()`: Converts Bundle to JSON, handling `String`, `Int`, `Long`, `Double`, `Float` (converted to Double), `Boolean`, `Bundle` (recursive), `Array<String>`, `Array<Parcelable>`, `IntArray`, and `Parcelable` (toString fallback).

## Testing

**Framework**: Vitest

Tests are in the `tests/` directory and verify only web fallback (`IntentWeb`) behavior. Android native code is not covered by unit tests.

```typescript
import { IntentWeb } from "../src/web/IntentWeb";

describe("Feature 1.1", () => {
  it("IntentWeb.subscribe returns web-stub id", async () => {
    const web = new IntentWeb();
    const result = await web.subscribe({ filters: ["test.ACTION"] }, () => {});
    expect(result.id).toBe("web-stub");
  });
});
```

Test filename pattern: `{feature-description}.spec.ts`

## Compiler Settings (Package-Specific)

`tsconfig.json` has `"lib": ["ESNext", "DOM", "DOM.Iterable"]`. DOM lib is required because the plugin uses Capacitor DOM types such as `PluginListenerHandle`.
