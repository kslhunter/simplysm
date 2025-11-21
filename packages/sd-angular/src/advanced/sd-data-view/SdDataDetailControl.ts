import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  HostListener,
  inject,
  output,
  Signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { TXT_CHANGE_IGNORE_CONFIRM } from "../../commons";
import { SdButtonControl } from "../../controls/SdButtonControl";
import { SdFormControl } from "../../controls/SdFormControl";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdToastProvider } from "../../providers/SdToastProvider";
import { $obj } from "../../utils/bindings/wrappers/$obj";
import { setupCanDeactivate } from "../../utils/setups/setupCanDeactivate";
import { useViewTypeSignal } from "../../utils/signals/useViewTypeSignal";
import { SdBaseContainerControl } from "../SdBaseContainerControl";
import { DateTime } from "@simplysm/sd-core-common";
import { FormatPipe } from "../../pipes/FormatPipe";
import { SdSharedDataProvider } from "../shared-data/SdSharedDataProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $signal } from "../../utils/bindings/$signal";
import { injectParent } from "../../utils/injections/injectParent";
import { ISdModal } from "../../providers/sd-modal.provider";
import { $effect } from "../../utils/bindings/$effect";
import { SdAnchorControl } from "../../controls/SdAnchorControl";

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
    FaIconComponent,
    SdAnchorControl,
  ],
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
            <fa-icon [icon]="icons.save" [fixedWidth]="true" />
            저장
            <small>(CTRL+S)</small>
          </sd-button>
        }
        <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
          <fa-icon [icon]="icons.refresh" [fixedWidth]="true" />
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
                    <fa-icon [icon]="icons.save" [fixedWidth]="true" />
                    저장
                    <small>(CTRL+S)</small>
                  </sd-button>
                  <sd-button [theme]="'info'" (click)="onRefreshButtonClick()">
                    <fa-icon [icon]="icons.refresh" [fixedWidth]="true" />
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
                      <fa-icon [icon]="icons.redo" [fixedWidth]="true" />
                      복구
                    </sd-button>
                  } @else {
                    <sd-button [theme]="'danger'" (click)="onDeleteButtonClick()">
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
            <fa-icon [icon]="icons.refresh" [fixedWidth]="true" />
          </sd-anchor>
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
    await this.parent.doSubmit({ permCheck: true });
  }
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
  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);

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
    if (!this.canUse()) return;
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
    if (this.canDelete && !this.canDelete()) return;
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

  async doSubmit(opt?: { permCheck?: boolean; hideNoChangeMessage?: boolean }) {
    if (this.busyCount() > 0) return;
    if (opt?.permCheck && !this.canEdit()) return;
    if (!this.submit) return;

    if (!this.dataInfo()?.isNew && !$obj(this.data).changed()) {
      if (!opt?.hideNoChangeMessage) {
        this.#sdToast.info("변경사항이 없습니다.");
      }
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
