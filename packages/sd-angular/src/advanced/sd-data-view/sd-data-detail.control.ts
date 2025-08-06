import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  effect,
  HostListener,
  inject,
  output,
  Signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { TXT_CHANGE_IGNORE_CONFIRM } from "../../commons";
import { SdButtonControl } from "../../controls/sd-button.control";
import { SdFormControl } from "../../controls/sd-form.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdToastProvider } from "../../providers/sd-toast.provider";
import { $obj } from "../../utils/bindings/wrappers/$obj";
import { setupCanDeactivate } from "../../utils/setups/setup-can-deactivate";
import { useViewTypeSignal } from "../../utils/signals/use-view-type.signal";
import { SdBaseContainerControl } from "../sd-base-container.control";
import { DateTime } from "@simplysm/sd-core-common";
import { FormatPipe } from "../../pipes/format.pipe";
import { SdSharedDataProvider } from "../shared-data/sd-shared-data.provider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $signal } from "../../utils/bindings/$signal";
import { injectParent } from "../../utils/injections/inject-parent";
import { ISdModal } from "../../providers/sd-modal.provider";
import { $effect } from "../../utils/bindings/$effect";

@Component({
  selector: "sd-data-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdBaseContainerControl, SdFormControl, SdButtonControl, NgTemplateOutlet, FormatPipe, FaIconComponent],
  template: `
    <sd-base-container
      [busy]="parent.busyCount() > 0"
      [viewType]="parent.viewType()"
      [initialized]="parent.initialized()"
      [restricted]="!parent.canUse()"
    >
      <ng-template #pageTopbar>
        @if (parent.canEdit() && parent.submit) {
          <sd-button theme="link-primary" (click)="onSubmitButtonClick()">
            <fa-icon [icon]="icons.save" [fixedWidth]="true" />
            저장
            <small>(CTRL+S)</small>
          </sd-button>
        }
        <sd-button theme="link-info" (click)="onRefreshButtonClick()">
          <fa-icon [icon]="icons.refresh" [fixedWidth]="true" />
          새로고침
          <small>(CTRL+ALT+L)</small>
        </sd-button>
      </ng-template>

      <ng-template #content>
        <div class="fill flex-vertical region">
          @if ((parent.viewType() === "control" && parent.canEdit()) || toolTplRef() != null) {
            <div class="p-default flex flex-gap-default bdb bdb-theme-grey-lightest">
              @if (parent.viewType() === "control" && parent.canEdit()) {
                @if (parent.submit) {
                  <sd-button theme="primary" (click)="onSubmitButtonClick()">
                    <fa-icon [icon]="icons.save" [fixedWidth]="true" />
                    저장
                    <small>(CTRL+S)</small>
                  </sd-button>
                  <sd-button theme="info" (click)="onRefreshButtonClick()">
                    <fa-icon [icon]="icons.refresh" [fixedWidth]="true" />
                    새로고침
                    <small>(CTRL+ALT+L)</small>
                  </sd-button>
                }
                @if (!parent.dataInfo()?.isNew && parent.toggleDelete) {
                  @if (parent.dataInfo()?.isDeleted) {
                    <sd-button theme="warning" (click)="onRestoreButtonClick()">
                      <fa-icon [icon]="icons.redo" [fixedWidth]="true" />
                      복구
                    </sd-button>
                  } @else {
                    <sd-button theme="danger" (click)="onDeleteButtonClick()">
                      <fa-icon [icon]="icons.eraser" [fixedWidth]="true" />
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
            <div class="p-sm-default">
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
        <ng-template #modalBottom>
          <div class="p-sm-default flex flex-gap-sm">
            @if (!parent.dataInfo()?.isNew && parent.toggleDelete) {
              @if (parent.dataInfo()?.isDeleted) {
                <sd-button size="sm" theme="warning" (click)="onRestoreButtonClick()">복구</sd-button>
              } @else {
                <sd-button size="sm" theme="danger" (click)="onDeleteButtonClick()">삭제</sd-button>
              }
            }

            <div class="flex-fill tx-right">
              <sd-button size="sm" theme="primary" (click)="onSubmitButtonClick()">확인</sd-button>
            </div>
          </div>
        </ng-template>

        <ng-template #modalActionTpl>
          <a class="a-grey p-sm-default" (click)="onRefreshButtonClick()" title="새로고침(CTRL+ALT+L)">
            <fa-icon [icon]="icons.refresh" [fixedWidth]="true" />
          </a>
        </ng-template>
      }
    </sd-base-container>
  `,
})
export class SdDataDetailControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

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

  @HostListener("sdRefreshCommand")
  async onRefreshButtonClick() {
    await this.parent.doRefresh();
  }

  async onDeleteButtonClick() {
    await this.parent.doToggleDelete(true);
  }

  async onRestoreButtonClick() {
    await this.parent.doToggleDelete(false);
  }

  @HostListener("sdSaveCommand")
  onSubmitButtonClick() {
    this.formCtrl()?.requestSubmit();
  }

  async onSubmit() {
    await this.parent.doSubmit();
  }
}

@Directive()
export abstract class AbsSdDataDetail<T extends object> implements ISdModal<boolean> {
  //-- abstract

  abstract canUse: Signal<boolean>; // computed (use권한)
  abstract canEdit: Signal<boolean>; // computed (edit권한)

  prepareRefreshEffect?(): void;

  abstract load(): Promise<{ data: T; info: ISdDataDetailDataInfo }> | { data: T; info: ISdDataDetailDataInfo };

  toggleDelete?(del: boolean): Promise<boolean> | boolean;

  submit?(data: T): Promise<boolean> | boolean;

  //-- implement
  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);

  viewType = useViewTypeSignal(() => this);

  busyCount = $signal(0);
  initialized = $signal(false);
  close = output<boolean>();
  actionTplRef?: TemplateRef<any>;

  data = $signal<T>({} as T);

  dataInfo = $signal<ISdDataDetailDataInfo>();

  constructor() {
    effect(() => {
      this.prepareRefreshEffect?.();

      queueMicrotask(async () => {
        if (!this.canUse()) {
          this.initialized.set(true);
          return;
        }

        this.busyCount.update((v) => v + 1);
        await this.#sdToast.try(async () => {
          await this.#sdSharedData.wait();
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
    if (!this.canEdit()) return;
    if (!this.checkIgnoreChanges()) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
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
    if (!this.toggleDelete) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const result = await this.toggleDelete!(del);
      if (!result) return;

      this.#sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);

      this.close.emit(result);
    });
    this.busyCount.update((v) => v - 1);
  }

  async doSubmit() {
    if (this.busyCount() > 0) return;
    if (!this.canEdit()) return;
    if (!this.submit) return;

    if (!this.dataInfo()?.isNew && !$obj(this.data).changed()) {
      this.#sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const result = await this.submit!(this.data());
      if (!result) return;

      this.#sdToast.success("저장되었습니다.");

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
