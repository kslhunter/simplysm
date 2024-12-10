import { ChangeDetectionStrategy, Component, inject, input, model, ViewEncapsulation } from "@angular/core";
import { SdDockContainerControl } from "../../../controls/layout/sd-dock-container.control";
import { SdPaneControl } from "../../../controls/layout/sd-pane.control";
import { SdFormControl } from "../../../controls/form/sd-form.control";
import { SdModalBaseControl } from "../../base/sd-modal-base.control";
import { SdBusyContainerControl } from "../../../controls/busy/sd-busy-container.control";
import { SdDockControl } from "../../../controls/layout/sd-dock.control";
import { SdButtonControl } from "../../../controls/button/sd-button.control";
import { SdToastProvider } from "../../../controls/toast/sd-toast.provider";
import { SdActivatedModalProvider } from "../../../controls/modal/sd-modal.provider";
import { $effect, $obj, $signal } from "../../../utils/$hooks";
import { SD_VIEW_MODEL_DETAIL_DATA, SdViewModelBase } from "../sd-view-model-base";
import { SdSharedDataProvider } from "../../shared-data/sd-shared-data.provider";
import { ObjectUtil } from "@simplysm/sd-core-common";

@Component({
  selector: "sd-detail-modal-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDockControl,
    SdDockContainerControl,
    SdButtonControl,
    SdPaneControl,
    SdFormControl,
    SdModalBaseControl,
    SdBusyContainerControl,
  ],
  template: `
    <sd-modal-base [viewCodes]="viewModel().viewCodes">
      <sd-busy-container [busy]="busyCount() > 0">
        @if (initialized()) {
          <sd-dock-container>
            <sd-pane class="p-lg">
              <sd-form #formCtrl (submit)="onSubmit()">
                <ng-content />
              </sd-form>

              @if (data()!.lastModifyDateTime) {
                최종수정:
                {{ data()!.lastModifyDateTime!.toFormatString("yyyy-MM-dd HH:mm") }}
                ({{ data()!.lastModifierName }})
              }
            </sd-pane>

            <sd-dock position="bottom" class="p-sm-default bdt bdt-trans-light flex-row">
              @if (data()!.id != null) {
                <div>
                  @if (!data()!.isDeleted) {
                    <sd-button
                      theme="danger"
                      inline
                      (click)="onDeleteButtonClick()"
                      [disabled]="!viewModel().perms().includes('edit')"
                    >
                      삭제
                    </sd-button>
                  } @else {
                    <sd-button
                      theme="warning"
                      inline
                      (click)="onRestoreButtonClick()"
                      [disabled]="!viewModel().perms().includes('edit')"
                    >
                      복구
                    </sd-button>
                  }
                </div>
              }

              <div class="flex-grow tx-right">
                <sd-button theme="primary" inline (click)="formCtrl.requestSubmit()">확인</sd-button>
              </div>
            </sd-dock>
          </sd-dock-container>
        }
      </sd-busy-container>
    </sd-modal-base>
  `,
})
export class SdDetailModalBase<VM extends SdViewModelBase> {
  #sdToast = inject(SdToastProvider);
  #sdActivatedModal = inject(SdActivatedModalProvider);
  #sdSharedData = inject(SdSharedDataProvider);

  viewModel = input.required<VM>();
  dataId = input<number>();

  initialized = $signal(false);
  busyCount = $signal(0);

  data = model.required<VM[typeof SD_VIEW_MODEL_DETAIL_DATA]>();
  emptyExt = input<Partial<VM[typeof SD_VIEW_MODEL_DETAIL_DATA]>>();

  constructor() {
    $effect([this.dataId], async () => {
      if (!this.viewModel().perms().includes("use")) {
        this.initialized.set(true);
        this.#sdActivatedModal.content.open();
        return;
      }

      this.busyCount.update((v) => v + 1);
      await this.#sdToast.try(async () => {
        await this.#sdSharedData.wait();
        await this.#refresh();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
      this.#sdActivatedModal.content.open();
    });
  }

  async #refresh() {
    if (this.dataId() == null) {
      this.data.set({
        ...this.viewModel().getDetailEmpty(),
        ...ObjectUtil.clearUndefined(this.emptyExt()),
      });
    }
    else {
      this.data.set(await this.viewModel().getDetail(this.dataId()!));
    }
    $obj(this.data).snapshot();
  }

  async onDeleteButtonClick() {
    if (this.busyCount() > 0) return;
    if (!this.viewModel().perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.viewModel().deletes([this.dataId()!]);

      this.#sdToast.success("삭제되었습니다.");

      this.#sdActivatedModal.content.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onRestoreButtonClick() {
    if (this.busyCount() > 0) return;
    if (!this.viewModel().perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.viewModel().restores([this.dataId()!]);

      this.#sdToast.success("복구되었습니다.");

      this.#sdActivatedModal.content.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onSubmit() {
    if (this.busyCount() > 0) return;
    if (!this.viewModel().perms().includes("edit")) return;

    if (!$obj(this.data).changed()) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.viewModel().saveDetail(this.data());

      this.#sdToast.success("저장되었습니다.");

      this.#sdActivatedModal.content.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }
}