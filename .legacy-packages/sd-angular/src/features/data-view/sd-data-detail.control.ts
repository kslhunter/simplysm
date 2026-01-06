import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  inject,
  output,
  type Signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { TXT_CHANGE_IGNORE_CONFIRM } from "../../core/commons";
import { SdButtonControl } from "../../ui/form/button/sd-button.control";
import { SdFormControl } from "../../ui/form/sd-form.control";
import { SdToastProvider } from "../../ui/overlay/toast/sd-toast.provider";
import { $obj } from "../../core/utils/bindings/wrappers/$obj";
import { setupCanDeactivate } from "../../core/utils/setups/setupCanDeactivate";
import { useViewTypeSignal } from "../../core/utils/signals/useViewTypeSignal";
import { SdBaseContainerControl } from "../base/sd-base-container.control";
import { DateTime } from "@simplysm/sd-core-common";
import { FormatPipe } from "../../core/pipes/format.pipe";
import { SdSharedDataProvider } from "../../core/providers/storage/sd-shared-data.provider";
import { $signal } from "../../core/utils/bindings/$signal";
import { injectParent } from "../../core/utils/injections/injectParent";
import type { ISdModal } from "../../ui/overlay/modal/sd-modal.provider";
import { $effect } from "../../core/utils/bindings/$effect";
import { SdAnchorControl } from "../../ui/form/button/sd-anchor.control";
import { NgIcon } from "@ng-icons/core";
import {
  tablerDeviceFloppy,
  tablerEraser,
  tablerRefresh,
  tablerRestore,
} from "@ng-icons/tabler-icons";

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
    SdAnchorControl,
    NgIcon,
  ],
  host: {
    "(sdRefreshCommand)": "onRefreshButtonClick()",
    "(sdSaveCommand)": "onSubmitButtonClick()",
  },
  template: `
    <sd-base-container
      [busy]="parent.busyCount() > 0"
      [busyMessage]="parent.busyMessage()"
      [viewType]="parent.viewType()"
      [initialized]="parent.initialized()"
      [restricted]="!parent.canUse()"
    >
      <ng-template #pageTopbarTpl>
        @if (parent.canEdit() && parent.submit) {
          <sd-button [theme]="'link-primary'" (click)="onSubmitButtonClick()">
            <ng-icon [svg]="tablerDeviceFloppy" />
            저장
            <small>(CTRL+S)</small>
          </sd-button>
        }
        <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
          <ng-icon [svg]="tablerRefresh" />
          새로고침
          <small>(CTRL+ALT+L)</small>
        </sd-button>
      </ng-template>

      <ng-template #contentTpl>
        <div class="flex-column fill">
          @if ((parent.viewType() === "control" && parent.canEdit()) || toolTplRef() != null) {
            <div class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
              @if (parent.viewType() === "control" && parent.canEdit()) {
                @if (parent.submit) {
                  <sd-button [theme]="'primary'" (click)="onSubmitButtonClick()">
                    <ng-icon [svg]="tablerDeviceFloppy" />
                    저장
                    <small>(CTRL+S)</small>
                  </sd-button>
                  <sd-button [theme]="'info'" (click)="onRefreshButtonClick()">
                    <ng-icon [svg]="tablerRefresh" />
                    새로고침
                    <small>(CTRL+ALT+L)</small>
                  </sd-button>
                }
                @if (
                  !parent.dataInfo()?.isNew &&
                  parent.toggleDelete &&
                  (!parent.canDelete || parent.canDelete())
                ) {
                  @if (parent.dataInfo()?.isDeleted) {
                    <sd-button [theme]="'warning'" (click)="onRestoreButtonClick()">
                      <ng-icon [svg]="tablerRestore" />
                      복구
                    </sd-button>
                  } @else {
                    <sd-button [theme]="'danger'" (click)="onDeleteButtonClick()">
                      <ng-icon [svg]="tablerEraser" />
                      삭제
                    </sd-button>
                  }
                }
              }

              <ng-template [ngTemplateOutlet]="toolTplRef() ?? null" />
            </div>
          }

          @if (prevTplRef() != null) {
            <div>
              <ng-template [ngTemplateOutlet]="prevTplRef() ?? null" />
            </div>
          }

          <div class="flex-fill">
            <sd-form #formCtrl (submit)="onSubmit()">
              <ng-template [ngTemplateOutlet]="contentTplRef()" />
            </sd-form>
          </div>

          @if (parent.dataInfo()?.lastModifiedAt || parent.dataInfo()?.lastModifiedBy) {
            <div
              class="p-sm-default"
              [class.bg-theme-gray-lightest]="parent.viewType() === 'modal'"
            >
              최종수정:
              @if (parent.dataInfo()?.lastModifiedAt) {
                {{ parent.dataInfo()!.lastModifiedAt | format: "yyyy-MM-dd HH:mm" }}
              }
              @if (parent.dataInfo()?.lastModifiedBy) {
                ({{ parent.dataInfo()?.lastModifiedBy }})
              }
            </div>
          }

          @if (nextTplRef() != null) {
            <div>
              <ng-template [ngTemplateOutlet]="nextTplRef() ?? null" />
            </div>
          }
        </div>
      </ng-template>

      @if (parent.canEdit()) {
        <ng-template #modalBottomTpl>
          <div class="p-sm-default flex-row gap-sm">
            @if (
              !parent.dataInfo()?.isNew &&
              parent.toggleDelete &&
              (!parent.canDelete || parent.canDelete())
            ) {
              @if (parent.dataInfo()?.isDeleted) {
                <sd-button [size]="'sm'" [theme]="'warning'" (click)="onRestoreButtonClick()">
                  복구
                </sd-button>
              } @else {
                <sd-button [size]="'sm'" [theme]="'danger'" (click)="onDeleteButtonClick()">
                  삭제
                </sd-button>
              }
            }

            <div class="flex-fill flex-row gap-sm main-align-end">
              <sd-button [size]="'sm'" [theme]="'primary'" (click)="onSubmitButtonClick()">
                확인
              </sd-button>
            </div>
          </div>
        </ng-template>

        <ng-template #modalActionTpl>
          <sd-anchor
            [theme]="'gray'"
            class="p-sm-default"
            (click)="onRefreshButtonClick()"
            title="새로고침(CTRL+ALT+L)"
          >
            <ng-icon [svg]="tablerRefresh" />
          </sd-anchor>
        </ng-template>
      }
    </sd-base-container>
  `,
})
export class SdDataDetailControl {
  parent = injectParent<AbsSdDataDetail<any>>();

