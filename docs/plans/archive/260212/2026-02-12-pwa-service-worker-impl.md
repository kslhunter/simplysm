# PWA Service Worker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add always-on PWA support (precaching, installability, update notification) to all client packages via `vite-plugin-pwa` and a SolidJS hook.

**Architecture:** `sd-cli`'s Vite config adds `VitePWA()` plugin for all client builds (build-time SW + manifest generation). `@simplysm/solid`'s `InitializeProvider` internally calls `createPwaUpdate()` hook that detects SW updates and shows a notification via existing `NotificationProvider`. No app-level code needed.

**Tech Stack:** vite-plugin-pwa (Workbox), standard ServiceWorker API, existing `@simplysm/solid` Notification system

---

### Task 1: Add `vite-plugin-pwa` dependency to sd-cli

**Files:**
- Modify: `packages/sd-cli/package.json`

**Step 1: Install dependency**

Run: `cd /home/kslhunter/projects/simplysm && pnpm add vite-plugin-pwa -w --filter @simplysm/sd-cli`

**Step 2: Verify installation**

Run: `cat packages/sd-cli/package.json | grep vite-plugin-pwa`
Expected: `"vite-plugin-pwa": "^X.Y.Z"` in dependencies

**Step 3: Commit**

```bash
git add packages/sd-cli/package.json pnpm-lock.yaml
git commit -m "chore(sd-cli): add vite-plugin-pwa dependency"
```

---

### Task 2: Add `VitePWA()` plugin to Vite config

**Files:**
- Modify: `packages/sd-cli/src/utils/vite-config.ts`

**Step 1: Add VitePWA import and plugin**

At the top of the file, add:
```typescript
import { VitePWA } from "vite-plugin-pwa";
```

In `createViteConfig()`, read `package.json` to extract the app name, then add `VitePWA()` to the plugins array.

The plugin config:
```typescript
VitePWA({
  registerType: "prompt",
  injectRegister: "script",
  manifest: {
    name: appName,
    short_name: appName,
    display: "standalone",
    theme_color: "#ffffff",
    background_color: "#ffffff",
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
  },
})
```

Key details:
- `registerType: "prompt"` — SW waits for user action, no auto-reload
- `injectRegister: "script"` — plugin injects a `<script>` tag in HTML that registers SW with the correct `base` path
- `appName` derived from `package.json` `name` field (strip scope like `@myapp/`)
- Dev mode: plugin disables SW by default (`devOptions.enabled` defaults to `false`), so safe to include always

Read `package.json` name:
```typescript
const pkgJsonPath = path.join(pkgDir, "package.json");
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as { name: string };
const appName = pkgJson.name.replace(/^@[^/]+\//, "");
```

Note: This uses `fs` and `path` which are already imported in the file.

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/sd-cli/src/utils/vite-config.ts
git commit -m "feat(sd-cli): add VitePWA plugin to client Vite config"
```

---

### Task 3: Create `createPwaUpdate` hook

**Files:**
- Create: `packages/solid/src/hooks/createPwaUpdate.ts`

**Step 1: Write the hook**

```typescript
import { onCleanup } from "solid-js";
import { useNotification } from "../components/feedback/notification/NotificationContext";

const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * PWA Service Worker update detection hook.
 *
 * Polls for SW updates every 5 minutes. When a new version is detected,
 * shows a notification with a reload action via the Notification system.
 *
 * No-ops gracefully when:
 * - `navigator.serviceWorker` is unavailable (HTTP, unsupported browser)
 * - No service worker is registered (dev mode, tests)
 *
 * Must be called inside NotificationProvider.
 */
