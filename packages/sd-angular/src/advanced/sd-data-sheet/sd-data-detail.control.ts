import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  HostListener,
  inject,
  input,
  model,
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
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdToastProvider } from "../../providers/sd-toast.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $effect } from "../../utils/bindings/$effect";
import { $obj } from "../../utils/bindings/wrappers/$obj";
import { setupCanDeactivate } from "../../utils/setups/setup-can-deactivate";
import { TSdViewType, useViewTypeSignal } from "../../utils/signals/use-view-type.signal";
import { SdBaseContainerControl } from "../sd-base-container.control";
import { DateTime } from "@simplysm/sd-core-common";
import { FormatPipe } from "../../pipes/format.pipe";
import { SdSharedDataProvider } from "../shared-data/sd-shared-data.provider";

@Component({
  selector: "sd-data-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBaseContainerControl,
    SdFormControl,
    SdButtonControl,
    SdIconControl,
    NgTemplateOutlet,
    FormatPipe,
  ],
  template: `
    <sd-base-container
      [busy]="busyCount() > 0"
      [viewType]="currViewType()"
      [initialized]="initialized()"
    >
      @let _dataInfo = viewModel().dataInfo();

      @if (hasPerm("edit")) {
        <ng-template #tool>
          <div class="p-sm-lg flex-row flex-gap-sm">
            <sd-button theme="primary" (click)="onSubmitButtonClick()">
              <sd-icon [icon]="icons.save" fixedWidth />
              저장
              <small>(CTRL+S)</small>
            </sd-button>
            @if (!_dataInfo.isNew && viewModel().toggleDelete) {
              @if (!_dataInfo.isDeleted) {
                <sd-button theme="danger" (click)="onToggleDeleteButtonClick(true)">삭제</sd-button>
              } @else {
                <sd-button theme="warning" (click)="onToggleDeleteButtonClick(false)">
                  복구
                </sd-button>
              }
            }
          </div>
        </ng-template>
      }

      <ng-template #content>
        <div class="p-lg">
          <sd-form #formCtrl (submit)="_onSubmit()">
            <ng-template [ngTemplateOutlet]="contentTemplateRef()" />
          </sd-form>
        </div>
      </ng-template>

      <ng-template #modalBottom>
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

  //- base
  readonly viewModel = input.required<ISdDataDetailViewModel<T>>();

  private _viewType = useViewTypeSignal();
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this._viewType());

  close = output<boolean>();

  hasPerm(code: string) {
    return !this.viewModel().perms || this.viewModel().perms!().includes(code);
  }

  //-- view

  readonly initialized = model(false);
  readonly busyCount = model(0);

  readonly formCtrl = viewChild<SdFormControl>("formCtrl");
  readonly contentTemplateRef = contentChild.required(TemplateRef);

  constructor() {
    $effect(
      [
        () => {
          for (const loadCondition of this.viewModel().loadConditions ?? []) {
            loadCondition();
          }
        },
      ],
      async () => {
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
      },
    );

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

      this.close.emit(true);
    });
    this.busyCount.update((v) => v - 1);
  }

  @HostListener("sdSaveCommand")
  onSubmitButtonClick() {
    if (this.busyCount() > 0) return;

    this.formCtrl()?.requestSubmit();
  }

  protected async _onSubmit() {
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

      this.close.emit(true);
    });
    this.busyCount.update((v) => v - 1);
  }
}

export interface ISdDataDetailViewModel<T extends object> {
  perms?: Signal<string[]>;

  data: WritableSignal<T>;

  dataInfo: Signal<ISdDetailDataInfo>;

  loadConditions?: Signal<any>[];

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
