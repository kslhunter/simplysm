import { ChangeDetectionStrategy, Component, contentChildren, inject } from "@angular/core";
import { SdBusyContainerControl } from "../../../controls/busy/sd-busy-container.control";
import { SdDockContainerControl } from "../../../controls/layout/sd-dock-container.control";
import { SdDockControl } from "../../../controls/layout/sd-dock.control";
import { SdFormControl } from "../../../controls/form/sd-form.control";
import { SdFormBoxControl } from "../../../controls/form-layout/sd-form-box.control";
import { SdFormBoxItemControl } from "../../../controls/form-layout/sd-form-box-item.control";
import { SdButtonControl } from "../../../controls/button/sd-button.control";
import { SdIconControl } from "../../../controls/icon/sd-icon.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdPaneControl } from "../../../controls/layout/sd-pane.control";
import { SdSheetControl } from "../../../controls/sheet/sd-sheet.control";
import { SdSheetColumnDirective } from "../../../controls/sheet/sd-sheet-column.directive";
import {
  SdSheetColumnCellTemplateDirective,
} from "../../../controls/sheet/sd-sheet-column-cell.template-directive";
import { SdAnchorControl } from "../../../controls/button/sd-anchor.control";
import { FormatPipe } from "../../../pipes/format.pipe";
import { SdAngularConfigProvider } from "../../../providers/sd-angular-config.provider";
import { injectParent } from "../../../utils/injectParent";
import { SdSheetViewAbstract } from "./sd-sheet-view.abstract";
import { SdSheetViewFilterDirective } from "./sd-sheet-view-filter.directive";
import { SdSheetViewColumnDirective } from "./sd-sheet-view-column.directive";