export function createPwaUpdate(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const notification = useNotification();
  let intervalId: ReturnType<typeof setInterval> | undefined;

  void navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration == null) return;

    // Periodic update check
    intervalId = setInterval(() => {
      void registration.update();
    }, UPDATE_INTERVAL);

    // Already waiting SW
    if (registration.waiting != null) {
      promptUpdate(registration.waiting);
    }

    // Detect new SW installation
    registration.addEventListener("updatefound", () => {
      const newSW = registration.installing;
      if (newSW == null) return;

      newSW.addEventListener("statechange", () => {
        if (newSW.state === "installed" && navigator.serviceWorker.controller != null) {
          promptUpdate(newSW);
        }
      });
    });
  });

  // Reload when new SW takes control
  const onControllerChange = () => {
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

  onCleanup(() => {
    if (intervalId != null) {
      clearInterval(intervalId);
    }
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  });

  function promptUpdate(waitingSW: ServiceWorker): void {
    notification.info("앱이 업데이트되었습니다", "새로고침하면 최신 버전을 사용할 수 있습니다", {
      action: {
        label: "새로고침",
        onClick: () => {
          waitingSW.postMessage({ type: "SKIP_WAITING" });
        },
      },
    });
  }
}
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: No errors (uses standard ServiceWorker API types which are available in browser target tsconfig)

**Step 3: Commit**

```bash
git add packages/solid/src/hooks/createPwaUpdate.ts
git commit -m "feat(solid): add createPwaUpdate hook for PWA update detection"
```

---

### Task 4: Wire `createPwaUpdate` into `InitializeProvider`

**Files:**
- Modify: `packages/solid/src/providers/InitializeProvider.tsx`

**Step 1: Add PwaUpdater component and render inside NotificationProvider**

Import:
```typescript
import { createPwaUpdate } from "../hooks/createPwaUpdate";
```

Add a small component (before `InitializeProvider`):
```typescript
/** Runs PWA update detection inside NotificationProvider context */
function PwaUpdater() {
  createPwaUpdate();
  return null;
}
```

Place `<PwaUpdater />` inside `<NotificationProvider>`, after `<NotificationBanner />`:
```tsx
<NotificationProvider>
  <NotificationBanner />
  <PwaUpdater />
  <LoadingProvider variant={props.config.loadingVariant}>
    ...
  </LoadingProvider>
</NotificationProvider>
```

This ensures `useNotification()` works because `PwaUpdater` is a child of `NotificationProvider`.

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/solid/src/providers/InitializeProvider.tsx
git commit -m "feat(solid): wire createPwaUpdate into InitializeProvider"
```

---

### Task 5: Export `createPwaUpdate` from index

**Files:**
- Modify: `packages/solid/src/index.ts`

**Step 1: Add export**

In the `// hooks` section, add:
```typescript
export { createPwaUpdate } from "./hooks/createPwaUpdate";
```

This allows apps that don't use `InitializeProvider` to call the hook directly.

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/solid`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): export createPwaUpdate from index"
```

---

### Task 6: Verify build output

**Step 1: Build solid-demo**

Run: `pnpm build solid-demo`
Expected: Build succeeds

**Step 2: Verify SW files in output**

Run: `ls packages/solid-demo/dist/sw.js packages/solid-demo/dist/manifest.webmanifest`
Expected: Both files exist

**Step 3: Verify manifest content**

Run: `cat packages/solid-demo/dist/manifest.webmanifest`
Expected: JSON with `name: "solid-demo"`, `display: "standalone"`

**Step 4: Verify index.html has SW registration script**

Run: `grep -c "serviceWorker" packages/solid-demo/dist/index.html`
Expected: At least 1 match (the injected registration script)

**Step 5: Verify index.html has manifest link**

Run: `grep -c "manifest" packages/solid-demo/dist/index.html`
Expected: At least 1 match (`<link rel="manifest">`)

---

### Task 7: Final lint and typecheck

**Step 1: Full typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 2: Full lint**

Run: `pnpm lint packages/sd-cli packages/solid`
Expected: No errors (fix any issues if found)

**Step 3: Final commit (if lint fixes needed)**

```bash
git add -A
git commit -m "chore: fix lint issues"
```
