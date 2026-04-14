import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  effect,
  input,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdButton } from "../../controls/button/sd-button";
import { SdForm } from "../../controls/form/sd-form";
import { SdSheetColumn } from "../sheet/sd-sheet-column";
import { SdSheetColumnCellTemplate } from "../sheet/sd-sheet-column-cell-template";
import { SdSheet } from "../sheet/sd-sheet";
import { injectParent } from "../../core/injectParent";
import { FormatPipe } from "../../core/format.pipe";
import { SdBaseContainer } from "../../layout/base-container/sd-base-container";
import { SdDataSheetColumn } from "./sd-data-sheet-column";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { NgIcon } from "@ng-icons/core";
import {
  tablerDeviceFloppy,
  tablerEdit,
  tablerEraser,
  tablerCirclePlus,
  tablerFileExcel,
  tablerRefresh,
  tablerRestore,
  tablerSearch,
  tablerUpload,
} from "@ng-icons/tabler-icons";
import { SdDataSheetBase } from "./sd-data-sheet.base";

//#region SdDataSheet

@Component({
  selector: "sd-data-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdForm,
    SdButton,
    SdSheet,
    SdSheetColumn,
    SdSheetColumnCellTemplate,
    NgTemplateOutlet,
    SdBaseContainer,
    FormatPipe,
    SdAnchor,
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

        <ng-template [ngTemplateOutlet]="pageTopbarTplRef() ?? null" />
      </ng-template>

      <ng-template #contentTpl>
        <div class="flex-column fill">
          @if (parent.canEdit() && parent.submit && parent.viewType() === "control") {
            <div class="flex-row gap-sm p-default bdb bdb-theme-gray-lightest">
              <sd-button [size]="'sm'" [theme]="'primary'" (click)="onSubmitButtonClick()">
                <ng-icon [svg]="icons.tablerDeviceFloppy" />
                저장
                <small>(CTRL+S)</small>
              </sd-button>
              <sd-button [size]="'sm'" [theme]="'info'" (click)="onRefreshButtonClick()">
                <ng-icon [svg]="icons.tablerRefresh" />
                새로고침
                <small>(CTRL+ALT+L)</small>
              </sd-button>
              <ng-template [ngTemplateOutlet]="prevTplRef() ?? null" />
            </div>
          } @else {
            <ng-template [ngTemplateOutlet]="prevTplRef() ?? null" />
          }

          @if (filterTplRef()) {
            <div class="p-default">
              <sd-form (formSubmit)="onFilterSubmit()">
                <div class="form-box-inline">
                  <div>
                    <sd-button [type]="'submit'" [theme]="'info'">
                      <ng-icon [svg]="icons.tablerSearch" />
                      조회
                    </sd-button>
                  </div>
                  <ng-template [ngTemplateOutlet]="filterTplRef()!" />
                </div>
              </sd-form>
            </div>
          }

          @if (!parent.hideTool || !parent.hideTool()) {
            @if (parent.canEdit() || beforeToolTplRef() || parent.downloadExcel) {
              <div class="flex-row gap-sm p-xs-default">
                @if (parent.canEdit()) {
                  @if (parent.editMode === "modal" && parent.editItem) {
                    <sd-button
                      [size]="'sm'"
                      [theme]="'link-primary'"
                      (click)="onCreateItemButtonClick()"
                    >
                      <ng-icon [svg]="icons.tablerCirclePlus" />
                      {{ insertText() ?? "등록" }}
                    </sd-button>
                  } @else if (parent.editMode === "inline" && parent.newItem) {
                    <sd-button
                      [size]="'sm'"
                      [theme]="'link-primary'"
                      (click)="onAddItemButtonClick()"
                    >
                      <ng-icon [svg]="icons.tablerCirclePlus" />
                      행 추가
                    </sd-button>
                  }
                }

                <ng-template [ngTemplateOutlet]="beforeToolTplRef() ?? null" />

                @if (parent.canEdit()) {
                  @if (parent.editMode === "modal" && parent.toggleDeleteItems) {
                    <sd-button
                      [size]="'sm'"
                      [theme]="'link-danger'"
                      (click)="onToggleDeleteItemsButtonClick(true)"
                      [disabled]="!parent.isSelectedItemsHasNotDeleted()"
                    >
                      <ng-icon [svg]="deleteIcon()" />
                      선택 {{ deleteText() ?? "삭제" }}
                    </sd-button>
                    @if (parent.isSelectedItemsHasDeleted()) {
                      <sd-button
                        [size]="'sm'"
                        [theme]="'link-warning'"
                        (click)="onToggleDeleteItemsButtonClick(false)"
                      >
                        <ng-icon [svg]="restoreIcon()" />
                        선택 {{ restoreText() ?? "복구" }}
                      </sd-button>
                    }
                  }

                  @if (parent.uploadExcel) {
                    <sd-button
                      [size]="'sm'"
                      [theme]="'link-success'"
                      (click)="onUploadExcelButtonClick()"
                    >
                      <ng-icon [svg]="icons.tablerUpload" />
                      엑셀 업로드
                    </sd-button>
                  }
                }

                @if (parent.downloadExcel) {
                  <sd-button
                    [size]="'sm'"
                    [theme]="'link-success'"
                    (click)="onDownloadExcelButtonClick()"
                  >
                    <ng-icon [svg]="icons.tablerFileExcel" />
                    엑셀 다운로드
                  </sd-button>
                }

                <ng-template [ngTemplateOutlet]="toolTplRef() ?? null" />
              </div>
            }
          }

          <sd-form #formCtrl (formSubmit)="onSubmit()" class="flex-fill p-default pt-0">
            <sd-sheet
              [key]="parent.key + '-sheet'"
              [items]="parent.items()"
              [(currentPage)]="parent.page"
              [totalPageCount]="parent.pageLength()"
              [(sorts)]="parent.sortingDefs"
              [selectMode]="parent.selectMode()"
              [autoSelect]="parent.autoSelect()"
              [(selectedItems)]="parent.selectedItems"
              [trackByFn]="parent.trackByFn"
              [getItemCellStyleFn]="parent.getItemCellStyleFn"
              [getItemSelectableFn]="parent.getItemSelectableFn"
            >
              @if (
                parent.editMode === "inline" &&
                parent.canEdit() &&
                parent.itemPropInfo.isDeleted
              ) {
                <sd-sheet-column [fixed]="true" [key]="parent.itemPropInfo.isDeleted!">
                  <ng-template [cell]="parent.items()" let-item="item">
                    <div class="p-xs-sm tx-center">
                      <sd-anchor
                        [theme]="'danger'"
                        (click)="onToggleDeleteItemButtonClick(item)"
                        [disabled]="!parent.getItemInfoFn(item).canDelete"
                      >
                        <ng-icon
                          [svg]="
                            item[parent.itemPropInfo.isDeleted!]
                              ? restoreIcon()
                              : deleteIcon()
                          "
                        />
                        {{
                          item[parent.itemPropInfo.isDeleted!]
                            ? (restoreText() ?? "복구")
                            : (deleteText() ?? "삭제")
                        }}
                      </sd-anchor>
                    </div>
                  </ng-template>
                </sd-sheet-column>
              }

              @for (columnControl of columnControls(); track columnControl.key()) {
                <sd-sheet-column
                  [key]="columnControl.key()"
                  [fixed]="columnControl.fixed()"
                  [header]="columnControl.header()"
                  [headerStyle]="columnControl.headerStyle()"
                  [tooltip]="columnControl.tooltip()"
                  [width]="columnControl.width()"
                  [disableSorting]="columnControl.disableSorting()"
                  [disableResizing]="columnControl.disableResizing()"
                  [hidden]="columnControl.hidden()"
                  [collapse]="columnControl.collapse()"
                >
                  @if (columnControl.headerTplRef()) {
                    <ng-template #headerTpl>
                      <ng-template [ngTemplateOutlet]="columnControl.headerTplRef()!" />
                    </ng-template>
                  }
                  @if (columnControl.summaryTplRef()) {
                    <ng-template #summaryTpl>
                      <ng-template [ngTemplateOutlet]="columnControl.summaryTplRef()!" />
                    </ng-template>
                  }

                  <ng-template
                    [cell]="parent.items()"
                    let-item="item"
                    let-index="index"
                    let-depth="depth"
                    let-edit="edit"
                  >
                    @if (
                      parent.editMode === "modal" &&
                      parent.canEdit() &&
                      columnControl.edit() &&
                      parent.getItemInfoFn(item).canEdit
                    ) {
                      <sd-anchor
                        (click)="onEditItemButtonClick(item, index, $event)"
                        class="flex-row"
                      >
                        <div class="p-xs-sm">
                          <ng-icon [svg]="icons.tablerEdit" />
                        </div>
                        <div class="flex-fill">
                          <ng-template
                            [ngTemplateOutlet]="columnControl.cellTplRef()"
                            [ngTemplateOutletContext]="{
                              $implicit: item,
                              item: item,
                              index: index,
                              depth: depth,
                              edit: edit,
                            }"
                          />
                        </div>
                      </sd-anchor>
                    } @else {
                      <ng-template
                        [ngTemplateOutlet]="columnControl.cellTplRef()"
                        [ngTemplateOutletContext]="{
                          $implicit: item,
                          item: item,
                          index: index,
                          depth: depth,
                          edit: edit,
                        }"
                      />
                    }
                  </ng-template>
                </sd-sheet-column>
              }

              @if (parent.itemPropInfo.lastModifiedAt) {
                <sd-sheet-column
                  [header]="'수정일시'"
                  [key]="parent.itemPropInfo.lastModifiedAt!"
                  [hidden]="true"
                >
                  <ng-template [cell]="parent.items()" let-item="item">
                    <div class="p-xs-sm tx-center">
                      {{
                        item[parent.itemPropInfo.lastModifiedAt!]
                          | format: "yyyy-MM-dd HH:mm"
                      }}
                    </div>
                  </ng-template>
                </sd-sheet-column>
              }
              @if (parent.itemPropInfo.lastModifiedBy) {
                <sd-sheet-column
                  [header]="'수정자'"
                  [key]="parent.itemPropInfo.lastModifiedBy!"
                  [hidden]="true"
                >
                  <ng-template [cell]="parent.items()" let-item="item">
                    <div class="p-xs-sm tx-center">
                      {{ item[parent.itemPropInfo.lastModifiedBy!] }}
                    </div>
                  </ng-template>
                </sd-sheet-column>
              }
            </sd-sheet>
          </sd-form>
        </div>
      </ng-template>

      @if (parent.selectMode()) {
        <ng-template #modalBottomTpl>
          <div class="p-sm-default flex-row gap-sm">
            <div class="flex-fill flex-row gap-sm">
              @if (modalBottomTplRef()) {
                <ng-template [ngTemplateOutlet]="modalBottomTplRef()!" />
              }
            </div>

            @if (parent.selectedItemKeys().length > 0) {
              <sd-button [size]="'sm'" [theme]="'danger'" (click)="onCancelButtonClick()">
                {{ parent.selectMode() === "multi" ? "모두" : "선택" }}
                해제
              </sd-button>
            }
            @if (parent.selectMode() === "multi") {
              <sd-button [size]="'sm'" [theme]="'primary'" (click)="onConfirmButtonClick()">
                확인({{ parent.selectedItemKeys().length }})
              </sd-button>
            }
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
export class SdDataSheet {
  parent = injectParent<SdDataSheetBase<any, any, any>>();

  formCtrl = viewChild<SdForm>("formCtrl");

  insertText = input<string>();
  deleteText = input<string>();
  restoreText = input<string>();
  deleteIcon = input(tablerEraser);
  restoreIcon = input(tablerRestore);

  pageTopbarTplRef = contentChild("pageTopbarTpl", { read: TemplateRef });
  prevTplRef = contentChild("prevTpl", { read: TemplateRef });
  filterTplRef = contentChild("filterTpl", { read: TemplateRef });
  beforeToolTplRef = contentChild("beforeToolTpl", { read: TemplateRef });
  toolTplRef = contentChild("toolTpl", { read: TemplateRef });
  modalBottomTplRef = contentChild("modalBottomTpl", { read: TemplateRef });

  columnControls = contentChildren(SdDataSheetColumn);

  modalActionTplRef = viewChild("modalActionTpl", { read: TemplateRef });

  constructor() {
    effect(() => {
      this.parent.actionTplRef = this.modalActionTplRef();
    });
  }

  protected readonly icons = {
    tablerRefresh,
    tablerDeviceFloppy,
    tablerSearch,
    tablerCirclePlus,
    tablerUpload,
    tablerFileExcel,
    tablerEdit,
  };

  onFilterSubmit() {
    this.parent.doFilterSubmit();
  }

  onRefreshButtonClick() {
    this.parent.doRefresh();
  }

  async onCreateItemButtonClick() {
    await this.parent.doEditItem();
  }

  async onEditItemButtonClick(item: any, index: number, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    await this.parent.doEditItem(item);
  }

  async onToggleDeleteItemsButtonClick(del: boolean) {
    await this.parent.doToggleDeleteItems(del);
  }

  onToggleDeleteItemButtonClick(item: any) {
    this.parent.doToggleDeleteItem(item);
  }

  onSubmitButtonClick() {
    this.formCtrl()?.requestSubmit();
  }

  async onSubmit() {
    await this.parent.doSubmit({ permCheck: true });
  }

  async onAddItemButtonClick() {
    await this.parent.doAddItem();
  }

  async onDownloadExcelButtonClick() {
    await this.parent.doDownloadExcel();
  }

  async onUploadExcelButtonClick() {
    await this.parent.doUploadExcel();
  }

  onConfirmButtonClick() {
    this.parent.doModalConfirm();
  }

  onCancelButtonClick() {
    this.parent.doModalCancel();
  }
}

//#endregion