  formCtrl = viewChild<SdFormControl>("formCtrl");

  toolTplRef = contentChild("toolTpl", { read: TemplateRef });
  prevTplRef = contentChild("prevTpl", { read: TemplateRef });
  contentTplRef = contentChild.required("contentTpl", { read: TemplateRef });
  nextTplRef = contentChild("nextTpl", { read: TemplateRef });

  modalActionTplRef = viewChild("modalActionTpl", { read: TemplateRef });

  constructor() {
    $effect(() => {
      this.parent.actionTplRef = this.modalActionTplRef();
    });
  }

  async onRefreshButtonClick() {
    await this.parent.doRefresh();
  }

  async onDeleteButtonClick() {
    await this.parent.doToggleDelete(true);
  }

  async onRestoreButtonClick() {
    await this.parent.doToggleDelete(false);
  }

  onSubmitButtonClick() {
    this.formCtrl()?.requestSubmit();
  }

  async onSubmit() {
    await this.parent.doSubmit({ permCheck: true });
  }

  protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
  protected readonly tablerRefresh = tablerRefresh;
  protected readonly tablerRestore = tablerRestore;
  protected readonly tablerEraser = tablerEraser;
}

@Directive()
export abstract class AbsSdDataDetail<T extends object, R = boolean> implements ISdModal<R> {
  //-- abstract

  abstract canUse: Signal<boolean>; // computed (use권한)
  abstract canEdit: Signal<boolean>; // computed (edit권한)
  canDelete?: Signal<boolean>;

  prepareRefreshEffect?(): void;

  abstract load():
    | Promise<{ data: T; info: ISdDataDetailDataInfo }>
    | { data: T; info: ISdDataDetailDataInfo };

  toggleDelete?(del: boolean): Promise<R | undefined> | R | undefined;

  submit?(data: T): Promise<R | undefined> | R | undefined;

  //-- implement
  private readonly __sdToast = inject(SdToastProvider);
  private readonly __sdSharedData = inject(SdSharedDataProvider);

  viewType = useViewTypeSignal(() => this);

  busyCount = $signal(0);
  busyMessage = $signal<string>();
  initialized = $signal(false);
  close = output<R>();
  actionTplRef?: TemplateRef<any>;

  data = $signal<T>({} as T);

  dataInfo = $signal<ISdDataDetailDataInfo>();

  constructor() {
    $effect(() => {
      this.prepareRefreshEffect?.();

      queueMicrotask(async () => {
        if (!this.canUse()) {
          this.initialized.set(true);
          return;
        }

        this.busyCount.update((v) => v + 1);
        await this.__sdToast.try(async () => {
          await this.__sdSharedData.wait();
          await this.refresh();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });

    setupCanDeactivate(() => this.viewType() === "modal" || this.checkIgnoreChanges());
  }

  checkIgnoreChanges() {
    return !$obj(this.data).changed() || confirm(TXT_CHANGE_IGNORE_CONFIRM);
  }

  async doRefresh() {
    if (this.busyCount() > 0) return;
    if (!this.canUse()) return;
    if (!this.checkIgnoreChanges()) return;

    this.busyCount.update((v) => v + 1);
    await this.__sdToast.try(async () => {
      await this.refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  async refresh() {
    const result = await this.load();
    this.data.set(result.data);
    this.dataInfo.set(result.info);
    if (!result.info.isNew) {
      $obj(this.data).snapshot();
    }
  }

  async doToggleDelete(del: boolean) {
    if (this.busyCount() > 0) return;
    if (!this.canEdit()) return;
    if (this.canDelete && !this.canDelete()) return;
    if (!this.toggleDelete) return;

    this.busyCount.update((v) => v + 1);
    await this.__sdToast.try(async () => {
      const result = await this.toggleDelete!(del);
      if (!result) return;

      this.__sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);

      this.close.emit(result);
    });
    this.busyCount.update((v) => v - 1);
  }

  async doSubmit(opt?: { permCheck?: boolean; hideNoChangeMessage?: boolean }) {
    if (this.busyCount() > 0) return;
    if (opt?.permCheck && !this.canEdit()) return;
    if (!this.submit) return;

    if (!this.dataInfo()?.isNew && !$obj(this.data).changed()) {
      if (!opt?.hideNoChangeMessage) {
        this.__sdToast.info("변경사항이 없습니다.");
      }
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.__sdToast.try(async () => {
      const result = await this.submit!(this.data());
      if (!result) return;

      this.__sdToast.success("저장되었습니다.");

      this.close.emit(result);

      await this.refresh();
    });
    this.busyCount.update((v) => v - 1);
  }
}

export interface ISdDataDetailDataInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}
