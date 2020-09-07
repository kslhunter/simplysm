import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  DoCheck,
  EventEmitter,
  forwardRef,
  Input,
  IterableDiffer,
  IterableDiffers,
  Output,
  QueryList
} from "@angular/core";
import { SdInputValidate } from "../commons/SdInputValidate";
import { ISdSheetColumnOrderingVM } from "./SdSheetControl";
import { SdSheetColumnControl } from "./SdSheetColumnControl";

@Component({
  selector: "sd-sheet2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock>
        <div style="float: right">
          <sd-anchor>
            <sd-icon icon="cog" fixedWidth></sd-icon>
          </sd-anchor>
        </div>
        <sd-pagination [page]="1" [pageLength]="20"></sd-pagination>
      </sd-dock>

      <sd-pane>
        <table>
          <thead>
          <tr>
            <th>
              <div class="_cell-content">
                <sd-anchor class="_sheet-cell-default-padding">
                  <sd-icon icon="arrow-right" fixedWidth></sd-icon>
                </sd-anchor>
              </div>
              <div class="_cell-right-border"></div>
            </th>
            <th *ngFor="let columnControl of columnControls; trackBy: trackByFnForColumnControl">
              <div class="_cell _data-cell" [style.width.px]="columnControl.widthPixel">
                <div class="_cell-content">
                  <pre class="_header-text">{{ columnControl.header }}</pre>
                </div>
                <div class="_cell-right-border"></div>
              </div>
            </th>
          </tr>
          </thead>
          <tbody>
          <tr *ngFor="let item of items; let index = index; trackBy: trackByFn">
            <td>
              <div class="_cell-content">
                <sd-anchor class="_sheet-cell-default-padding">
                  <sd-icon icon="arrow-right" fixedWidth></sd-icon>
                </sd-anchor>
              </div>
              <div class="_cell-right-border"></div>
            </td>
            <td *ngFor="let columnControl of columnControls; trackBy: trackByFnForColumnControl">
              <div class="_cell _data-cell" [style.width.px]="columnControl.widthPixel">
                <div class="_cell-content">
                  <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                               [ngTemplateOutletContext]="{item: item, index: index}"></ng-template>
                </div>
                <div class="_cell-right-border"></div>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
        <!--<div class="_sheet">
          &lt;!&ndash; 헤더 구역 &ndash;&gt;
          <div class="_region _head-region">
            &lt;!&ndash; 헤더 ROW &ndash;&gt;
            <div class="_row _header-row">
              &lt;!&ndash; 고정 셀 그룹 &ndash;&gt;
              <div class="_cell-group _fixed-cell-group" [style.width.px]="fixedCellGroupWidthPixel">
                &lt;!&ndash; 기능 셀 &ndash;&gt;
                <div class="_cell _feature-cell" [style.width.px]="featureCellWidthPixel">
                  <div class="_cell-content">
                    <sd-anchor class="_sheet-cell-default-padding">
                      <sd-icon icon="arrow-right" fixedWidth></sd-icon>
                    </sd-anchor>
                  </div>
                  <div class="_cell-right-border"></div>
                </div>
                &lt;!&ndash; 각 컬럼 데이터 셀 &ndash;&gt;
                <ng-template [ngTemplateOutlet]="headerCellsTemplate"
                             [ngTemplateOutletContext]="{columnControls: fixedColumnControls}"></ng-template>
              </div>

              &lt;!&ndash; 비고정 셀 그룹 &ndash;&gt;
              <div class="_cell-group _non-fixed-cell-group" [style.padding-left.px]="fixedCellGroupWidthPixel">
                &lt;!&ndash; 각 컬럼 데이터 셀 &ndash;&gt;
                <ng-template [ngTemplateOutlet]="headerCellsTemplate"
                             [ngTemplateOutletContext]="{columnControls: nonFixedColumnControls}"></ng-template>
              </div>

              &lt;!&ndash; 템플릿: 헤더 셀들 &ndash;&gt;
              <ng-template #headerCellsTemplate let-columnControls="columnControls">
                <ng-container *ngFor="let columnControl of columnControls; trackBy: trackByFnForColumnControl">
                  <div class="_cell _data-cell" [style.width.px]="columnControl.widthPixel">
                    <div class="_cell-content">
                      <pre class="_header-text">{{ columnControl.header }}</pre>
                    </div>
                    <div class="_cell-right-border"></div>
                  </div>
                </ng-container>
              </ng-template>
            </div>
          </div>

          &lt;!&ndash; 바디 구역 &ndash;&gt;
          <div class="_region _body-region">
            &lt;!&ndash; 데이터 ROW들 &ndash;&gt;
            <ng-container *ngFor="let item of items; let index = index; trackBy: trackByFn">
              <div class="_row _data-row">
                &lt;!&ndash; 고정 셀 그룹 &ndash;&gt;
                <div class="_cell-group _fixed-cell-group" [style.width.px]="fixedCellGroupWidthPixel">
                  &lt;!&ndash; 기능 셀 &ndash;&gt;
                  <div class="_cell _feature-cell" [style.width.px]="featureCellWidthPixel">
                    <div class="_cell-content">
                      <sd-anchor class="_sheet-cell-default-padding">
                        <sd-icon icon="arrow-right" fixedWidth></sd-icon>
                      </sd-anchor>
                    </div>
                    <div class="_cell-right-border"></div>
                  </div>
                  &lt;!&ndash; 각 컬럼 데이터 셀 &ndash;&gt;
                  <ng-template [ngTemplateOutlet]="bodyCellsTemplate"
                               [ngTemplateOutletContext]="{columnControls: fixedColumnControls, item: item, index: index}"></ng-template>
                </div>

                &lt;!&ndash; 비고정 셀 그룹 &ndash;&gt;
                <div class="_cell-group _non-fixed-cell-group" [style.padding-left.px]="fixedCellGroupWidthPixel">
                  &lt;!&ndash; 각 컬럼 데이터 셀 &ndash;&gt;
                  <ng-template [ngTemplateOutlet]="bodyCellsTemplate"
                               [ngTemplateOutletContext]="{columnControls: nonFixedColumnControls, item: item, index: index}"></ng-template>
                </div>

                &lt;!&ndash; 템플릿: 바디 셀들 &ndash;&gt;
                <ng-template #bodyCellsTemplate let-columnControls="columnControls" let-item="item" let-index="index">
                  <ng-container *ngFor="let columnControl of columnControls; trackBy: trackByFnForColumnControl">
                    <div class="_cell _data-cell" [style.width.px]="columnControl.widthPixel">
                      <div class="_cell-content">
                        <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                                     [ngTemplateOutletContext]="{item: item, index: index}"></ng-template>
                      </div>
                      <div class="_cell-right-border"></div>
                    </div>
                  </ng-container>
                </ng-template>
              </div>
            </ng-container>
          </div>
        </div>-->
      </sd-pane>
    </sd-dock-container>
  `,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    $border-color: var(--theme-color-grey-lighter);
    $padding: var(--gap-xs) var(--gap-sm);

    :host {
      ._sheet-cell-default-padding {
        padding: $padding;
      }

      > sd-dock-container {
        > sd-dock {

        }

        > sd-pane {
          > ._sheet {
            display: inline-block;
            white-space: nowrap;

            > ._region {
              > ._row {
                position: relative;

                > ._cell-group {
                  display: inline-block;

                  > ._cell {
                    position: relative;
                    display: inline-block;
                    border-bottom: 1px solid $border-color;
                    padding-right: 1px;

                    > ._cell-right-border {
                      position: absolute;
                      top: 0;
                      right: 1px;
                      bottom: 0;
                      width: 1px;
                      background: $border-color;
                    }
                  }
                }

                > ._fixed-cell-group {
                  position: absolute;

                  > ._cell:last-child {
                    padding-right: 2px;

                    > ._cell-right-border {
                      width: 2px;
                    }
                  }
                }
              }
            }

            > ._head-region {
              > ._row {
                > ._cell-group {
                  > ._cell {
                    > ._cell-content {
                      > ._header-text {
                        display: block;
                        text-align: center;
                        padding: $padding;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `]
})
export class SdSheet2Control implements DoCheck {
  public cnt = 0;

