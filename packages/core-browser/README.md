# @simplysm/core-browser

Simplysm package - Core module (browser)

## Installation

pnpm add @simplysm/core-browser

**Peer Dependencies:** none

## Source Index

### Extensions

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/extensions/element-ext.ts` | `ElementBounds`, `copyElement`, `pasteToElement`, `getBounds` | DOM clipboard operations and element bounds utilities | `element-ext.spec.ts` |
| `src/extensions/html-element-ext.ts` | _(HTMLElement prototype augmentation only)_ | Repaint, relative offset, and scroll-into-view helpers | `html-element-ext.spec.ts` |

### Utils

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/utils/download.ts` | `downloadBlob` | Trigger browser file download from a Blob | `download.spec.ts` |
| `src/utils/fetch.ts` | `DownloadProgress`, `fetchUrlBytes` | Fetch URL as Uint8Array with progress callback | - |
| `src/utils/file-dialog.ts` | `openFileDialog` | Open native file selection dialog programmatically | - |

## License

Apache-2.0
