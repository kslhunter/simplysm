# File Dialog

Utility for programmatically opening a native file picker dialog.

## `openFileDialog`

Open a file selection dialog by creating and clicking a hidden `<input type="file">` element. Returns the selected files or `undefined` if the dialog is cancelled.

```typescript
function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.accept` | `string` | `undefined` | File type filter (e.g., `".csv"`, `"image/*"`) |
| `options.multiple` | `boolean` | `false` | Allow selecting multiple files |

**Returns:** `Promise<File[] | undefined>` -- Selected files array, or `undefined` if cancelled or no files selected.
