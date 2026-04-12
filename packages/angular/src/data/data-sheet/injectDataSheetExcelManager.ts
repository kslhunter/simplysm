import { type WritableSignal, inject } from "@angular/core";
import { SdToastProvider } from "../../core/toast/sd-toast.provider";
import { SdFileDialogProvider } from "../../core/file-dialog/sd-file-dialog.provider";
import { withBusy } from "../../core/withBusy";
import type { SdDataSheetSearchResult } from "./sd-data-sheet.types";

export function injectDataSheetExcelManager<TItem>(options: {
  busyCount: WritableSignal<number>;
  search: (
    usePagination: boolean,
  ) => Promise<SdDataSheetSearchResult<TItem>> | SdDataSheetSearchResult<TItem>;
  refresh: () => Promise<void>;
  getDownloadExcelFn: () =>
    | ((items: TItem[]) => Promise<void> | void)
    | undefined;
  getUploadExcelFn: () => ((file: File) => Promise<void> | void) | undefined;
  errorMessageFn: (err: unknown) => string;
}) {
  const sdToast = inject(SdToastProvider);
  const sdFileDialog = inject(SdFileDialogProvider);

  async function doDownloadExcel(): Promise<void> {
    const downloadExcelFn = options.getDownloadExcelFn();
    if (!downloadExcelFn) return;

    await withBusy(options.busyCount, () =>
      sdToast.try(async () => {
        const items = (await options.search(false)).items;
        await downloadExcelFn(items);
      }),
    );
  }

  async function doUploadExcel(): Promise<void> {
    const uploadExcelFn = options.getUploadExcelFn();
    if (!uploadExcelFn) return;

    const file = await sdFileDialog.showAsync(
      false,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    if (!file) return;

    await withBusy(options.busyCount, () =>
      sdToast.try(
        async () => {
          await uploadExcelFn(file);
          await options.refresh();
          sdToast.success("엑셀 업로드가 완료 되었습니다.");
        },
        (err) => options.errorMessageFn(err),
      ),
    );
  }

  return { doDownloadExcel, doUploadExcel };
}
