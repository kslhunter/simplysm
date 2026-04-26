# `SdFileDialogProvider`

> **읽어야 하는 상황**: 네이티브 파일 선택 대화상자를 열 때.

네이티브 파일 선택 대화상자 프로바이더.

```typescript
@Injectable({ providedIn: "root" })
class SdFileDialogProvider {
  async showAsync(multiple?: false, accept?: string): Promise<File | undefined>;
  async showAsync(multiple: true, accept?: string): Promise<File[] | undefined>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `showAsync(multiple?, accept?)` | method | overloaded | 파일 선택 대화상자 열기. `multiple=true`이면 `File[]`, 아니면 `File \| undefined` 반환 |

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `multiple` | `boolean \| undefined` | 다중 선택 여부 |
| `accept` | `string \| undefined` | 허용 파일 타입 (예: `"image/*"`, `".xlsx"`) |

## Usage

엑셀 파일 업로드 시 단일 파일을 선택받는 패턴:

```typescript
private readonly _sdFileDialog = inject(SdFileDialogProvider);

async onUploadExcelButtonClick(): Promise<void> {
  const file = await this._sdFileDialog.showAsync(false, ".xlsx");
  if (file == null) return;
  if (Array.isArray(file)) return;

  // file: File 객체
}
```
