← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 G: 엑셀 업로드/다운로드

> **선행:** [확장 A: inline 편집/저장](./extension-a-inline-edit.md) (`_upsertItem` / `_search` / 감사 로그 재사용)

`SdFileDialogProvider`로 파일 선택, `ExcelWrapper`(@simplysm/excel) + `zod` 스키마로 읽기/쓰기를 수행한다. 다운로드는 확장 A의 `_search(false)`로 페이지네이션 없이 전체를 조회한 뒤 `@simplysm/core-browser`의 `downloadBlob`으로 내려받는다. 업로드된 각 행은 확장 A의 `_upsertItem`을 재사용해 중복 검사·감사 로그를 일관된 경로로 적용한다.

**이 확장이 도입하는 요소:**

- **imports:** `SdFileDialogProvider`, `DateTime`, `downloadBlob`(@simplysm/core-browser), `ExcelWrapper`(@simplysm/excel), `z`(zod), `tablerFileExcel`, `tablerUpload`
- **DI:** `SdFileDialogProvider`
- **필드:** `tablerFileExcel` / `tablerUpload` 아이콘, `_excelWrapper` (zod 스키마로 컬럼 정의)
- **메서드:** `onUploadExcelButtonClick`, `onDownloadExcelButtonClick`
- **템플릿:** 확장 A가 도입한 inline 도구 dock 뒤쪽에 엑셀 업로드/다운로드 버튼 2개 추가

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 선행 확장(A) 위에 번호 순서대로 삽입할 지점을 나타낸다. 그대로 컴파일되지 않는다.

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
    // isDeleted는 확장 B 적용 시(DB Table에 isDeleted 컬럼이 있는 경우)에만 추가:
    //   isDeleted: z.boolean().describe("삭제"),
    lastModifiedAt: z.custom<DateTime>().optional().describe("최종수정일시"),
    lastModifiedBy: z.string().optional().describe("최종수정자"),
  }),
);

// 4) template — 확장 A가 도입한 inline 도구 dock 뒤쪽에 엑셀 버튼 2개 추가.
//    확장 B가 함께 적용되면 동일 dock 안에 "등록 → 선택 삭제 → 선택 복구 → 엑셀 업로드 → 엑셀 다운로드" 순으로 배치한다.
`
  <!-- 확장 A가 도입한 도구 dock (canEdit && page 가드) -->
  @if (canEdit() && viewType() === "page") {
    <sd-dock class="flex-row gap-sm p-xs-default">
      <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onAddItemButtonClick()">
        <ng-icon [svg]="tablerCirclePlus" /> 등록
      </sd-button>
      <!-- 확장 B 적용 시: 선택 삭제 / 선택 복구 버튼이 여기에 위치 -->

      <!-- ↓ 확장 G가 추가 -->
      <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onUploadExcelButtonClick()">
        <ng-icon [svg]="tablerUpload" /> 엑셀 업로드
      </sd-button>
      <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onDownloadExcelButtonClick()">
        <ng-icon [svg]="tablerFileExcel" /> 엑셀 다운로드
      </sd-button>
    </sd-dock>
  }
`

// 5) 메서드 추가
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
```

**포인트:**

- **다운로드는 `_search(false)`로 전체를 쿼리한다.** 페이지당 50건 제한이 걸리면 현재 페이지만 다운로드되므로 `usePagination: false`를 명시한다.
- **업로드는 `_excelWrapper.read(file)` → `_upsertItem` 루프로 수행한다.** 확장 A의 중복 검사·감사 로그가 동일하게 적용되며, `logType: "엑셀업로드"`로 감사 로그를 구분한다. 상세 Usage는 [`SdFileDialogProvider.showAsync`](../../providers/sd-file-dialog-provider.md#usage) 참조.
- **엑셀의 텍스트 컬럼(고객사명·MPN 등)을 FK id로 변환해야 하면 DB 재조회 대신 `useSharedSignal(...)`로 이미 로드된 공유 데이터를 재사용한다.** 예: `this.sharedCategories.items().toMapValues((it) => it.name, (it) => it.orderBy((v) => (v.__isHidden ? 1 : 0))[0])`. 같은 키에 숨김·비숨김 항목이 섞여 있으면 `orderBy`로 비숨김(`__isHidden: false`)을 우선순위로 정렬한다. 별도 `_buildIdMap` 같은 helper로 분리하지 않고 `toMapValues`를 `onUploadExcelButtonClick` 내부에 직접 인라인한다 (단일 호출처).
- **`busyMessage`는 필요할 때만 추가한다.** 최소 뼈대는 `<sd-busy-container [busy]="busyCount() > 0">`만 사용하고 `busyMessage` signal을 두지 않는다. 짧은 CRUD는 progress 아이콘만으로 충분하다. 오래 걸리는 작업(대량 엑셀 업로드·집계 등)에 진행 문구가 필요한 화면에만 `busyMessage = signal<string | undefined>(undefined)` 추가 + `[message]="busyMessage()"` 바인딩 + 구간별 `busyMessage.set(...)`/`set(undefined)` 제어를 추가한다. 미사용 시 선언·바인딩 모두 생략한다.

**🚫 흔한 실수**

> 공통 규칙(`mark` 오용, `setupCanDeactivate` 호출 위치, 시트 셀 `[inset]/[size]`, 공유 데이터 `wait()` 호출 위치 등)은 [레시피 공통 규칙](../_common-rules.md)을 참조한다. 이 섹션은 **엑셀 업로드/다운로드 고유 실수**만 다룬다.

### 필수 필드를 `z.string().optional()`로 선언

```typescript
// ❌ 모든 zod 필드에 .optional()을 부착 — 빈 셀·누락 행이 그대로 _upsertItem에 전달되어
//    DB NOT NULL 위반 또는 name/phone이 공백인 row가 그대로 upsert된다.
new ExcelWrapper(
  z.object({
    id: z.number().optional().describe("ID"),
    name: z.string().optional().describe("이름"),           // ← 필수 필드인데 optional
    phone: z.string().optional().describe("전화번호"),
    categoryId: z.number().optional().describe("카테고리.ID"),
  }),
);

// ✅ 필수 필드는 .optional() 없이 선언 — 빈 셀 행은 ExcelWrapper가 safeParse 단계에서 차단
new ExcelWrapper(
  z.object({
    id: z.number().optional().describe("ID"),
    name: z.string().describe("이름"),                      // ← 필수
    phone: z.string().optional().describe("전화번호"),
    categoryId: z.number().optional().describe("카테고리.ID"),
  }),
);
```

**근거**: `ExcelWrapper.read`는 각 행을 `_schema.safeParse(record)`로 검증하고 실패 시 에러를 던진다(`packages/excel/src/excel-wrapper.ts:77`). zod 스키마가 업로드 유효성의 유일한 방어선이므로, 필수 필드에 `.optional()`을 달면 검증 자체를 통과해 잘못된 값이 `_upsertItem`까지 내려간다. `isDeleted` 컬럼이 있는 테이블에서는 [공통 규칙: 삭제 방식](../_common-rules.md#삭제-방식은-db-스키마에-따라-결정한다)에 따라 `isDeleted: z.boolean().describe("삭제")` 필드를 추가한다(확장 B 병용).

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 선행: [확장 A: inline 편집/저장](./extension-a-inline-edit.md) (`_upsertItem`/`_search`/감사 로그 재사용)
- 병용 가능: [확장 B: 선택 기능 + 선택 삭제/복구](./extension-b-selection.md) (`isDeleted` 컬럼이 있는 테이블 — zod 스키마에 `isDeleted` 필드 추가)