@Component({
  selector: "sd-sheet-view-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdDockContainerControl,
    SdDockControl,
    SdFormControl,
    SdFormBoxControl,
    SdFormBoxItemControl,
    SdButtonControl,
    SdIconControl,
    NgTemplateOutlet,
    SdPaneControl,
    SdSheetControl,
    SdSheetColumnDirective,
    SdSheetColumnCellTemplateDirective,
    SdAnchorControl,
    FormatPipe,
  ],
  template: `
    <sd-busy-container [busy]="$.busyCount() > 0" class="p-lg">
      @if ($.initialized()) {
        <sd-dock-container class="show-effect">
          <sd-dock class="pb-lg">
            <sd-form (submit)="$.onFilterSubmit()">
              <sd-form-box layout="inline">
                <sd-form-box-item>
                  <sd-button type="submit" theme="info">
                    <sd-icon [icon]="icons.search" fixedWidth />
                    조회
                  </sd-button>
                </sd-form-box-item>

                @for (filterControl of filterControls(); track filterControl) {
                  <sd-form-box-item
                    [label]="filterControl.label()"
                    [labelTooltip]="filterControl.labelTooltip()"
                  >
                    @if (filterControl.labelTemplateRef()) {
                      <ng-template #label>
                        <ng-template [ngTemplateOutlet]="filterControl.labelTemplateRef()!" />
                      </ng-template>
                    }
                    <ng-template [ngTemplateOutlet]="filterControl.contentTemplateRef()" />
                  </sd-form-box-item>
                }
              </sd-form-box>
            </sd-form>
          </sd-dock>

          <sd-dock class="pb-xs">
            <div class="flex-row flex-gap-sm">
              @if (this.$.vm.perms().includes("edit")) {
                <sd-button size="sm" theme="link-primary" (click)="$.onCreateItemButtonClick()">
                  <sd-icon [icon]="icons.plusCircle" fixedWidth />
                  등록 <small>(CTRL+INSERT)</small>
                </sd-button>

                @if (!$.selectMode()) {
                  <sd-button
                    size="sm"
                    theme="link-danger"
                    (click)="$.onDeleteSelectedItemsButtonClick()"
                    [disabled]="!$.isSelectedItemsHasNotDeleted()"
                  >
                    <sd-icon [icon]="icons.eraser" [fixedWidth]="true" />
                    선택 삭제
                  </sd-button>
                  @if ($.isSelectedItemsHasDeleted()) {
                    <sd-button
                      size="sm"
                      theme="link-warning"
                      (click)="$.onRestoreSelectedItemsButtonClick()"
                    >
                      <sd-icon [icon]="icons.redo" [fixedWidth]="true" />
                      선택 복구
                    </sd-button>
                  }
                }

                <sd-button size="sm" theme="link-success" (click)="$.onUploadExcelButtonClick()">
                  <sd-icon [icon]="icons.upload" fixedWidth />
                  엑셀 업로드
                </sd-button>
              }

              <sd-button size="sm" theme="link-success" (click)="$.onDownloadExcelButtonClick()">
                <sd-icon [icon]="icons.fileExcel" fixedWidth />
                엑셀 다운로드
              </sd-button>
            </div>
          </sd-dock>

          <sd-pane>
            <sd-sheet
              [key]="$.vm.key + '-sheet'"
              [items]="$.items()"
              [(page)]="$.page"
              [pageLength]="$.pageLength()"
              [(ordering)]="$.ordering"
              [getItemCellStyleFn]="$.getItemCellStyleFn"
              [selectMode]="$.selectMode() ?? 'multi'"
              [autoSelect]="$.selectMode() === 'single' ? 'click' : undefined"
              [(selectedItems)]="$.selectedItems"
              (selectedItemsChange)="$.onSelectedItemsChange($event)"
            >
              <sd-sheet-column fixed header="#" resizable useOrdering key="id">
                <ng-template [cell]="$.items()" let-item>
                  <div class="p-xs-sm">
                    @if (this.$.vm.perms().includes("edit")) {
                      <sd-anchor (click)="$.onItemClick(item, $event)" class="flex-row flex-gap-sm">
                        <div>
                          <sd-icon [icon]="icons.edit" />
                        </div>
                        <div class="flex-grow tx-right">
                          {{ item.id }}
                        </div>
                      </sd-anchor>
                    } @else {
                      <div class="tx-right">
                        {{ item.id }}
                      </div>
                    }
                  </div>
                </ng-template>
              </sd-sheet-column>

              @for (columnControl of columnControls(); track columnControl.key()) {
                <sd-sheet-column
                  [key]="columnControl.key()"
                  [fixed]="columnControl.fixed()"
                  [header]="columnControl.header()"
                  [headerStyle]="columnControl.headerStyle()"
                  [tooltip]="columnControl.tooltip()"
                  [width]="columnControl.width()"
                  [useOrdering]="columnControl.useOrdering()"
                  [resizable]="columnControl.resizable()"
                  [hidden]="columnControl.hidden()"
                  [collapse]="columnControl.collapse()"
                >
                  @if (columnControl.headerTemplateRef()) {
                    <ng-template #header>
                      <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef()!" />
                    </ng-template>
                  }

                  @if (columnControl.summaryTemplateRef()) {
                    <ng-template #summary>
                      <ng-template [ngTemplateOutlet]="columnControl.summaryTemplateRef()!" />
                    </ng-template>
                  }

                  <ng-template
                    [cell]="$.items()"
                    let-item
                    let-index="index"
                    let-depth="depth"
                    let-edit="edit"
                  >
                    <ng-template
                      [ngTemplateOutlet]="columnControl.cellTemplateRef() ?? null"
                      [ngTemplateOutletContext]="{
                        $implicit: item,
                        item: item,
                        index: index,
                        depth: depth,
                        edit: edit,
                      }"
                    />
                  </ng-template>
                </sd-sheet-column>
              }

              <sd-sheet-column
                [header]="['최종수정', '일시']"
                resizable
                useOrdering
                key="lastModifyDateTime"
              >
                <ng-template [cell]="$.items()" let-item>
                  <div class="p-xs-sm tx-center">
                    {{ item.lastModifyDateTime | format: "yyyy-MM-dd HH:mm" }}
                  </div>
                </ng-template>
              </sd-sheet-column>
              <sd-sheet-column
                [header]="['최종수정', '이름']"
                resizable
                useOrdering
                key="lastModifierName"
              >
                <ng-template [cell]="$.items()" let-item>
                  <div class="p-xs-sm tx-center">
                    {{ item.lastModifierName }}
                  </div>
                </ng-template>
              </sd-sheet-column>
            </sd-sheet>
          </sd-pane>
        </sd-dock-container>
      }
    </sd-busy-container>
  `,
})
export class SdSheetViewBaseControl {
  icons = inject(SdAngularConfigProvider).icons;

  $ = injectParent(SdSheetViewAbstract);

  filterControls = contentChildren(SdSheetViewFilterDirective);
  columnControls = contentChildren(SdSheetViewColumnDirective);
}