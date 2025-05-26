import { NgIf, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  HostListener,
  inject,
  input,
  output,
  Signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
  WritableSignal,
} from "@angular/core";
import { TXT_CHANGE_IGNORE_CONFIRM } from "../../commons";
import { SdButtonControl } from "../../controls/sd-button.control";
import { SdFormControl } from "../../controls/sd-form.control";
import { SdIconControl } from "../../controls/sd-icon.control";
import { SdTopbarMenuItemControl } from "../../controls/sd-topbar-menu-item.control";
import { SdTopbarMenuControl } from "../../controls/sd-topbar-menu.control";
import { SdShowEffectDirective } from "../../directives/sd-show-effect.directive";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdToastProvider } from "../../providers/sd-toast.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $effect } from "../../utils/bindings/$effect";
import { $signal } from "../../utils/bindings/$signal";
import { $obj } from "../../utils/bindings/wrappers/$obj";
import { setupCanDeactivate } from "../../utils/setups/setup-can-deactivate";
import { TSdViewType, useViewTypeSignal } from "../../utils/signals/use-view-type.signal";
import { SdBaseContainerControl } from "../sd-base-container.control";
import { SdSharedDataProvider } from "../shared-data/sd-shared-data.provider";
import { DateTime } from "@simplysm/sd-core-common";
import { FormatPipe } from "../../pipes/format.pipe";

@Component({
  selector: "sd-data-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBaseContainerControl,
    SdFormControl,
    SdButtonControl,
    SdShowEffectDirective,
    SdTopbarMenuControl,
    SdTopbarMenuItemControl,
    SdIconControl,
    NgIf,
    NgTemplateOutlet,
    FormatPipe,
  ],
  template: `
    <sd-base-container [busy]="busyCount() > 0" [viewType]="currViewType()">
      <ng-template #pageTopbar>
        <sd-topbar-menu>
          <sd-topbar-menu-item (click)="onSubmitButtonClick()">
            <sd-icon [icon]="icons.save" fixedWidth />
            저장
            <small>(CTRL+S)</small>
          </sd-topbar-menu-item>
          <sd-topbar-menu-item theme="info" (click)="onRefreshButtonClick()">
            <sd-icon [icon]="icons.refresh" fixedWidth />
            새로고침
            <small>(CTRL+ALT+L)</small>
          </sd-topbar-menu-item>
        </sd-topbar-menu>
      </ng-template>

      <ng-template #content>
        <ng-container *ngIf="initialized()">
          <sd-form #formCtrl (submit)="onSubmit()" sd-show-effect>
            <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
          </sd-form>
        </ng-container>
      </ng-template>

      <ng-template #modalBottom>
        @let _dataInfo = viewModel().dataInfo();
        @if (_dataInfo.lastModifiedAt || _dataInfo.lastModifiedBy) {
          <div class="bg-theme-grey-lightest tx-right p-sm-default">
            최종수정:
            {{ _dataInfo.lastModifiedAt! | format: "yyyy-MM-dd HH:mm" }}
            ({{ _dataInfo.lastModifiedBy }})
          </div>
        }

        @if (hasPerm("edit")) {
          <div class="p-sm-default flex-row">
            @if (!_dataInfo.isNew && viewModel().toggleDelete) {
              <div>
                @if (!_dataInfo.isDeleted) {
                  <sd-button theme="danger" inline (click)="onToggleDeleteButtonClick(true)">
                    삭제
                  </sd-button>
                } @else {
                  <sd-button theme="warning" inline (click)="onToggleDeleteButtonClick(false)">
                    복구
                  </sd-button>
                }
              </div>
            }

            <div class="flex-grow tx-right">
              <sd-button theme="primary" inline (click)="onSubmitButtonClick()">확인</sd-button>
            </div>
          </div>
        }
      </ng-template>
    </sd-base-container>
  `,
})
export class SdDataDetailControl<T extends object> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _sdToast = inject(SdToastProvider);
  private _sdSharedData = inject(SdSharedDataProvider);

  //-- base
  viewModel = input.required<ISdDataDetailViewModel<T>>();

  private _viewType = useViewTypeSignal();
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this._viewType());

  close = output<boolean>();

  hasPerm(code: string) {
    return !this.viewModel().perms || this.viewModel().perms!().includes(code);
  }

  //-- view

  initialized = $signal(false);
  busyCount = $signal(0);

  formCtrl = viewChild<SdFormControl>("formCtrl");

  contentTemplateRef = contentChild.required(TemplateRef);

  constructor() {
    $effect([], async () => {
      if (!this.hasPerm("use")) {
        this.initialized.set(true);
        return;
      }

      this.busyCount.update((v) => v + 1);
      await this._sdToast.try(async () => {
        await this._sdSharedData.wait();
        await this._refresh();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
    });

    setupCanDeactivate(() => this.currViewType() === "modal" || this.checkIgnoreChanges());
  }

  checkIgnoreChanges() {
    return !$obj(this.viewModel().data).changed() || confirm(TXT_CHANGE_IGNORE_CONFIRM);
  }

  @HostListener("sdRefreshCommand")
  async onRefreshButtonClick() {
    if (this.busyCount() > 0) return;
    if (!this.checkIgnoreChanges()) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      await this._refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  private async _refresh() {
    this.viewModel().data.set(await this.viewModel().loadData());
    $obj(this.viewModel().data).snapshot();
  }

  async onToggleDeleteButtonClick(del: boolean) {
    if (this.busyCount() > 0) return;
    if (!this.hasPerm("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      const result = await this.viewModel().toggleDelete?.(del);
      if (!result) return;

      this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
    });
    this.busyCount.update((v) => v - 1);
    this.close.emit(true);
  }

  @HostListener("sdSaveCommand")
  onSubmitButtonClick() {
    if (this.busyCount() > 0) return;

    this.formCtrl()?.requestSubmit();
  }

  async onSubmit() {
    if (this.busyCount() > 0) return;
    if (!this.hasPerm("edit")) return;

    if (!$obj(this.viewModel().data).changed()) {
      this._sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      const result = await this.viewModel().submit();
      if (!result) return;

      this._sdToast.success("저장되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
    this.close.emit(true);
  }
}

export interface ISdDataDetailViewModel<T extends object> {
  perms?: Signal<string[]>;

  data: WritableSignal<T>;

  dataInfo: Signal<ISdDetailDataInfo>;

  loadData(): Promise<T> | T;

  toggleDelete?(del: boolean): Promise<boolean> | boolean;

  submit(): Promise<boolean> | boolean;
}

export interface ISdDetailDataInfo {
  isNew: boolean;
  isDeleted: boolean | undefined;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}
