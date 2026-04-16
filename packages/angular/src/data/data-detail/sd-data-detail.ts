import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  effect,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { FormatPipe } from "../../core/format.pipe";
import { injectParent } from "../../core/injectParent";
import { SdButton } from "../../controls/button/sd-button";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { SdForm } from "../../controls/form/sd-form";
import { SdBaseContainer } from "../../layout/base-container/sd-base-container";
import { NgIcon } from "@ng-icons/core";
import {
  tablerDeviceFloppy,
  tablerEraser,
  tablerRefresh,
  tablerRestore,
} from "@ng-icons/tabler-icons";
import { SdDataDetailBase } from "./sd-data-detail.base";
import { SdCommandDirective } from "../../core/commands/sd-command";

export type { SdDataDetailDataInfo } from "./sd-data-detail.base";

//#region SdDataDetail

@Component({
  selector: "sd-data-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBaseContainer,
    SdForm,
    SdButton,
    NgTemplateOutlet,
    FormatPipe,
    SdAnchor,
    NgIcon,
  ],
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand", "sdSaveCommand"] },
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
            <ng-icon [svg]="icons.tablerDeviceFloppy" />
            저장
            <small>(CTRL+S)</small>
          </sd-button>
        }
        <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
          <ng-icon [svg]="icons.tablerRefresh" />
          새로고침
          <small>(CTRL+ALT+L)</small>
        </sd-button>
      </ng-template>

      <ng-template #contentTpl>
        <div class="flex-column fill">
          @if ((parent.viewType() === "control" && parent.canEdit()) || toolTplRef()) {
            <div class="p-default flex-row gap-default bdb bdb-theme-gray-lightest">
              @if (parent.viewType() === "control" && parent.canEdit()) {
                @if (parent.submit) {
                  <sd-button [theme]="'primary'" (click)="onSubmitButtonClick()">
                    <ng-icon [svg]="icons.tablerDeviceFloppy" />
                    저장
                    <small>(CTRL+S)</small>
                  </sd-button>
                  <sd-button [theme]="'info'" (click)="onRefreshButtonClick()">
                    <ng-icon [svg]="icons.tablerRefresh" />
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
                      <ng-icon [svg]="icons.tablerRestore" />
                      복구
                    </sd-button>
                  } @else {
                    <sd-button [theme]="'danger'" (click)="onDeleteButtonClick()">
                      <ng-icon [svg]="icons.tablerEraser" />
                      삭제
                    </sd-button>
                  }
                }
              }

              <ng-template [ngTemplateOutlet]="toolTplRef() ?? null" />
            </div>
          }

          @if (prevTplRef()) {
            <div>
              <ng-template [ngTemplateOutlet]="prevTplRef() ?? null" />
            </div>
          }

          <div class="flex-fill">
            <sd-form #formCtrl (formSubmit)="onSubmit()">
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

          @if (nextTplRef()) {
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
            <ng-icon [svg]="icons.tablerRefresh" />
          </sd-anchor>
        </ng-template>
      }
    </sd-base-container>
  `,
})
export class SdDataDetail {
  parent = injectParent<SdDataDetailBase<any>>();

  formCtrl = viewChild<SdForm>("formCtrl");

  toolTplRef = contentChild("toolTpl", { read: TemplateRef });
  prevTplRef = contentChild("prevTpl", { read: TemplateRef });
  contentTplRef = contentChild.required("contentTpl", { read: TemplateRef });
  nextTplRef = contentChild("nextTpl", { read: TemplateRef });

  modalActionTplRef = viewChild("modalActionTpl", { read: TemplateRef });

  constructor() {
    effect(() => {
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

  protected readonly icons = {
    tablerDeviceFloppy,
    tablerRefresh,
    tablerRestore,
    tablerEraser,
  };
}

//#endregion
