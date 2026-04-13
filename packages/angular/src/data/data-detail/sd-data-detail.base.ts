import {
  Directive,
  effect,
  ErrorHandler,
  inject,
  output,
  signal,
  type Signal,
  TemplateRef,
} from "@angular/core";
import { DateTime, obj } from "@simplysm/core-common";
import { TXT_CHANGE_IGNORE_CONFIRM } from "../../core/commons";
import { SdSharedDataProvider } from "../../core/shared-data/sd-shared-data.provider";
import { setupCanDeactivate } from "../../core/routing/setupCanDeactivate";
import { injectViewTypeSignal } from "../../core/routing/injectViewTypeSignal";
import { withBusy } from "../../core/withBusy";
import { type SdModalContentDef } from "../../core/modal/sd-modal.provider";
import { SdToastProvider } from "../../core/toast/sd-toast.provider";
import { getOrmDataEditToastErrorMessage } from "../getOrmDataEditToastErrorMessage";

export interface SdDataDetailDataInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}

@Directive()
export abstract class SdDataDetailBase<T extends object, R = boolean>
  implements SdModalContentDef<R>
{
  //-- abstract

  abstract canUse: Signal<boolean>;
  abstract canEdit: Signal<boolean>;
  canDelete?: Signal<boolean>;

  prepareRefreshEffect?(): void;

  abstract load():
    | Promise<{ data: T; info: SdDataDetailDataInfo }>
    | { data: T; info: SdDataDetailDataInfo };

  toggleDelete?(del: boolean): Promise<R | undefined> | R | undefined;

  submit?(data: T): Promise<R | undefined> | R | undefined;

  //-- implement

  protected readonly _sdToast = inject(SdToastProvider);
  protected readonly _sdSharedData = inject(SdSharedDataProvider);
  protected readonly _errorHandler = inject(ErrorHandler);

  viewType = injectViewTypeSignal(() => this);

  busyCount = signal(0);
  busyMessage = signal<string | undefined>(undefined);
  initialized = signal(false);
  close = output<R>();
  actionTplRef?: TemplateRef<any>;

  data = signal<T>({} as T);

  dataInfo = signal<SdDataDetailDataInfo | undefined>(undefined);

  private _dataSnapshot?: T;

  constructor() {
    effect((onCleanup) => {
      this.prepareRefreshEffect?.();

      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      queueMicrotask(async () => {
        try {
          if (cancelled) return;

          if (!this.canUse()) {
            this.initialized.set(true);
            return;
          }

          await withBusy(this.busyCount, () =>
            this._sdToast.try(async () => {
              await this._sdSharedData.wait();
              await this.refresh();
            }),
          );
          this.initialized.set(true);
        } catch (err) {
          this._errorHandler.handleError(err);
        }
      });
    });

    setupCanDeactivate(() => this.viewType() === "modal" || this.checkIgnoreChanges());
  }

  checkIgnoreChanges() {
    return (
      this._dataSnapshot == null ||
      obj.equal(this.data(), this._dataSnapshot) ||
      confirm(TXT_CHANGE_IGNORE_CONFIRM)
    );
  }

  async doRefresh() {
    if (this.busyCount() > 0) return;
    if (!this.canUse()) return;
    if (!this.checkIgnoreChanges()) return;

    await withBusy(this.busyCount, () =>
      this._sdToast.try(async () => {
        await this.refresh();
      }),
    );
  }

  async refresh() {
    const result = await this.load();
    this.data.set(result.data);
    this.dataInfo.set(result.info);
    if (!result.info.isNew) {
      this._dataSnapshot = obj.clone(result.data);
    }
  }

  async doToggleDelete(del: boolean) {
    if (this.busyCount() > 0) return;
    if (!this.canEdit()) return;
    if (this.canDelete && !this.canDelete()) return;
    if (!this.toggleDelete) return;

    await withBusy(this.busyCount, () =>
      this._sdToast.try(
        async () => {
          const result = await this.toggleDelete!(del);
          if (!result) return;

          this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);

          this.close.emit(result);
        },
        (err) => getOrmDataEditToastErrorMessage(err),
      ),
    );
  }

  async doSubmit(opt?: { permCheck?: boolean; hideNoChangeMessage?: boolean }) {
    if (this.busyCount() > 0) return;
    if (opt?.permCheck && !this.canEdit()) return;
    if (!this.submit) return;

    const dataInfo = this.dataInfo();
    if (dataInfo == null) return;

    if (
      !dataInfo.isNew &&
      (this._dataSnapshot == null || obj.equal(this.data(), this._dataSnapshot))
    ) {
      if (!opt?.hideNoChangeMessage) {
        this._sdToast.info("변경사항이 없습니다.");
      }
      return;
    }

    await withBusy(this.busyCount, () =>
      this._sdToast.try(
        async () => {
          const result = await this.submit!(this.data());
          if (!result) return;

          this._sdToast.success("저장되었습니다.");

          this.close.emit(result);

          await this.refresh();
        },
        (err) => getOrmDataEditToastErrorMessage(err),
      ),
    );
  }

}
