# @simplysm/core-browser

> Simplysm package - Core module (browser)

Browser-specific utilities for DOM manipulation, file handling, HTTP fetching, and IndexedDB storage. This package extends native `Element` and `HTMLElement` prototypes with convenience methods and provides standalone utility functions for common browser tasks.

## Installation

```bash
npm install @simplysm/core-browser
```

**Peer dependency:** `@simplysm/core-common`

## Side Effects

This package includes side-effect imports that augment global prototypes. The following modules execute on import:

- `extensions/element-ext` -- extends `Element.prototype`
- `extensions/html-element-ext` -- extends `HTMLElement.prototype`

## Documentation

| Category | Description | File |
|----------|-------------|------|
| Element Extensions | `Element` prototype methods and clipboard/bounds helpers | [docs/element-extensions.md](docs/element-extensions.md) |
| HTMLElement Extensions | `HTMLElement` prototype methods for layout and scrolling | [docs/html-element-extensions.md](docs/html-element-extensions.md) |
| Utilities | File download, fetch with progress, file dialog | [docs/utilities.md](docs/utilities.md) |
| IndexedDB | IndexedDB store wrapper and virtual filesystem | [docs/indexed-db.md](docs/indexed-db.md) |