  @Input()
  @SdInputValidate(String)
  public key?: string;

  // region var: items

  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public items: any[] = [];

  @Input()
  @SdInputValidate({ type: Function, notnull: true })
  public trackByFn = (index: number, item: any): any => item;

  // endregion

  // region var: paging

  @Input()
  @SdInputValidate({ type: Number, notnull: true })
  public pageLength = 0;

  @Input()
  @SdInputValidate({ type: Number, notnull: true })
  public page = 0;

  @Output()
  public readonly pageChange = new EventEmitter<number>();

  @Input()
  public ordering: ISdSheetColumnOrderingVM[] = [];

  @Output()
  public readonly orderingChange = new EventEmitter<ISdSheetColumnOrderingVM[]>();

  // endregion

  // region var: selection

  @Input()
  @SdInputValidate({ type: String, includes: ["single", "multi"] })
  public selectMode?: "single" | "multi";

  @Input()
  @SdInputValidate({ type: String, includes: ["click", "focus"] })
  public autoSelect?: "click" | "focus";

  @Input()
  @SdInputValidate(Function)
  public getItemSelectableFn?: (index: number, item: any) => any;

  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public selectedItems: any[] = [];

  @Output()
  public readonly selectedItemsChange = new EventEmitter<any[]>();

  // endregion

  @ContentChildren(forwardRef(() => SdSheetColumnControl))
  public columnControls?: QueryList<SdSheetColumnControl>;

  public trackByFnForColumnControl = (index: number, item: SdSheetColumnControl): any => item.guid;

  public fixedColumnControls: SdSheetColumnControl[] = [];
  public nonFixedColumnControls: SdSheetColumnControl[] = [];

  public featureCellWidthPixel = 30;
  public fixedCellGroupWidthPixel = 0;

  private readonly _columnControlsDiffer: IterableDiffer<SdSheetColumnControl>;

  public constructor(private readonly _iterableDiffers: IterableDiffers) {
    this._columnControlsDiffer = this._iterableDiffers.find(this.columnControls ?? [])
      .create((i: number, item: SdSheetColumnControl) => this.trackByFn(i, item));
  }

  public ngDoCheck(): void {
    const columnControlsChanges = this._columnControlsDiffer.diff(this.columnControls);
    if (columnControlsChanges) {
      console.log("reload");
      this.fixedColumnControls = this.columnControls?.filter(item => item.fixed === true) ?? [];
      this.nonFixedColumnControls = this.columnControls?.filter(item => item.fixed !== true) ?? [];

      this.fixedCellGroupWidthPixel =
        (this.fixedColumnControls.sum(item => item.widthPixel) ?? 0) +
        this.featureCellWidthPixel;
    }
  }
}