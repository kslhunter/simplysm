import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from "@angular/core";
import { SdDockControl } from "../../controls/layout/sd-dock.control";
import { SdDockContainerControl } from "../../controls/layout/sd-dock-container.control";
import { SdButtonControl } from "../../controls/button/sd-button.control";
import { SdPaneControl } from "../../controls/layout/sd-pane.control";
import { SdFormControl } from "../../controls/form/sd-form.control";
import { SdModalBaseControl } from "../base/sd-modal-base.control";
import { TemplateTargetDirective } from "../../directives/template-target.directive";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdDataViewModelAbstract } from "./sd-data-view-model.abstract";
import { SdModalBase } from "../../controls/modal/sd-modal.provider";
import { $computed, $effect, $obj, $signal } from "../../utils/$hooks";
import { SdToastProvider } from "../../controls/toast/sd-toast.provider";
import { SdSharedDataProvider } from "../shared-data/sd-shared-data.provider";
import { NgTemplateOutlet } from "@angular/common";

@Component({
  selector: "sd-data-view-detail-modal",
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
    TemplateTargetDirective,
    NgTemplateOutlet,
  ],
  template: `
    <sd-modal-base
      [viewCodes]="vm().viewCodes"
      [busy]="busyCount() > 0"
      [initialized]="initialized()"
    >
      <ng-template target="content">
        <sd-dock-container>
          <sd-pane class="p-lg">
            <sd-form #formCtrl (submit)="onSubmit()">
              <ng-template [ngTemplateOutlet]="vm().detailDataTemplateRef() ?? null" />
            </sd-form>

            @if (vm().data().lastModifyDateTime) {
              최종수정:
              {{ vm().data().lastModifyDateTime!.toFormatString("yyyy-MM-dd HH:mm") }}
              ({{ vm().data().lastModifierName }})
            }
          </sd-pane>

          <sd-dock position="bottom" class="p-sm-default bdt bdt-trans-light flex-row">
            @if (vm().data().id != null) {
              <div>
                @if (!vm().data().isDeleted) {
                  <sd-button
                    theme="danger"
                    inline
                    (click)="onDeleteButtonClick()"
                    [disabled]="!vm().perms().includes('edit')"
                  >
                    삭제
                  </sd-button>
                } @else {
                  <sd-button
                    theme="warning"
                    inline
                    (click)="onRestoreButtonClick()"
                    [disabled]="!vm().perms().includes('edit')"
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
      </ng-template>
    </sd-modal-base>
  `,
})
export class SdDataViewDetailModal<VM extends SdDataViewModelAbstract> extends SdModalBase<{
  dataId?: number;
  vm: VM;
}, boolean> {
  #sdSharedData = inject(SdSharedDataProvider);
  #sdToast = inject(SdToastProvider);

  icons = inject(SdAngularConfigProvider).icons;

  vm = $computed(() => this.params().vm);

  initialized = $signal(false);
  busyCount = $signal(0);

  constructor() {
    super();

    $effect([this.params], async () => {
      if (!this.vm().perms().includes("use")) {
        this.initialized.set(true);
        this.open();
        return;
      }

      this.busyCount.update((v) => v + 1);
      await this.#sdToast.try(async () => {
        await this.#sdSharedData.wait();
        await this.vm().refreshDataAsync();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
      this.open();
    });
  }

  async onDeleteButtonClick() {
    if (this.busyCount() > 0) return;
    if (!this.vm().perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().deleteDataAsync();

      this.#sdToast.success("삭제되었습니다.");
      this.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onRestoreButtonClick() {
    if (this.busyCount() > 0) return;
    if (!this.vm().perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().restoreDataAsync();

      this.#sdToast.success("복구되었습니다.");
      this.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onSubmit() {
    if (this.busyCount() > 0) return;
    if (!this.vm().perms().includes("edit")) return;

    if (!$obj(this.vm().data).changed()) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().upsertDataAsync();

      this.#sdToast.success("저장되었습니다.");
      this.close(true);
    });
    this.busyCount.update((v) => v - 1);
  }
}
