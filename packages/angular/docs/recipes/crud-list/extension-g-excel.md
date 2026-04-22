← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 G: 엑셀 업로드/다운로드

> **선행:** [확장 A: inline 편집/저장](./extension-a-inline-edit.md) (`_upsertItem` / 중복 검사 / 감사 로그 재사용)

`SdFileDialogProvider`로 파일 선택, `ExcelWrapper`(@simplysm/excel) + `zod` 스키마로 읽기/쓰기. 다운로드는 `_search(false)`로 **전체 페이지 조회** 후 `@simplysm/core-browser`의 `downloadBlob`으로 내려받는다. 확장 A(`_upsertItem` / 중복 검사 / 감사 로그)를 전제로 한다 — 업로드된 각 행을 일관된 경로로 upsert하기 때문.

**이 확장이 도입하는 요소:**

- **imports:** `SdFileDialogProvider`, `DateTime`, `downloadBlob`(@simplysm/core-browser), `ExcelWrapper`(@simplysm/excel), `z`(zod), `tablerFileExcel`, `tablerUpload`
- **DI:** `SdFileDialogProvider`
- **필드:** `_excelWrapper` (zod 스키마로 컬럼 정의)
- **메서드:** `onDownloadExcelButtonClick`, `onUploadExcelButtonClick`
- **템플릿:** page 뷰 topbar에 엑셀 다운로드/업로드 버튼 추가

<!-- MOVE: docs/providers.md#sdfiledialogprovider --> → [`SdFileDialogProvider.showAsync` Usage](../../providers/sd-file-dialog-provider.md#usage) 참조

```typescript
// 1) imports 추가
import { tablerFileExcel, tablerUpload } from "@ng-icons/tabler-icons";
import { SdFileDialogProvider } from "@simplysm/angular";
import { DateTime } from "@simplysm/core-common";
import { downloadBlob } from "@simplysm/core-browser";
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

// 2) DI 추가
private readonly _sdFileDialog = inject(SdFileDialogProvider);

// 3) 클래스 필드 — 아이콘 + ExcelWrapper (zod 스키마로 컬럼 정의)
protected readonly tablerFileExcel = tablerFileExcel;
protected readonly tablerUpload = tablerUpload;

private readonly _excelWrapper = new ExcelWrapper(
  z.object({
    id: z.number().optional().describe("ID"),
    name: z.string().describe("이름"),
    phone: z.string().optional().describe("전화번호"),
    categoryId: z.number().optional().describe("카테고리.ID"),
    isDeleted: z.boolean().describe("삭제"),
    lastModifiedAt: z.custom<DateTime>().optional().describe("최종수정일시"),
    lastModifiedBy: z.string().optional().describe("최종수정자"),
  }),
);

// 4) template — page 뷰 topbar에 엑셀 버튼 2개 추가
`
<sd-topbar>
  <!-- 기존 "새로고침" / "저장" 버튼 옆 -->
  <sd-button [theme]="'link-success'" (click)="onDownloadExcelButtonClick()">
    <ng-icon [svg]="tablerFileExcel" />
    엑셀 다운로드
  </sd-button>
  @if (canEdit()) {
    <sd-button [theme]="'link-success'" (click)="onUploadExcelButtonClick()">
      <ng-icon [svg]="tablerUpload" />
      엑셀 업로드
    </sd-button>
  }
</sd-topbar>
`

// 5) 메서드 추가
async onDownloadExcelButtonClick(): Promise<void> {
  if (this.busyCount() > 0) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 전체 조회 (페이지네이션 없이) — 확장 A의 _search를 그대로 재사용
    const r = await this._search(false);
    const wb = await this._excelWrapper.write(this.viewTitle(), r.items);
    try {
      downloadBlob(
        await wb.toBlob(),
        `${this.viewTitle()}_${new DateTime().toFormatString("yyMMdd")}.xlsx`,
      );
    } finally {
      await wb.close();
    }
  });
  this.busyCount.update((v) => v - 1);
}

async onUploadExcelButtonClick(): Promise<void> {
  const file = await this._sdFileDialog.showAsync(false, ".xlsx");
  if (file == null) return;
  if (Array.isArray(file)) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    const excelItems = await this._excelWrapper.read(file);
    const changedIds: number[] = [];
    await this._appOrm.connectAsync(async (db) => {
      for (const raw of excelItems) {
        changedIds.push(await this._upsertItem(db, raw, "엑셀업로드"));
      }
    });
    await this._appSharedData.emitAsync(this.SHARED_DATA_KEY, changedIds);

    this._sdToast.success("업로드되었습니다.");

    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}
```

**포인트:**

- **다운로드는 `_search(false)`**(페이지네이션 없이 전체)로 쿼리. 페이지당 50건 제한이 걸리면 현재 페이지만 다운로드되는 실수가 생기므로 `usePagination: false` 명시 필수.
- **업로드는 `_excelWrapper.read(file)` → `_upsertItem` 재사용.** 확장 A의 중복 검사·DataLog 기록 로직이 동일하게 적용됨 (`logType: "엑셀업로드"`로 감사 로그 구분).
- **엑셀의 텍스트 컬럼(고객사명·MPN 등)을 FK id로 변환해야 하면** DB 재조회 대신 `useSharedSignal(...)`로 이미 로드된 공유 데이터를 재사용한다. 예: `this.sharedCategories.items().toMapValues((it) => it.name, (it) => it.orderBy((v) => (v.__isHidden ? 1 : 0))[0])`. 같은 키에 숨김·비숨김 항목이 섞여 있으면 `orderBy`로 비숨김(`__isHidden: false`)을 우선순위로 정렬한다. 별도 `_buildIdMap` 같은 helper로 분리하지 말고 `toMapValues`를 `onUploadExcelButtonClick` 내부에 직접 인라인한다 (단일 호출처).
- **`busyMessage`는 필요할 때만 추가** — 최소 뼈대는 `<sd-busy-container [busy]="busyCount() > 0">`만 사용하고 `busyMessage` signal을 두지 않는다. 짧은 CRUD는 progress 아이콘만으로 충분. 오래 걸리는 작업(대량 엑셀 업로드·집계 등)에 진행 문구가 필요하면 **필요한 화면에만** `busyMessage = signal<string | undefined>(undefined)` 추가 + `[message]="busyMessage()"` 바인딩 + 구간별 `busyMessage.set(...)`/`set(undefined)` 제어. 미사용 시 선언·바인딩 모두 생략.

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 선행: [확장 A: inline 편집/저장](./extension-a-inline-edit.md)
