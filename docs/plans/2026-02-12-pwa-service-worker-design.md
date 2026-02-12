# PWA / Service Worker Support Design

## Background

The legacy Angular-based `sd-cli` used `@angular/service-worker` (NGSW) for:
- App update detection with user-prompted reload (5-min polling)
- Static asset precaching for faster revisits
- PWA installability (address bar install button)

The current SolidJS + Vite architecture has no PWA support. This design adds it at the framework level.

## Design Decisions

### Always-on PWA
- No `pwa` config option — PWA is always enabled for all client packages
- On non-HTTPS origins, the browser silently ignores service worker registration (no harm)
- In dev mode, `vite-plugin-pwa` disables the service worker by default

### vite-plugin-pwa (Workbox-based)
- Chosen over custom Workbox implementation for Vite ecosystem compatibility and maintenance
- Handles manifest generation, service worker generation, and update detection

### Update notification via existing Notification system
- Uses `@simplysm/solid`'s `useNotification().info()` with an action button ("Reload")
- Replaces legacy `window.confirm()` approach
- Polling interval: 5 minutes (same as legacy)

## Architecture

### Build-time (sd-cli)
- `vite-config.ts`: Add `VitePWA()` plugin for all client targets
- Default manifest values derived from `package.json` name and `public/favicon.ico`
- Precache strategy: all build assets
- Update type: `prompt` (no auto-reload)

### Runtime (@simplysm/solid)
- New hook: `createPwaUpdate()` — registers SW, polls for updates, fires notification
- Gracefully no-ops when SW is unsupported (HTTP, unsupported browser)
- Must be called inside `NotificationProvider`

## File Changes

### sd-cli
| File | Change |
|------|--------|
| `package.json` | Add `vite-plugin-pwa` dependency |
| `src/utils/vite-config.ts` | Add `VitePWA()` plugin with default config |

### @simplysm/solid
| File | Change |
|------|--------|
| `src/hooks/createPwaUpdate.ts` | New file — SW registration + update detection + notification |
| `src/index.ts` | Export `createPwaUpdate` |

### No changes needed
- Individual app `index.html` (plugin auto-injects manifest link)
- Existing Notification system (used as-is)
- `sd-config.types.ts` (no new config option)

## App Usage

```typescript
// App.tsx
import { createPwaUpdate } from "@simplysm/solid";

function App() {
  createPwaUpdate(); // One line — that's it
  return <Router>...</Router>;
}
```

## Default Manifest

```json
{
  "name": "<from package.json>",
  "short_name": "<from package.json>",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "icons": [{ "src": "favicon.ico" }]
}
```

## Caching Strategy

- **Precache**: All build output (JS, CSS, HTML, assets) — cached on install
- **Runtime**: No API caching (apps handle their own data fetching via WebSocket)
- **Update**: New SW waits until user accepts reload via notification
