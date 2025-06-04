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
import { taDeviceFloppy } from "@simplysm/sd-tabler-icons/icons/ta-device-floppy";
import { SdTablerIconControl } from "../../controls/tabler-icon/sd-tabler-icon.control";

@Component({
  selector: "sd-data-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBaseContainerControl,
    SdFormControl,
    SdButtonControl,
    NgTemplateOutlet,
    FormatPipe,
    SdTablerIconControl,
  ],
  template: `
    <sd-base-container
      [busy]="busyCount() > 0"
      [viewType]="currViewType()"
      [initialized]="initialized()"
      [visible]="hasPerm('use')"
    >
      @let _dataInfo = viewModel().dataInfo();

      @if (hasPerm("edit")) {
        <ng-template #tool>
          <div class="p-sm-lg flex-row flex-gap-sm">
            <sd-button theme="primary" (click)="onSubmitButtonClick()">
              <sd-tabler-icon [icon]="taDeviceFloppy" />
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
        @if (_dataInfo.lastModifiedAt || _dataInfo.lastModifiedBy) {
          <div class="bg-theme-grey-lightest p-sm-default">
            최종수정:
            {{ _dataInfo.lastModifiedAt! | format: "yyyy-MM-dd HH:mm" }}
            ({{ _dataInfo.lastModifiedBy }})
          </div>
        }
        @if (additionalTemplateRef() != null) {
          <div class="p-lg">
            <ng-template [ngTemplateOutlet]="additionalTemplateRef() ?? null" />
          </div>
        }
      </ng-template>

      @if (hasPerm("edit")) {
        <ng-template #modalBottom>
          <div class="p-sm-default flex-row bdt bdt-theme-grey-lightest">
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
        </ng-template>
      }
    </sd-base-container>
  `,
})
export class SdDataDetailControl<T extends object> {
  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);

  //- base
  viewModel = input.required<ISdDataDetailViewModel<T>>();

  #viewType = useViewTypeSignal();
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this.#viewType());

  close = output<boolean>();

  hasPerm(code: string) {
    return !this.viewModel().perms || this.viewModel().perms!().includes(code);
  }

  //-- view

  initialized = model(false);
  busyCount = model(0);

  formCtrl = viewChild<SdFormControl>("formCtrl");

  contentTemplateRef = contentChild.required(TemplateRef);
  additionalTemplateRef = contentChild("additional", { read: TemplateRef });

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
        await this.#sdToast.try(async () => {
          await this.#sdSharedData.wait();
          await this.#refreshAsync();
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
    await this.#sdToast.try(async () => {
      await this.#refreshAsync();
    });
    this.busyCount.update((v) => v - 1);
  }

  async #refreshAsync() {
    this.viewModel().data.set(await this.viewModel().loadData());
    $obj(this.viewModel().data).snapshot();
  }

  async onToggleDeleteButtonClick(del: boolean) {
    if (this.busyCount() > 0) return;
    if (!this.hasPerm("edit")) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const result = await this.viewModel().toggleDelete?.(del);
      if (!result) return;

      this.#sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);

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
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const result = await this.viewModel().submit();
      if (!result) return;

      this.#sdToast.success("저장되었습니다.");

      this.close.emit(true);

      await this.#refreshAsync();
    });
    this.busyCount.update((v) => v - 1);
  }

  protected readonly taDeviceFloppy = taDeviceFloppy;
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
