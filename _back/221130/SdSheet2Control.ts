import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  NgZone,
  OnInit,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import { SdSheet2ColumnControl } from "./SdSheet2ColumnControl";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { NumberUtil, ObjectUtil } from "@simplysm/sd-core-common";
import { SdSystemConfigRootProvider } from "../root-providers/SdSystemConfigRootProvider";
import { SdModalProvider } from "../providers/SdModalProvider";
import { SdSheet2ConfigModal } from "../modals/SdSheet2ConfigModal";
import { HTMLElementUtil } from "@simplysm/sd-core-browser";

@Component({
  selector: "sd-sheet2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="!isInitialized">
      <sd-dock-container [hidden]="!isInitialized">
        <sd-dock *ngIf="(key || pageLength > 0) && !hideConfigBar">
          <sd-flex direction="row" gap="sm">
            <sd-anchor class="_cog-btn" *ngIf="key"
                       (click)="onConfigButtonClick()">
              <fa-icon [icon]="icons.fasCog | async" [fixedWidth]="true"></fa-icon>
            </sd-anchor>
            <sd-pagination [page]="page"
                           [pageLength]="pageLength"
                           (pageChange)="onPageChange($event)"></sd-pagination>
          </sd-flex>
        </sd-dock>

        <sd-pane #sheetContainer class="_sheet-container">
          <table class="_sheet">
            <thead>
            <ng-container *ngFor="let depth of createArrayByLength(maxHeaderDepth)">
              <tr>
                <th class="_fixed _feature-cell" *ngIf="depth === 0"
                    [attr.rowspan]="maxHeaderDepth + (hasSummaryTemplate ? 1 : 0)"
                    (sdResizeOutside)="onFixedCellResizeOutside()">
                  <div class="_contents sd-padding-xs-sm">
                    <ng-container *ngIf="selectMode === 'multi' && hasSelectableItems">
                      <fa-icon [icon]="icons.fasArrowRight | async" [fixedWidth]="true"
                               [class.sd-text-brightness-lightest]="!isAllItemsSelected"
                               [class.sd-text-brightness-primary-default]="isAllItemsSelected"
                               style="cursor:pointer;"
                               (click)="onAllItemsSelectIconClick()"></fa-icon>
                    </ng-container>
                  </div>
                </th>
                <th class="_fixed _feature-cell" *ngIf="getChildrenFn && depth === 0"
                    [attr.rowspan]="maxHeaderDepth + (hasSummaryTemplate ? 1 : 0)"
                    (sdResizeOutside)="onFixedCellResizeOutside()">
                  <div class="_contents sd-padding-xs-sm">
                    <fa-icon [icon]="icons.fasCaretRight | async" [fixedWidth]="true"
                             [rotate]="isAllItemsExpanded ? 90 : undefined"
                             (click)="onAllItemsExpandIconClick()"
                             [class.sd-text-brightness-lightest]="!isAllItemsExpanded"
                             [class.sd-text-color-primary-default]="isAllItemsExpanded"
                             style="cursor:pointer;"></fa-icon>
                  </div>
                </th>
                <ng-container
                  *ngFor="let columnDef of displayColumnDefs; let c = index; trackBy: trackByFnForColumnDef">
                  <ng-container *ngIf="getColumnHeader(columnDef, depth) as header">
                    <th #th
                        [attr.rowspan]="getColumnHeaderRowSpan(columnDef, depth)"
                        [attr.colspan]="getColumnHeaderColSpan(columnDef, depth)"
                        [class._fixed]="columnDef.fixed"
                        [class._last-depth]="!hasSummaryTemplate && getIsLastHeaderDepth(columnDef, depth)"
                        [style]="!getColumnHeaderColSpan(columnDef, depth) ? getCellWidthStyle(columnDef) : undefined"
                        [attr.title]="getIsLastHeaderDepth(columnDef, depth) ? (columnDef.control.tooltip ?? header) : undefined"
                        [class.sd-help]="getIsLastHeaderDepth(columnDef, depth) && columnDef.control.tooltip"
                        (sdResizeOutside)="columnDef.fixed ? onFixedCellResizeOutside() : undefined"
                        [attr.c]="c">
                      <div class="_contents"
                           [class._clickable]="columnDef.control.useOrdering && columnDef.control.key"
                           (click)="onHeaderClick($event, columnDef)">
                        <ng-container *ngIf="!columnDef.control.headerTemplateRef">
                          <div class="_text">{{ header }}</div>
                        </ng-container>
                        <ng-container *ngIf="columnDef.control.headerTemplateRef">
                          <ng-template [ngTemplateOutlet]="columnDef.control.headerTemplateRef"></ng-template>
                        </ng-container>
                        <div
                          *ngIf="columnDef.control.useOrdering && columnDef.control.key && getIsLastHeaderDepth(columnDef, depth)"
                          class="_sort-icon">
                          <fa-layers>
                            <fa-icon [icon]="icons.fasSort | async" class="sd-text-brightness-lightest"></fa-icon>
                            <fa-icon [icon]="icons.fasSortDown | async"
                                     *ngIf="getIsColumnOrderingDesc(columnDef) === false"></fa-icon>
                            <fa-icon [icon]="icons.fasSortUp | async"
                                     *ngIf="getIsColumnOrderingDesc(columnDef) === true"></fa-icon>
                          </fa-layers>
                          <sub *ngIf="getColumnOrderingIndexText(columnDef) as text">{{ text }}</sub>
                        </div>
                      </div>

                      <div class="_resizer"
                           *ngIf="columnDef.control.resizable && getIsLastHeaderDepth(columnDef, depth)"
                           (mousedown)="onResizerMousedown($event, c, columnDef)"></div>
                    </th>
                  </ng-container>
                </ng-container>
              </tr>
            </ng-container>
            <ng-container *ngIf="hasSummaryTemplate">
              <tr class="_summary-row">
                <ng-container
                  *ngFor="let columnDef of displayColumnDefs; let c = index; trackBy: trackByFnForColumnDef">
                  <th
                    [style]="getCellWidthStyle(columnDef)"
                    [class._fixed]="columnDef.fixed"
                    [attr.c]="c">
                    <div class="_contents">
                      <ng-container *ngIf="columnDef.control.summaryTemplateRef">
                        <ng-template [ngTemplateOutlet]="columnDef.control.summaryTemplateRef"></ng-template>
                      </ng-container>
                    </div>
                  </th>
                </ng-container>
              </tr>
            </ng-container>
            </thead>
            <tbody>
            <ng-container *ngFor="let itemDef of displayItemDefs; let r = index; trackBy: trackByFnForItemDef;">
              <tr [attr.r]="r" [hidden]="itemDef.parentDef && !getIsAllParentItemExpanded(itemDef)">
                <td class="_fixed _feature-cell">
                  <div class="_contents sd-padding-xs-sm">
                    <ng-container *ngIf="selectMode && getItemSelectable(itemDef)">
                      <fa-icon [icon]="icons.fasArrowRight | async" [fixedWidth]="true"
                               [class.sd-text-brightness-lightest]="!selectedItems.includes(itemDef.item)"
                               [class.sd-text-color-primary-default]="selectedItems.includes(itemDef.item)"
                               style="cursor:pointer;"
                               (click)="onItemSelectIconClick(itemDef)"></fa-icon>
                    </ng-container>
                  </div>
                </td>
                <td class="_fixed _feature-cell" *ngIf="getChildrenFn">
                  <div class="_contents sd-padding-xs-sm">
                    <ng-container *ngIf="itemDef.depth > 0">
                      <div class="_depth-indicator" [style.margin-left.em]="itemDef.depth - .5">
                      </div>
                    </ng-container>
                    <ng-container *ngIf="itemDef.hasChildren">
                      <fa-icon [icon]="icons.fasCaretRight | async" [fixedWidth]="true"
                               [rotate]="expandedItems.includes(itemDef.item) ? 90 : undefined"
                               (click)="onItemExpandIconClick(itemDef)"
                               [class.sd-text-brightness-lightest]="!expandedItems.includes(itemDef.item)"
                               [class.sd-text-color-primary-default]="expandedItems.includes(itemDef.item)"
                               style="cursor:pointer;"></fa-icon>
                    </ng-container>
                  </div>
                </td>
                <ng-container
                  *ngFor="let columnDef of displayColumnDefs; let c = index; trackBy: trackByFnForColumnDef">
                  <td #td
                      tabindex="0"
                      [class._fixed]="columnDef.fixed"
                      [style]="getCellWidthStyle(columnDef)"
                      [attr.r]="r" [attr.c]="c"
                      (dblclick)="onCellDoubleClick()">
                    <div class="_contents">
                      <ng-template [ngTemplateOutlet]="columnDef.control.cellTemplateRef"
                                   [ngTemplateOutletContext]="{item: itemDef.item, index: r, depth: itemDef.depth, edit: getIsCellEditMode(td) }"></ng-template>
                    </div>
                  </td>
                </ng-container>
              </tr>
            </ng-container>
            </tbody>
          </table>

          <div class="_row-select-indicator-container"></div>
          <div class="_focus-cell-indicator"></div>
          <div class="_focus-row-indicator"></div>
        </sd-pane>
      </sd-dock-container>
    </sd-busy-container>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    $z-index-fixed: 1;
    $z-index-head: 2;
    $z-index-head-fixed: 3;
    $z-index-focus-row-indicator: 4;
    $z-index-row-select-indicator: 5;
    $z-index-focus-cell-indicator: 6;

    $border-color: var(--theme-color-blue-grey-lightest);
    $border-color-dark: var(--theme-color-grey-light);

    :host {
      ::ng-deep > sd-busy-container {
        border-radius: var(--border-radius-default);

        > ._screen {
          border-radius: var(--border-radius-default);
        }

        > sd-dock-container > ._content {
          border: 1px solid $border-color-dark;
          border-radius: var(--border-radius-default);

          > sd-dock > ._content {
            background: white;
            border-top-left-radius: var(--border-radius-default);
            border-top-right-radius: var(--border-radius-default);
            border-bottom: 1px solid $border-color-dark;

            ._cog-btn {
              padding: var(--gap-xs) var(--gap-sm);
              margin: var(--gap-xs);
              border-radius: var(--border-radius-default);

              &:hover {
                background: var(--theme-color-grey-lightest);
              }
            }
          }
        }

        ._sheet-container {
          background: var(--background-color);
          border-radius: var(--border-radius-default);

          > ._sheet {
            border-spacing: 0;
            table-layout: fixed;
            border-right: 1px solid $border-color-dark;
            border-bottom: 1px solid $border-color-dark;
            margin-right: 2px;
            margin-bottom: 2px;

            > * > tr > * {
              border-right: 1px solid $border-color;
              border-bottom: 1px solid $border-color;
              white-space: nowrap;
              overflow: hidden;
              padding: 0;

              &._feature-cell {
                background: var(--theme-color-grey-lightest);
                min-width: 2em;
              }

              &._fixed {
                position: sticky;

                &:has(+:not(._fixed)) {
                  border-right: 1px solid $border-color-dark;
                }
              }
            }

            > thead {
              position: sticky;
              top: 0;
              z-index: $z-index-head;

              > tr > th {
                position: relative;
                background: var(--theme-color-grey-lightest);
                vertical-align: bottom;

                &._fixed {
                  z-index: $z-index-head-fixed;
                }

                &._last-depth {
                  border-bottom: 1px solid $border-color-dark;
                }

                &._feature-cell {
                  border-bottom: 1px solid $border-color-dark;
                }

                > ._contents {
                  > ._text {
                    padding: var(--sd-sheet-padding-v) var(--sd-sheet-padding-h);
                  }

                  &._clickable {
                    cursor: pointer;

                    &:hover {
                      text-decoration: underline;
                    }
                  }

                  > ._sort-icon {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    display: inline-block;
                    padding: var(--gap-xs);
                    background-color: var(--theme-color-grey-lightest);
                  }
                }

                > ._resizer {
                  position: absolute;
                  top: 0;
                  right: 0;
                  bottom: 0;
                  width: 2px;
                  cursor: ew-resize;
                }
              }

              > tr._summary-row > th {
                background: var(--theme-color-warning-lightest);
                text-align: left;
              }

              > tr:last-child > th {
                border-bottom: 1px solid $border-color-dark;
              }
            }

            > tbody > tr > td {
              background: white;

              &._fixed {
                z-index: $z-index-fixed;
              }

              > ._contents > ._depth-indicator {
                display: inline-block;
                margin-top: .4em;
                width: .5em;
                height: .5em;
                border-left: 1px solid var(--text-brightness-default);
                border-bottom: 1px solid var(--text-brightness-default);
                vertical-align: top;
              }
            }
          }

          > ._focus-cell-indicator {
            display: none;
            position: absolute;
            border: 2px solid var(--theme-color-primary-default);
            pointer-events: none;

            z-index: $z-index-focus-cell-indicator;
          }

          > ._focus-row-indicator {
            display: none;
            position: absolute;
            pointer-events: none;
            background: var(--theme-color-grey-default);
            opacity: .1;

            z-index: $z-index-focus-row-indicator;
          }

          > ._row-select-indicator-container {
            display: none;
            position: absolute;
            pointer-events: none;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;

            z-index: $z-index-row-select-indicator;

            &:has(> ._row-select-indicator) {
              display: block;
            }

            > ._row-select-indicator {
              position: absolute;
              pointer-events: none;
              background: var(--theme-color-primary-default);
              opacity: .1;
            }
          }
        }
      }

      &[sd-inset=true] {
        ::ng-deep > sd-busy-container > sd-dock-container > ._content {
          border: none;
          border-radius: 0;
        }
      }
    }
  `]
})
export class SdSheet2Control<T> implements OnInit, DoCheck {
  public icons = {
    fasCog: import("@fortawesome/pro-solid-svg-icons/faCog").then(m => m.faCog),
    fasTable: import("@fortawesome/pro-solid-svg-icons/faTable").then(m => m.faTable),
    fasSort: import("@fortawesome/pro-solid-svg-icons/faSort").then(m => m.faSort),
    fasSortDown: import("@fortawesome/pro-solid-svg-icons/faSortDown").then(m => m.faSortDown),
    fasSortUp: import("@fortawesome/pro-solid-svg-icons/faSortUp").then(m => m.faSortUp),
    fasArrowRight: import("@fortawesome/pro-solid-svg-icons/faArrowRight").then(m => m.faArrowRight),
    fasCaretRight: import("@fortawesome/pro-solid-svg-icons/faCaretRight").then(m => m.faCaretRight)
  };

  @ViewChild("sheetContainer", { static: true, read: ElementRef })
  public sheetContainerElRef?: ElementRef<HTMLElement>;

  @ContentChildren(forwardRef(() => SdSheet2ColumnControl))
  public columnControls?: QueryList<SdSheet2ColumnControl>;

  /**
   * 시트설정 저장 키
   */
  @Input()
  @SdInputValidate(String)
  public key?: string;

  /**
   * 설정 및 페이징 바 표시여부
   */
  @Input()
  @SdInputValidate(Boolean)
  public hideConfigBar?: boolean;

  /**
   * BORDER를 없애는등 다른 박스안에 완전히 붙임
   */
  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  @HostBinding("attr.sd-inset")
  public inset = false;

  /**
   * 선택모드 (single = 단일선택, multi = 다중선택)
   */
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["single", "multi"]
  })
  public selectMode?: "single" | "multi";

  /**
   * 선택된 항목들
   */
  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public selectedItems: T[] = [];

  /**
   * 선택된 항목 변경 이벤트
   */
  @Output()
  public readonly selectedItemsChange = new EventEmitter<T[]>();

  /**
   * 자동선택모드 (undefined = 사용안함, click = 셀 클릭시 해당 ROW 선택, focus = 셀 포커싱시 해당 ROW 선택)
   */
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["click", "focus"]
  })
  public autoSelect?: "click" | "focus";

  /**
   * 항목별로 선택가능여부를 설정하는 함수
   */
  @Input()
  @SdInputValidate(Function)
  public getItemSelectableFn?: (item: T) => boolean;

  /**
   * 정렬규칙
   */
  @Input()
  public ordering: ISdSheet2ColumnOrderingVM[] = [];

  /**
   * 정렬규칙 변경 이벤트
   */
  @Output()
  public readonly orderingChange = new EventEmitter<ISdSheet2ColumnOrderingVM[]>();

  /**
   * [pagination] 현재 표시 페이지
   */
  @Input()
  @SdInputValidate({ type: Number, notnull: true })
  public page = 0;

  /**
   * [pagination] 현재 표시페이지 변화 이벤트
   */
  @Output()
  public readonly pageChange = new EventEmitter<number>();

  /**
   * [pagination] 총 페이지 길이
   */
  @Input()
  @SdInputValidate({ type: Number, notnull: true })
  public get pageLength(): number {
    if (this.pageItemCount !== undefined && this.pageItemCount !== 0 && this.items.length > 0) {
      return Math.ceil(this.items.length / this.pageItemCount);
    }
    else {
      return this._pageLength;
    }
  }

  public set pageLength(value: number) {
    this._pageLength = value;
  }

  private _pageLength = 0;

  /**
   * [pagination] 한 페이지에 표시할 항목수 (설정된 경우, 'pageLength'가 무시되고, 자동계산 됨)
   */
  @Input()
  @SdInputValidate(Number)
  public pageItemCount?: number;

  /**
   * 항목들
   */
  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public items: T[] = [];

  /**
   * 데이터 키를 가져오기 위한 함수 (ROW별로 반드시 하나의 값을 반환해야함)
   * @param index 'items'내의 index
   * @param item items[index] 데이터
   */
  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  public trackByFn = (index: number, item: T): any => item;

  /**
   * 항목 키 다운 이벤트
   */
  @Output()
  public readonly itemKeydown = new EventEmitter<ISdSheet2ItemKeydownEventParam<T>>();

  /**
   * Children 설정하는 함수
   */
  @Input()
  @SdInputValidate(Function)
  public getChildrenFn?: (index: number, item: T) => (T[] | undefined);

  /**
   * 확장된 항목 목록
   */
  @Input()
  public expandedItems: T[] = [];

  /**
   * 확장된 항목 변경 이벤트
   */
  @Output()
  public readonly expandedItemsChange = new EventEmitter<T[]>();

  /**
   * 컬럼용 trackByFn
   * @param index
   * @param colDef
   */
  public trackByFnForColumnDef = (index: number, colDef: IColumnDef): string => colDef.control.guid.toString();

  /**
   * trackByFn def용을 item용으로 변환
   * @param index
   * @param itemDef
   */
  public trackByFnForItemDef = (index: number, itemDef: IItemDef<T>): any => this.trackByFn(index, itemDef.item);

  /**
   * 시트설정
   */
  public config?: ISdSheet2ConfigVM;

  /**
   * 초기화 완료 여부
   */
  public isInitialized = false;

  /**
   * 시트의 상태가 에디트 모드인지 여부
   */
  public editMode = false;

  /**
   * 리사이징 중인 컬럼 GUID
   * @private
   */
  public resizingDef?: { guid: string; width?: string };

  private _displayItemDefs: IItemDef<T>[] = [];

  /**
   * 화면에 표시할 항목 목록
   */
  public get displayItemDefs(): IItemDef<T>[] {
    let result = this.items;
    if (this.pageItemCount !== undefined && this.pageItemCount !== 0 && this.items.length > 0) {
      result = result.slice(this.page * this.pageItemCount, (this.page + 1) * this.pageItemCount);
    }

    let resultDefs = result.map((item) => ({
      item,
      depth: 0,
      hasChildren: false
    }));

    if (this.getChildrenFn) {
      let fn = (arr: IItemDef<T>[]): IItemDef<T>[] => {
        let fnResult: IItemDef<T>[] = [];
        for (let i = 0; i < arr.length; i++) {
          fnResult.push(arr[i]);

          const children = this.getChildrenFn!(i, arr[i].item) ?? [];
          if (children.length > 0) {
            arr[i].hasChildren = true;
            fnResult.push(...fn(children.map((item) => ({
              item,
              parentDef: arr[i],
              hasChildren: false,
              depth: arr[i].depth + 1
            }))));
          }
        }

        return fnResult;
      };

      resultDefs = fn(resultDefs);
    }

    this._displayItemDefs = resultDefs;
    return resultDefs;
  }

  /**
   * 화면에 표시할 컬럼 컨트롤 목록
   */
  public displayColumnDefs: IColumnDef[] | undefined;

  private _reloadDisplayColumnDefs(): void {
    this.displayColumnDefs = this.columnControls?.toArray()
      .map((item) => {
        const config = item.key !== undefined ? this.config?.columns?.[item.key] : undefined;
        return {
          control: item,
          fixed: config?.fixed ?? item.fixed ?? false,
          width: config?.width ?? item.width,
          hidden: config?.hidden ?? item.hidden ?? false
        };
      })
      .filter((item) => !item.hidden && !item.control.collapse)
      .orderBy((item) => {
        if (item.control.key !== undefined && this.config && this.config.columns) {
          return this.config.columns[item.control.key]?.displayOrder ?? Number.MAX_VALUE;
        }
        return Number.MAX_VALUE;
      })
      .orderBy((item) => (item.fixed ? -1 : 0));
  }

  /**
   * 헤더의 최종 깊이 번호 (row index)
   */
  public get maxHeaderDepth(): number {
    return this.displayColumnDefs
      ?.max((item) => item.control.header instanceof Array ? item.control.header.length : 1) ?? 1;
  }

  /**
   * 최종 셀의 주소
   */
  public get endCellAddr(): { r: number; c: number } {
    if (!this.sheetContainerElRef) return { r: 0, c: 0 };
    const rowEls = this.sheetContainerElRef.nativeElement.findAll("> ._sheet > tbody > tr");

    return {
      r: rowEls.length - 1,
      c: (this.displayColumnDefs?.length ?? 0) - 1
    };
  }

  /**
   * 요약 ROW 존재 여부
   */
  public get hasSummaryTemplate(): boolean {
    return this.displayColumnDefs?.some((item) => item.control.summaryTemplateRef) ?? false;
  }

  /**
   * 선택가능한 항목을 가지고 있는지 여부
   */
  public get hasSelectableItems(): boolean {
    if (!this.selectMode) return false;
    return this._displayItemDefs.some((item) => this.getItemSelectable(item));
  }

  /**
   * 현재 존재하는 모든 선택가능한 항목이 선택되어있는지 여부
   */
  public get isAllItemsSelected(): boolean {
    const selectableItemDefs = this._displayItemDefs.filter((item) => this.getItemSelectable(item));
    return selectableItemDefs.length <= this.selectedItems.length && selectableItemDefs.every((itemDef) => this.selectedItems.includes(itemDef.item));
  }

  /**
   * 현재 존재하는 모든 확장가능한 항목이 확장되어있는지 여부
   */
  public get isAllItemsExpanded(): boolean {
    const expandableItemDefs = this._displayItemDefs.filter((item) => item.hasChildren);
    return expandableItemDefs.length <= this.expandedItems.length && expandableItemDefs.every((itemDef) => this.expandedItems.includes(itemDef.item));
  }

  public constructor(private readonly _cdr: ChangeDetectorRef,
                     private readonly _zone: NgZone,
                     private readonly _systemConfig: SdSystemConfigRootProvider,
                     private readonly _modal: SdModalProvider,
                     private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public async ngOnInit(): Promise<void> {
    await this._reloadConfigAsync();

    this._zone.runOutsideAngular(() => {
      const el = this._elRef.nativeElement;

      el.addEventListener("keydown", this._onKeyDownAllChildrenOutside.bind(this), true);
      el.addEventListener("focus", this._onFocusAllChildrenOutsideAsync.bind(this), true);
      el.addEventListener("blur", this._onBlurAllChildrenOutsideAsync.bind(this), true);
      el.addEventListener("click", this._onClickAllChildrenOutside.bind(this), true);
      el.addEventListener("mousedown", this._onMousedownAllChildrenOutside.bind(this), true);
      el.addEventListener("scroll", this._onScrollAllChildrenOutsideAsync.bind(this), true);
    });

    this.isInitialized = true;
    this._cdr.markForCheck();
  }

  private _scrollTimer?: NodeJS.Timer;

  private async _onFocusAllChildrenOutsideAsync(event: FocusEvent): Promise<void> {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.tagName !== "TD" && !event.target.findParent("td")) return;

    clearTimeout(this._scrollTimer);
    this._scrollTimer = setTimeout(() => {
      this._forceScrollToFocusedCellOutside();
    }, 0);

    await this._redrawFocusIndicatorOutsideAsync();

    const addr = this.getCellAddr(event.target.tagName === "TD" ? event.target : event.target.findParent("td")!);
    const itemDef = this._displayItemDefs[addr.r];

    if (this.autoSelect === "focus" && this.getItemSelectable(itemDef)) {
      this._zone.run(() => {
        this._selectItemDef(itemDef);
        this._cdr.markForCheck();
      });
    }
  }

  private async _onBlurAllChildrenOutsideAsync(event: FocusEvent): Promise<void> {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.tagName !== "TD" && !event.target.findParent("td")) return;

    await this._redrawFocusIndicatorOutsideAsync();
  }

  private _onKeyDownAllChildrenOutside(event: KeyboardEvent): void {
    if (!(event.target instanceof HTMLElement)) return;

    if (event.target.tagName === "TD") {
      if (event.key === "F2") {
        event.preventDefault();
        this._setIsFocusedCellEditMode(true);
      }
      else if (event.key === "ArrowDown") {
        const currAddr = this.getCellAddr(event.target);
        if (currAddr.r < this.endCellAddr.r) {
          event.preventDefault();
          this._moveOneCellOutside(currAddr, "r", 1);
        }
      }
      else if (event.key === "ArrowUp") {
        const currAddr = this.getCellAddr(event.target);
        if (currAddr.r > 0) {
          event.preventDefault();
          this._moveOneCellOutside(currAddr, "r", -1);
        }
      }
      else if (event.key === "ArrowRight") {
        const currAddr = this.getCellAddr(event.target);
        if (currAddr.c < this.endCellAddr.c) {
          event.preventDefault();
          this._moveOneCellOutside(currAddr, "c", 1);
        }
      }
      else if (event.key === "ArrowLeft") {
        const currAddr = this.getCellAddr(event.target);
        if (currAddr.c > 0) {
          event.preventDefault();
          this._moveOneCellOutside(currAddr, "c", -1);
        }
      }
    }
    else {
      const tdEl = event.target.findParent("td");
      if (tdEl) {
        if (event.key === "Escape") {
          event.preventDefault();
          this._zone.run(() => {
            this._setIsFocusedCellEditMode(false);
            this._cdr.markForCheck();
          });
        }
        else if (event.ctrlKey && event.key === "ArrowDown") {
          const currAddr = this.getCellAddr(tdEl);
          if (currAddr.r < this.endCellAddr.r) {
            event.preventDefault();
            this._moveOneCellOutside(currAddr, "r", 1);
            this._zone.run(() => {
              this._setIsFocusedCellEditMode(true);
              this._cdr.markForCheck();
            });
          }
        }
        else if (event.ctrlKey && event.key === "ArrowUp") {
          const currAddr = this.getCellAddr(tdEl);
          if (currAddr.r > 0) {
            event.preventDefault();
            this._moveOneCellOutside(currAddr, "r", -1);
            this._zone.run(() => {
              this._setIsFocusedCellEditMode(true);
              this._cdr.markForCheck();
            });
          }
        }
        else if (event.ctrlKey && event.key === "ArrowRight") {
          const currAddr = this.getCellAddr(tdEl);
          if (currAddr.c < this.endCellAddr.c) {
            event.preventDefault();
            this._moveOneCellOutside(currAddr, "c", 1);
            this._zone.run(() => {
              this._setIsFocusedCellEditMode(true);
              this._cdr.markForCheck();
            });
          }
        }
        else if (event.ctrlKey && event.key === "ArrowLeft") {
          const currAddr = this.getCellAddr(tdEl);
          if (currAddr.c > 0) {
            event.preventDefault();
            this._moveOneCellOutside(currAddr, "c", -1);
            this._zone.run(() => {
              this._setIsFocusedCellEditMode(true);
              this._cdr.markForCheck();
            });
          }
        }
      }
    }

    const currTdEl = event.target.tagName === "TD" ? event.target : event.target.findParent("td");
    if (currTdEl) {
      const addr = this.getCellAddr(currTdEl);
      const itemDef = this._displayItemDefs[addr.r];
      if (this.itemKeydown.observed) {
        this._zone.run(() => {
          this.itemKeydown.emit({ item: itemDef.item, event });
          this._cdr.markForCheck();
        });
      }
    }
  }

  private _onClickAllChildrenOutside(event: MouseEvent): void {
    if (!(event.target instanceof HTMLElement)) return;
    if (!this.sheetContainerElRef) return;
    if (!event.target.findParent(this.sheetContainerElRef.nativeElement)) return;
    if (event.target.tagName !== "TR" && !event.target.findParent("tr")) return;

    const trEl = event.target.tagName === "TR" ? event.target : event.target.findParent("tr")!;
    const rowIndex = NumberUtil.parseInt(trEl.getAttribute("r"))!;
    const itemDef = this._displayItemDefs[rowIndex];

    if (this.autoSelect === "click" && this.getItemSelectable(itemDef)) {
      this._zone.run(() => {
        this._selectItemDef(itemDef);
        this._cdr.markForCheck();
      });
    }
  }

  private _onMousedownAllChildrenOutside(event: MouseEvent): void {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.tagName !== "TD" && !event.target.findParent("td")) return;

    if (document.activeElement !== event.target) {
      this._zone.run(() => {
        this._setIsFocusedCellEditMode(false);
        this._cdr.markForCheck();
      });
    }
  }

  private async _onScrollAllChildrenOutsideAsync(event: Event): Promise<void> {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target !== this.sheetContainerElRef?.nativeElement) return;

    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement.findParent(this.sheetContainerElRef.nativeElement)
    ) {
      await this._redrawFocusIndicatorOutsideAsync();
    }
  }

  private readonly _prevData: {
    itemsRef: T[];
    page: number;
    itemsArray: T[];
    selectedItemsArray: T[];
    configColumns: Partial<Record<string, ISdSheet2ColumnConfigVM>> | undefined;
    columnControlsForDef: {
      key?: string;
      fixed?: boolean;
      width?: string;
      hidden?: boolean;
      collapse?: boolean;
    }[] | undefined;
  } = {
    itemsRef: this.items,
    page: this.page,
    itemsArray: [...this.items],
    selectedItemsArray: [...this.selectedItems],
    configColumns: ObjectUtil.clone(this.config?.columns),
    columnControlsForDef: undefined
  };

  public async ngDoCheck(): Promise<void> {
    const isItemsRefChanged = this.items !== this._prevData.itemsRef;
    if (isItemsRefChanged) this._prevData.itemsRef = this.items;

    const isPageChanged = this.page !== this._prevData.page;
    if (isPageChanged) this._prevData.page = this.page;

    //--
    if (isItemsRefChanged || isPageChanged) {
      const selectedItems = [...this.selectedItems];
      selectedItems.remove((item) => !this._displayItemDefs.some((def) => def.item === item));

      if (this.selectedItemsChange.observed) {
        this.selectedItemsChange.emit(selectedItems);
      }
      else {
        this.selectedItems = selectedItems;
      }
      this._cdr.markForCheck();
      return;
    }
    //--

    const isItemsArrayChanged = this.items.length !== this._prevData.itemsArray.length || !this.items.every((item) => this._prevData.itemsArray.includes(item));
    if (isItemsArrayChanged) this._prevData.itemsArray = [...this.items];

    const isSelectedItemsArrayChanged = this.selectedItems.length !== this._prevData.selectedItemsArray.length || !this.selectedItems.every((item) => this._prevData.selectedItemsArray.includes(item));
    if (isSelectedItemsArrayChanged) this._prevData.selectedItemsArray = [...this.selectedItems];

    //--
    if (isItemsArrayChanged || isSelectedItemsArrayChanged) {
      await this._zone.runOutsideAngular(async () => {
        await this._redrawSelectIndicatorOutsideAsync();
      });
    }
    //--

    const isConfigColumnsChanged = !ObjectUtil.equal(this.config?.columns, this._prevData.configColumns);
    if (isConfigColumnsChanged) this._prevData.configColumns = ObjectUtil.clone(this.config?.columns);

    const columnControls = this.columnControls?.toArray();
    const isConfigColumnsForDefChanged = columnControls?.length !== this._prevData.columnControlsForDef?.length
      || (
        columnControls
        && !columnControls.every((item, i) => (
          this._prevData.columnControlsForDef![i].key === item.key
          && this._prevData.columnControlsForDef![i].fixed === item.fixed
          && this._prevData.columnControlsForDef![i].width === item.width
          && this._prevData.columnControlsForDef![i].hidden === item.hidden
          && this._prevData.columnControlsForDef![i].collapse === item.collapse
        ))
      );
    if (isConfigColumnsForDefChanged) {
      this._prevData.columnControlsForDef = columnControls?.map((item) => ({
        key: item.key,
        fixed: item.fixed,
        width: item.width,
        hidden: item.hidden,
        collapse: item.collapse
      }));
    }

    //--
    if (isConfigColumnsChanged || isConfigColumnsForDefChanged) {
      this._reloadDisplayColumnDefs();
    }
    //--
  }

  /**
   * 'count'크기만큼의 크기로 배열 생성 ([0, 1, 2,...])
   * @param count
   */
  public createArrayByLength(count: number): number[] {
    return Array(count).fill(0).map((a, b) => b);
  }

  /**
   * 특정 셀의 주소 (r/c index) 가져오기
   * @param cellEl 셀 엘리먼트
   */
  public getCellAddr(cellEl: HTMLElement): { r: number; c: number } {
    return {
      r: NumberUtil.parseInt(cellEl.getAttribute("r"))!,
      c: NumberUtil.parseInt(cellEl.getAttribute("c"))!
    };
  }

  public getCellWidthStyle(columnDef: IColumnDef): { width?: string; minWidth?: string; maxWidth?: string } {
    if (this.resizingDef?.guid === columnDef.control.guid) {
      return {
        width: this.resizingDef.width,
        minWidth: this.resizingDef.width,
        maxWidth: this.resizingDef.width
      };
    }
    else {
      return {
        width: columnDef.width,
        minWidth: columnDef.width,
        maxWidth: columnDef.width
      };
    }
  }

  /**
   * 특정 깊이가 컬럼 컨트롤의 최종 헤더 깊이(row index)인지 여부
   * @param columnDef 컬럼 컨트롤
   * @param depth 헤더깊이 (row index)
   */
  public getIsLastHeaderDepth(columnDef: IColumnDef, depth: number): boolean {
    if (columnDef.control.header instanceof Array) {
      return depth === columnDef.control.header.length - 1;
    }
    else {
      return true;
    }
  }

  /**
   * 컬럼 컨트롤 헤더 텍스트 가져오기 (null: 값이 있으나 'colspan'될 자리, undefined: 값이 없는 자리)
   * @param columnDef 컬럼 컨트롤 정의
   * @param depth 헤더깊이 (row index)
   */
  public getColumnHeader(columnDef: IColumnDef, depth: number): string | null | undefined {
    const displayColumnDefs = this.displayColumnDefs;
    if (!displayColumnDefs) return;

    const rawFn = (header: string[] | string | undefined, d: number): string | undefined => {
      if (header instanceof Array) {
        return header[d];
      }
      else if (d === 0) {
        return header;
      }
      else {
        return undefined;
      }
    };

    if (columnDef.control.header instanceof Array) {
      const currColumnIndex = displayColumnDefs.findIndex((item) => item.control.guid === columnDef.control.guid);

      if (currColumnIndex > 0) {
        const currColumnPrevHeaders = columnDef.control.header.slice(0, depth + 1);
        const prevColumnDef = displayColumnDefs[currColumnIndex - 1];

        if (columnDef.fixed === prevColumnDef.fixed && currColumnPrevHeaders.every((item, d) => item === rawFn(prevColumnDef.control.header, d))) {
          return null;
        }
        else {
          return rawFn(columnDef.control.header, depth);
        }
      }
      else {
        return rawFn(columnDef.control.header, depth);
      }
    }
    else {
      return rawFn(columnDef.control.header, depth);
    }
  }

  /**
   * 헤더컬럼의 rowspan 길이 가져오기
   * @param columnDef 컬럼 컨트롤
   * @param depth 헤더깊이 (row index)
   */
  public getColumnHeaderRowSpan(columnDef: IColumnDef, depth: number): number | undefined {
    if (columnDef.control.header === undefined) return;

    if (columnDef.control.header instanceof Array) {
      if (depth === columnDef.control.header.length - 1) {
        return this.maxHeaderDepth - depth;
      }
      else {
        return undefined;
      }
    }
    else {
      return this.maxHeaderDepth;
    }
  }

  /**
   * 헤더컬럼의 colspan 길이 가져오기
   * @param columnDef 컬럼 컨트롤
   * @param depth 헤더깊이 (row index)
   */
  public getColumnHeaderColSpan(columnDef: IColumnDef, depth: number): number | undefined {
    const displayColumnDefs = this.displayColumnDefs;
    if (!displayColumnDefs) return;
    if (columnDef.control.header === undefined) return;
    if (typeof columnDef.control.header === "string") return;

    // const currentHeader = this.getColumnControlHeader(columnControl, depth);

    const index = displayColumnDefs.findIndex((item) => item.control.guid === columnDef.control.guid);
    const nextColumnDefs = displayColumnDefs.slice(index + 1);

    let count = 1;
    for (const nextColumnDef of nextColumnDefs) {
      if (this.getColumnHeader(nextColumnDef, depth) !== null) {
        break;
      }
      count++;
    }

    return count > 1 ? count : undefined;
  }

  /**
   * 셀렉팅 가능한 항목인지 확인
   * @param itemDef
   */
  public getItemSelectable(itemDef: IItemDef<T>): boolean {
    return !this.getItemSelectableFn || this.getItemSelectableFn(itemDef.item);
  }

  /**
   * 컬럼 컨트롤의 오더링 방향이 DESC인지 여부 가져오기
   * @param columnDef
   */
  public getIsColumnOrderingDesc(columnDef: IColumnDef): boolean | undefined {
    return this.ordering.single((item) => item.key === columnDef.control.key)?.desc;
  }

  /**
   * 컬럼 컨트롤의 오더링 순서번호 가져오기
   * @param columnDef 컬럼 컨트롤
   */
  public getColumnOrderingIndexText(columnDef: IColumnDef): string | undefined {
    if (this.ordering.length < 2) {
      return undefined;
    }
    const index = this.ordering.findIndex((item) => item.key === columnDef.control.key);
    return index >= 0 ? (index + 1).toString() : undefined;
  }

  /**
   * 셀의 에디트모드여부 가져오기
   * @param el 셀 엘리먼트
   */
  public getIsCellEditMode(el: HTMLElement): boolean {
    if (!this.editMode) return false;
    if (!(document.activeElement instanceof HTMLElement)) return false;

    if (document.activeElement.tagName === "TD" && document.activeElement === el) {
      return true;
    }

    return document.activeElement.findParent("td") === el;
  }

  /**
   * 모든 상위항목이 Expand됬는지 여부 가져오기
   * @param itemDef
   */
  public getIsAllParentItemExpanded(itemDef: IItemDef<T>): boolean {
    let currItemDef = itemDef;
    while (currItemDef.parentDef) {
      if (!this.expandedItems.some((item) => item === currItemDef.parentDef!.item)) {
        return false;
      }

      currItemDef = currItemDef.parentDef;
    }
    return true;
  }

  /**
   * 헤더 클릭시 이벤트
   * @param event
   * @param columnDef
   */
  public onHeaderClick(event: MouseEvent, columnDef: IColumnDef): void {
    if (!columnDef.control.useOrdering) return;
    if (columnDef.control.key === undefined) return;

    if (event.shiftKey || event.ctrlKey) {
      this._toggleOrdering(columnDef.control.key, true);
    }
    else {
      this._toggleOrdering(columnDef.control.key, false);
    }
  }

  /**
   * 셀 더블클릭 이벤트
   */
  public onCellDoubleClick(): void {
    this._setIsFocusedCellEditMode(true);
  }

  /**
   * ROW 셀렉터 클릭시 이벤트
   * @param itemDef
   */
  public onItemSelectIconClick(itemDef: IItemDef<T>): void {
    if (!this.getItemSelectable(itemDef)) return;

    if (this.selectedItems.includes(itemDef.item)) {
      this._unselectItemDef(itemDef);
    }
    else {
      this._selectItemDef(itemDef);
    }
  }

  // TODO: 라인만 이동
  /**
   * 컬럼 크기조작 시작시 이벤트
   * @param event
   * @param c
   * @param columnDef
   */
  public onResizerMousedown(event: MouseEvent, c: number, columnDef: IColumnDef): void {
    this._zone.runOutsideAngular(() => {
      if (!columnDef.control.resizable) return;
      if (!(event.target instanceof HTMLElement)) return;

      const thEl = event.target.findParent("th");
      if (!thEl) return;

      const cellEls = this.sheetContainerElRef!.nativeElement.findAll(`> ._sheet > * > tr > *[c="${c}"]`)
        .filter((item) => item.getAttribute("colspan") == null || item.getAttribute("colspan") === "1");

      const startX = event.clientX;
      const startWidthPx = thEl.clientWidth;

      this.resizingDef = { guid: columnDef.control.guid, width: startWidthPx + "px" };

      const doDrag = (e: MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();

        const widthPx = startWidthPx + e.clientX - startX;

        for (const cellEl of cellEls) {
          Object.assign(cellEl.style, {
            width: `${widthPx}px`,
            minWidth: `${widthPx}px`,
            maxWidth: `${widthPx}px`
          });
        }
      };

      const stopDrag = async (e: MouseEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();

        document.documentElement.removeEventListener("mousemove", doDrag, false);
        document.documentElement.removeEventListener("mouseup", stopDrag, false);

        await this._saveColumnConfigAsync(columnDef, { width: thEl.style.width });
        columnDef.control.width = thEl.style.width;
        this.resizingDef = undefined;
        await this._zone.runOutsideAngular(async () => {
          await this._redrawFixedOutsideAsync();
        });

        this._zone.run(() => {
          this._cdr.markForCheck();
        });
      };

      document.documentElement.addEventListener("mousemove", doDrag, false);
      document.documentElement.addEventListener("mouseup", stopDrag, false);
    });
  }

  /**
   * 페이지 변경시 이벤트
   * @param page
   */
  public onPageChange(page: number): void {
    if (this.page === page) return;

    if (this.pageChange.observed) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  /**
   * 모든 항목 선택 아이콘 클릭시 이벤트
   */
  public onAllItemsSelectIconClick(): void {
    if (this.isAllItemsSelected) {
      const selectedItems = [];

      if (this.selectedItemsChange.observed) {
        this.selectedItemsChange.emit(selectedItems);
      }
      else {
        this.selectedItems = selectedItems;
      }
    }
    else {
      const selectedItems = this._displayItemDefs.filter((itemDef) => this.getItemSelectable(itemDef)).map((item) => item.item);

      if (this.selectedItemsChange.observed) {
        this.selectedItemsChange.emit(selectedItems);
      }
      else {
        this.selectedItems = selectedItems;
      }
    }
  }

  /**
   * 시트 설정창 보기 버튼 클릭시 이벤트
   */
  public async onConfigButtonClick(): Promise<void> {
    const result = await this._modal.showAsync(SdSheet2ConfigModal, "시트 설정창", {
      controls: this.columnControls!.toArray(),
      configRecord: this.config?.columns
    }, {
      useCloseByBackdrop: true
    });
    if (!result) return;

    this.config = this.config ?? {};
    this.config.columns = result;
    await this._systemConfig.setAsync(`sd-sheet.${this.key!}`, this.config);
    this._cdr.markForCheck();
  }

  /**
   * 시트 항목 Expand 버튼 클릭시 이벤트
   */
  public onItemExpandIconClick(itemDef: IItemDef<T>): void {
    if (!itemDef.hasChildren) return;

    let expandedItems = [...this.expandedItems];
    if (this.expandedItems.includes(itemDef.item)) {
      expandedItems.remove(itemDef.item);
    }
    else {
      expandedItems.push(itemDef.item);
    }

    if (this.expandedItemsChange.observed) {
      this.expandedItemsChange.emit(expandedItems);
    }
    else {
      this.expandedItems = expandedItems;
    }
  }

  /**
   * 모든 항목 확장 아이콘 클릭시 이벤트
   */
  public onAllItemsExpandIconClick(): void {
    if (this.isAllItemsExpanded) {
      const expandedItems = [];

      if (this.expandedItemsChange.observed) {
        this.expandedItemsChange.emit(expandedItems);
      }
      else {
        this.expandedItems = expandedItems;
      }
    }
    else {
      const expandedItems = this._displayItemDefs.filter((itemDef) => itemDef.hasChildren).map((item) => item.item);

      if (this.expandedItemsChange.observed) {
        this.expandedItemsChange.emit(expandedItems);
      }
      else {
        this.expandedItems = expandedItems;
      }
    }
  }

  public async onFixedCellResizeOutside(): Promise<void> {
    await this._redrawFixedOutsideAsync();
  }

  /**
   * 고정된 셀의 위치 보정 (다시 그리기)
   * @private
   */
  private async _redrawFixedOutsideAsync(): Promise<void> {
    if (!this.sheetContainerElRef) return;

    const containerScrollLeft = this.sheetContainerElRef.nativeElement.scrollLeft;

    // Fixed 컬럼 설정

    const fixedEls = this.sheetContainerElRef.nativeElement.findAll("> ._sheet > * > tr > *._fixed");
    for (const fixedEl of fixedEls) {
      fixedEl.style.left = "";
    }

    const boundsInfos = await HTMLElementUtil.getBoundsAsync([this.sheetContainerElRef.nativeElement, ...fixedEls]);
    const containerBoundsInfo = boundsInfos[0];

    const fixedBoundsInfos = boundsInfos.slice(1);
    for (const fixedBoundsInfo of fixedBoundsInfos) {
      fixedBoundsInfo.target.style.left = fixedBoundsInfo.left - containerBoundsInfo.left + containerScrollLeft + "px";
    }
  }

  /**
   * 포커싱 표시기 다시 그리기 (Row 표시기, Cell 표시기 모두 다시 그림)
   * @private
   */
  private async _redrawFocusIndicatorOutsideAsync(): Promise<void> {
    if (!this.sheetContainerElRef) return;

    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement.findParent(this.sheetContainerElRef.nativeElement) &&
      (document.activeElement.tagName === "TD" || document.activeElement.findParent("tr"))
    ) {
      const focusCellIndicatorEl = this.sheetContainerElRef.nativeElement.findFirst("> ._focus-cell-indicator")!;
      const focusRowIndicatorEl = this.sheetContainerElRef.nativeElement.findFirst("> ._focus-row-indicator")!;

      const containerScroll = {
        top: this.sheetContainerElRef.nativeElement.scrollTop,
        left: this.sheetContainerElRef.nativeElement.scrollLeft
      };

      const containerBoundsInfo = (await HTMLElementUtil.getBoundsAsync([this.sheetContainerElRef.nativeElement]))[0];

      if (document.activeElement.tagName === "TD") {
        const tdEl = document.activeElement;
        const tdBoundsInfo = (await HTMLElementUtil.getBoundsAsync([tdEl]))[0];

        Object.assign(focusCellIndicatorEl.style, {
          display: "block",
          top: tdBoundsInfo.top - containerBoundsInfo.top + containerScroll.top - 2 + "px",
          left: tdBoundsInfo.left - containerBoundsInfo.left + containerScroll.left - 2 + "px",
          height: tdBoundsInfo.height + 3 + "px",
          width: tdBoundsInfo.width + 3 + "px"
        });
      }
      else {
        focusCellIndicatorEl.style.display = "none";
      }

      if (document.activeElement.findParent("tr")) {
        const trEl = document.activeElement.findParent("tr")!;
        const trBoundsInfo = (await HTMLElementUtil.getBoundsAsync([trEl]))[0];

        Object.assign(focusRowIndicatorEl.style, {
          display: "block",
          top: trBoundsInfo.top - containerBoundsInfo.top + containerScroll.top + "px",
          left: trBoundsInfo.left - containerBoundsInfo.left + containerScroll.left + "px",
          height: trBoundsInfo.height + "px",
          width: trBoundsInfo.width + "px"
        });
      }
      else {
        focusRowIndicatorEl.style.display = "none";
      }
    }
  }

  /**
   * 선택 표시기 다시 그리기
   * @private
   */
  private async _redrawSelectIndicatorOutsideAsync(): Promise<void> {
    if (!this.sheetContainerElRef) return;

    // Row Select Indicator 설정
    const container = this.sheetContainerElRef.nativeElement.findFirst("> ._row-select-indicator-container")!;

    if (this.selectedItems.length > 0) {
      const rowIndexes = this.selectedItems.map((item) => this._displayItemDefs.findIndex((def) => def.item === item));
      const trEls = rowIndexes.map((r) => this.sheetContainerElRef!.nativeElement.findFirst(`> ._sheet > tbody > tr[r="${r}"]`)).filterExists();
      const boundsInfos = (await HTMLElementUtil.getBoundsAsync(trEls));

      if (boundsInfos.length > 0) {
        const containerBoundsInfo = (await HTMLElementUtil.getBoundsAsync([this.sheetContainerElRef.nativeElement]))[0];
        const containerScrollTop = this.sheetContainerElRef.nativeElement.scrollTop;

        const newEls: HTMLElement[] = [];
        for (const boundsInfo of boundsInfos) {
          const rowSelectIndicatorEl = document.createElement("div");
          rowSelectIndicatorEl.classList.add("_row-select-indicator");
          Object.assign(rowSelectIndicatorEl.style, {
            display: "block",
            top: boundsInfo.top - containerBoundsInfo.top + containerScrollTop + "px",
            left: 0,
            height: boundsInfo.height - 1 + "px",
            width: boundsInfo.width - 1 + "px"
          });
          newEls.push(rowSelectIndicatorEl);
        }

        container.innerHTML = newEls.map((item) => item.outerHTML).join("\n");
      }
      else {
        container.innerHTML = "";
      }
    }
    else {
      container.innerHTML = "";
    }
  }

  private _moveOneCellOutside(orgAddr: { r: number; c: number }, dir: "r" | "c", num: number): void {
    if (!this.sheetContainerElRef) return;

    const endCellAddr = this.endCellAddr;

    let rr = orgAddr.r + (dir === "r" ? num : 0);
    let cc = orgAddr.c + (dir === "c" ? num : 0);
    let el = this.sheetContainerElRef.nativeElement.findFirst(`> ._sheet > tbody > tr[r="${rr}"] > td[r="${rr}"][c="${cc}"]`);
    while ((!el || el.parentElement!.matches("[hidden]")) && rr >= 0 && cc >= 0 && rr <= endCellAddr.r && cc <= endCellAddr.c) {
      const moveNum = num === 0 ? 0 : num < 0 ? -1 : 1;
      rr += (dir === "r" ? moveNum : 0);
      cc += (dir === "c" ? moveNum : 0);
      el = this.sheetContainerElRef.nativeElement.findFirst(`> ._sheet > tbody > tr[r="${rr}"] > td[r="${rr}"][c="${cc}"]`);
    }

    el?.focus();
  }

  /**
   * 포커싱된 셀이 반드시 화면에 표시되도록 강제로 스크롤 이동
   * @private
   */
  private _forceScrollToFocusedCellOutside(): void {
    if (!this.sheetContainerElRef) return;
    if (!(document.activeElement instanceof HTMLElement)) return;

    const focusedEl = document.activeElement;
    if (focusedEl.matches("._fixed") || focusedEl.findParent("*._fixed")) return;

    const containerEl = this.sheetContainerElRef.nativeElement;

    const focusedElOffset = focusedEl.getRelativeOffset(containerEl);

    const theadEl = containerEl.findFirst("> ._sheet > thead")!;
    const fixedThEls = theadEl.findAll("> tr:first-child > th._fixed")!;

    const theadHeight = theadEl.offsetHeight;
    const fixedThWidth = fixedThEls.sum((el) => el.offsetWidth);

    if (focusedElOffset.top < theadHeight) {
      containerEl.scrollTop -= (theadHeight - focusedElOffset.top);
    }
    if (focusedElOffset.left < fixedThWidth) {
      containerEl.scrollLeft -= (fixedThWidth - focusedElOffset.left);
    }

    if (focusedElOffset.left + focusedEl.offsetWidth > containerEl.offsetWidth) {
      containerEl.scrollLeft += focusedElOffset.left + focusedEl.offsetWidth - containerEl.offsetWidth;
    }
  }

  /**
   * 항목 선택 설정
   * @param itemDef 선택 설정할 항목
   * @private
   */
  private _selectItemDef(itemDef: IItemDef<T>): void {
    if (this.selectedItems.includes(itemDef.item)) return;

    let selectedItems = [...this.selectedItems];

    if (this.selectMode === "single") {
      selectedItems = [itemDef.item];
    }
    else {
      selectedItems.push(itemDef.item);
    }

    if (this.selectedItemsChange.observed) {
      this.selectedItemsChange.emit(selectedItems);
    }
    else {
      this.selectedItems = selectedItems;
    }
  }

  /**
   * 항목 선택 해제
   * @param itemDef 선택 해제할 항목
   * @private
   */
  private _unselectItemDef(itemDef: IItemDef<T>): void {
    if (!this.selectedItems.includes(itemDef.item)) return;
    let selectedItems = [...this.selectedItems];
    selectedItems.remove(itemDef.item);


    if (this.selectedItemsChange.observed) {
      this.selectedItemsChange.emit(selectedItems);
    }
    else {
      this.selectedItems = selectedItems;
    }
  }

  /**
   * 정렬 설정 토글
   * @param key 토글할 정렬설정
   * @param multiple 여러 컬럼에 대한 정렬조건을 사용하는 토글인지 여부
   * @private
   */
  private _toggleOrdering(key: string, multiple: boolean): void {
    let ordering = ObjectUtil.clone(this.ordering);

    if (multiple) {
      const orderingItem = ordering.single((item) => item.key === key);
      if (orderingItem) {
        if (orderingItem.desc) {
          ordering.remove(orderingItem);
        }
        else {
          orderingItem.desc = !orderingItem.desc;
        }
      }
      else {
        ordering.push({ key, desc: false });
      }
    }
    else {
      if (ordering.length === 1 && ordering[0].key === key) {
        if (ordering[0].desc) {
          ordering = [];
        }
        else {
          ordering[0].desc = !ordering[0].desc;
        }
      }
      else {
        ordering = [{ key: key, desc: false }];
      }
    }

    if (this.orderingChange.observed) {
      this.orderingChange.emit(ordering);
    }
    else {
      this.ordering = ordering;
    }
  }

  /**
   * 특정셀의 에디트 모드 설정
   * @param editMode 에디트모드 여부
   * @private
   */
  private _setIsFocusedCellEditMode(editMode: boolean): void {
    if (!this.sheetContainerElRef) return;
    if (!(document.activeElement instanceof HTMLElement)) return;
    if (!document.activeElement.findParent(this.sheetContainerElRef.nativeElement)) return;

    const cellEl = document.activeElement.tagName === "TD" ? document.activeElement : document.activeElement.findParent("td");
    if (!cellEl) return;

    if (editMode) {
      this.editMode = true;

      setTimeout(() => {
        const focusableFirstEl = cellEl.findFocusableFirst();
        if (focusableFirstEl) {
          focusableFirstEl.focus();
        }
        else {
          cellEl.focus();
          this.editMode = false;
        }
      }, 0);
    }
    else {
      cellEl.focus();
      this.editMode = false;
    }
  }

  /**
   * 시트 설정 재 로딩
   * @private
   */
  private async _reloadConfigAsync(): Promise<void> {
    if (this.key !== undefined) {
      this.config = await this._systemConfig.getAsync(`sd-sheet.${this.key}`);
    }
  }

  /**
   * 시트 설정중 컬럼설정 저장
   * @private
   */
  private async _saveColumnConfigAsync(columnDef: IColumnDef, config: ISdSheet2ColumnConfigVM): Promise<void> {
    if (columnDef.control.key === undefined) return;
    this.config = this.config ?? {};
    this.config.columns = this.config.columns ?? {};
    this.config.columns[columnDef.control.key] = this.config.columns[columnDef.control.key] ?? {};
    Object.assign(this.config.columns[columnDef.control.key]!, config);
    await this._systemConfig.setAsync(`sd-sheet2.${this.key}`, this.config);
  }
}

export interface ISdSheet2ColumnOrderingVM {
  key: string;
  desc: boolean;
}

export interface ISdSheet2ItemKeydownEventParam<T> {
  item: T;
  event: KeyboardEvent;
}

export interface ISdSheet2ConfigVM {
  columns?: Partial<Record<string, ISdSheet2ColumnConfigVM>>;
}

export interface ISdSheet2ColumnConfigVM {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}

interface IColumnDef {
  control: SdSheet2ColumnControl;
  fixed: boolean;
  width: string | undefined;
  hidden: boolean;
}

interface IItemDef<T> {
  item: T;
  parentDef?: IItemDef<T>;
  hasChildren: boolean;
  depth: number;
}
