import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef
} from "@angular/core";
import {Logger} from "../../../sd-core/src/utils/Logger";
import {SdValidate} from "../decorators/SdValidate";
import "../helpers/ElementExtensions";
import {SimgularHelpers} from "../helpers/SimgularHelpers";
import {SdSheetColumnConfigModal} from "../modals/SdSheetColumnConfigModal";
import {SdLocalStorageProvider} from "../providers/SdLocalStorageProvider";
import {SdModalProvider} from "../providers/SdModalProvider";

@Component({
  selector: "sd-sheet-column",
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdSheetColumnControl implements OnChanges {
  @Input() public title = "";
  @Input() public class?: string;
  @Input() public style?: string;
  @Input() public fill?: boolean;

  @ContentChild("item") public itemTemplateRef?: TemplateRef<any>;
  @ContentChild("header") public headerTemplateRef?: TemplateRef<any>;

  public ngOnChanges(changes: SimpleChanges): void {
    SimgularHelpers.typeValidate(changes, {
      title: {
        type: String,
        required: true
      },
      class: String,
      style: String,
      fill: Boolean
    });
  }
}

export interface ISdSheetColumnDef {
  title: string;
  sequence: number;
  isVisible: boolean;
  class?: string;
  style?: string;
  fill?: boolean;
  itemTemplateRef?: TemplateRef<any>;
  headerTemplateRef?: TemplateRef<any>;
}

@Component({
  selector: "sd-sheet-column-head",
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdSheetColumnHeadControl {
  @ContentChild(TemplateRef) public templateRef?: TemplateRef<any>;
}

@Component({
  selector: "sd-sheet",
  template: `
    <table>
      <thead>
      <tr>
        <th style="text-align: center">
          <a (click)="onConfigButtonClick()" *ngIf="id">
            <sd-icon icon="columns" [fixedWidth]="true"></sd-icon>
          </a>
        </th>
        <th *ngFor="let column of displayColumns; trackBy: columnsTrackByFn">
          {{ column.title }}
        </th>
      </tr>
      <tr *ngIf="hasHeaderTemplate">
        <th></th>
        <th *ngFor="let column of displayColumns; trackBy: columnsTrackByFn" [attr.sd-fill]="column.fill">
          <ng-template [ngTemplateOutlet]="column.headerTemplateRef"></ng-template>
        </th>
      </tr>
      </thead>
      <tbody *ngFor="let item of displayItems; trackBy: itemsTrackByFn; let index = index">
      <tr>
        <td (click)="onFirstCellClick($event)">
          <ng-container *ngIf="seqProp">
            <a (click)="onSeqUpButtonClick(item)">
              <sd-icon icon="angle-up" [fixedWidth]="true"></sd-icon>
            </a>
            <a (click)="onSeqDownButtonClick(item)">
              <sd-icon icon="angle-down" [fixedWidth]="true"></sd-icon>
            </a>
          </ng-container>
          <ng-template [ngTemplateOutlet]="columnHead?.templateRef"
                       [ngTemplateOutletContext]="{item: item}"></ng-template>
        </td>
        <td *ngFor="let column of displayColumns; trackBy: columnsTrackByFn"
            [class]="'sd-sheet-column' + (column.class ? ' ' + column.class : '')"
            [style]="column.style"
            tabindex="0"
            [attr.title]="column.title"
            [attr.sd-fill]="column.fill">
          <ng-template [ngTemplateOutlet]="column.itemTemplateRef"
                       [ngTemplateOutletContext]="{item: item}"></ng-template>
          <div class="outline"></div>
        </td>
      </tr>
      </tbody>
    </table>
    <div class="selector"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdSheetControl implements AfterViewInit, DoCheck {
  @Input()
  @SdValidate(String)
  public id?: string;

  @Input()
  @SdValidate(Array)
  public items?: any[];

  @Input()
  @SdValidate(String)
  public keyProp?: string;

  @Input()
  @SdValidate(String)
  public seqProp?: string;

  @Input()
  @SdValidate(Number)
  public fixedColumnLength?: number;

  @Input()
  public selectedItem?: any;

  @Output()
  public readonly selectedItemChange = new EventEmitter<any | undefined>();

  @Output()
  public readonly remove = new EventEmitter<any>();

  @ContentChildren(SdSheetColumnControl)
  public columnControlList!: QueryList<SdSheetColumnControl>;

  @ContentChild(SdSheetColumnHeadControl)
  public columnHead?: SdSheetColumnHeadControl;

  private readonly _logger = new Logger("@simplism/sd-angular", "SdSheet");
  private _itemBeforeCheck?: any[];

  public constructor(private readonly _elementRef: ElementRef,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _localStorage: SdLocalStorageProvider,
                     private readonly _modal: SdModalProvider,
                     private readonly _zone: NgZone) {
  }

  public get columns(): ISdSheetColumnDef[] {
    const currColumns = this.columnControlList.toArray().map((item, i) => ({
      title: item.title,
      sequence: i,
      isVisible: true,
      class: item.class,
      style: item.style,
      fill: item.fill,
      itemTemplateRef: item.itemTemplateRef,
      headerTemplateRef: item.headerTemplateRef
    }));

    const titleConfigs = (this._localStorage.get(`simgular.sd-sheet.columns.${this.id}`) || []) as ISdSheetColumnDef[];

    for (const currColumn of currColumns) {
      const currConfig = titleConfigs.find(item => item.title === currColumn.title);
      Object.assign(currColumn, currConfig);
    }
    return currColumns.orderBy(item => item.sequence);
  }

  public get displayColumns(): ISdSheetColumnDef[] {
    return this.columns.filter(item => item.isVisible);
  }

  public get hasHeaderTemplate(): boolean {
    return this.displayColumns.some(item => !!item.headerTemplateRef);
  }

  public get displayItems(): any[] | undefined {
    return this.items && this.seqProp ? this.items.orderBy(item => item[this.seqProp!]) : this.items;
  }

  public columnsTrackByFn(index: number, item: ISdSheetColumnDef): string | ISdSheetColumnDef {
    return item.title ? item.title : item;
  }

  public itemsTrackByFn(index: number, item: any): any {
    if (this.keyProp && (item[this.keyProp] != undefined)) {
      return item[this.keyProp];
    }
    else {
      return item;
    }
  }

  public ngDoCheck(): void {
    if (!this._itemBeforeCheck && this.items ||
      this._itemBeforeCheck && !this.items) {
      this._cdr.markForCheck();
    }
    else if (this._itemBeforeCheck && this.items) {
      const diffs = this._itemBeforeCheck.differenceWith(this.items, this.keyProp ? [this.keyProp] : undefined);
      if (diffs.length > 0) {
        this._cdr.markForCheck();
      }
    }

    this._itemBeforeCheck = Object.clone(this.items);
  }

  public ngAfterViewInit(): void {
    this.redraw();
    const thisEl = this._elementRef.nativeElement as HTMLElement;

    this._zone.runOutsideAngular(() => {
      SimgularHelpers.detectElementChange(thisEl.find("> table")!, () => {
        if (this.selectedItem && (!this.items || !this.items.some((item, i) => this.itemsTrackByFn(i, item) === this.itemsTrackByFn(i, this.selectedItem)))) {
          this._zone.run(() => {
            this.selectedItemChange.emit();
          });
        }
        this.redraw();
      }, {resize: false});
      thisEl.on("scroll", () => {
        this.repositioning();
      });
      thisEl.on("keydown", (event: KeyboardEvent) => {
        this.onDocumentKeydown(event);
      }, true);
      thisEl.on("focus", (event: FocusEvent) => {
        this.onFocus(event);
      }, true);
      thisEl.on("blur", (event: FocusEvent) => {
        this.onBlur(event);
      }, true);
    });
  }

  public onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
    }

    const thisEl = this._elementRef.nativeElement as HTMLElement;
    const targetEl = event.target as HTMLElement;
    if (event.key === "Escape") {
      const cellEl = targetEl.matches("td") ? targetEl : targetEl.findParent("td");
      if (!cellEl) {
        return;
      }

      cellEl.focus();
    }
    else if (event.key === "F2") {
      const cellEl = targetEl.matches("td") ? targetEl : targetEl.findParent("td");
      if (!cellEl) {
        return;
      }

      const focusableEl = cellEl.findFocusable();
      if (!focusableEl) {
        return;
      }

      focusableEl.focus();
    }
    else if (event.key === "ArrowDown" && targetEl.tagName === "TD") {
      const cellEl = targetEl as HTMLTableCellElement;
      const trEl = cellEl.parentElement as HTMLTableRowElement;

      const nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex + 1];
      if (!nextTrEl) {
        return;
      }

      const nextCellEl = nextTrEl.children.item(cellEl.cellIndex) as HTMLElement | undefined;
      if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
        return;
      }

      nextCellEl.focus();
    }
    else if (event.key === "ArrowUp" && targetEl.tagName === "TD") {
      const cellEl = targetEl as HTMLTableCellElement;
      const trEl = cellEl.parentElement as HTMLTableRowElement;

      const nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex - 1];
      if (!nextTrEl) {
        return;
      }

      const nextCellEl = nextTrEl.children.item(cellEl.cellIndex) as HTMLElement | undefined;
      if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
        return;
      }

      nextCellEl.focus();
    }
    else if (event.key === "ArrowLeft" && targetEl.tagName === "TD") {
      const cellEl = targetEl as HTMLTableCellElement;
      const trEl = cellEl.parentElement as HTMLTableRowElement;

      const nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex];
      if (!nextTrEl) {
        return;
      }

      const nextCellEl = nextTrEl.children.item(cellEl.cellIndex - 1) as HTMLElement | undefined;
      if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
        return;
      }

      nextCellEl.focus();
    }
    else if (event.key === "ArrowRight" && targetEl.tagName === "TD") {
      const cellEl = targetEl as HTMLTableCellElement;
      const trEl = cellEl.parentElement as HTMLTableRowElement;

      const nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex];
      if (!nextTrEl) {
        return;
      }

      const nextCellEl = nextTrEl.children.item(cellEl.cellIndex + 1) as HTMLElement | undefined;
      if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
        return;
      }

      nextCellEl.focus();
    }
    else if (event.key === "Tab" && !event.shiftKey && targetEl.tagName === "TD") {
      const cellEl = targetEl as HTMLTableCellElement;
      const trEl = cellEl.parentElement as HTMLTableRowElement;

      let nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex];
      if (!nextTrEl) {
        return;
      }

      let nextCellEl = nextTrEl.children.item(cellEl.cellIndex + 1) as HTMLElement | undefined;
      if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
        nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex + 1];
        if (!nextTrEl) {
          return;
        }

        nextCellEl = nextTrEl.find("> *.sd-sheet-column");
        if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
          return;
        }
      }

      nextCellEl.focus();
      event.preventDefault();
    }
    else if (event.key === "Tab" && event.shiftKey && targetEl.tagName === "TD") {
      const cellEl = targetEl as HTMLTableCellElement;
      const trEl = cellEl.parentElement as HTMLTableRowElement;

      let nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex];
      if (!nextTrEl) {
        return;
      }

      let nextCellEl = nextTrEl.children.item(cellEl.cellIndex - 1) as HTMLElement | undefined;
      if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
        nextTrEl = thisEl.findAll("> table > * > tr")[trEl.rowIndex - 1];
        if (!nextTrEl) {
          return;
        }

        const nextCellEls = nextTrEl.findAll("> *.sd-sheet-column");
        nextCellEl = nextCellEls[nextCellEls.length - 1];
        if (!nextCellEl || !nextCellEl.classList.contains("sd-sheet-column")) {
          return;
        }
      }

      nextCellEl.focus();
      event.preventDefault();
    }
  }

  public onFocus(event: FocusEvent): void {
    this.selectRow(event.target as HTMLElement);
    this.redrawFocusedOutline();
  }

  public onBlur(event: FocusEvent): void {
    const targetEl = event.target as HTMLElement;

    const rowEl = targetEl.findParent("tr");
    if (!rowEl) {
      return;
    }

    const cellEl = targetEl.matches("td") ? targetEl : targetEl.findParent("td");
    if (!cellEl) {
      return;
    }

    const prevZIndex = cellEl.getAttribute("sd-prev-z-index");
    if (prevZIndex == undefined) {
      return;
    }

    cellEl.style.zIndex = prevZIndex;
    cellEl.removeAttribute("sd-prev-z-index");
  }

  public onFirstCellClick(event: Event): void {
    this.selectRow(event.target as HTMLElement);
  }

  public onSeqUpButtonClick(item: any): void {
    const items = this.items!.orderBy(item1 => item1[this.seqProp!]);
    const index = items.indexOf(item);
    const prevItem = items[index - 1];
    if (!prevItem) {
      return;
    }

    const prevSeq = prevItem[this.seqProp!];
    prevItem[this.seqProp!] = item[this.seqProp!];
    item[this.seqProp!] = prevSeq;
  }

  public onSeqDownButtonClick(item: any): void {
    const items = this.items!.orderBy(item1 => item1[this.seqProp!]);
    const index = items.indexOf(item);
    const nextItem = items[index + 1];
    if (!nextItem) {
      return;
    }

    const nextSeq = nextItem[this.seqProp!];
    nextItem[this.seqProp!] = item[this.seqProp!];
    item[this.seqProp!] = nextSeq;
  }

  public async onConfigButtonClick(): Promise<void> {
    const result = await this._modal.show("표시설정", SdSheetColumnConfigModal, {columns: this.columns});
    if (result) {
      this._localStorage.set(`simgular.sd-sheet.columns.${this.id}`, result.columns);
      this._cdr.detectChanges();
    }
  }

  public selectRow(target: HTMLElement): void {
    const thisEl = this._elementRef.nativeElement as HTMLElement;

    const row = target.findParent("tr");
    if (!row) {
      return;
    }

    const rowEls = thisEl.findAll("> table > tbody > tr");
    this.selectedItem = this.items![rowEls.indexOf(row)];
    this._zone.run(() => {
      this.selectedItemChange.emit(this.selectedItem);
    });
    this.redrawSelectedRowOverlay();
  }

  public redraw(): void {
    const thisEl = this._elementRef.nativeElement as HTMLElement;

    this._logger.log("redraw");

    const tableEl = thisEl.find("> table")!;
    const cellEls = tableEl.findAll("> * > tr > *");

    // 초기화
    thisEl.style.width = "10000px";

    Object.assign(thisEl.style, {
      width: "10000px",
      paddingTop: "",
      paddingLeft: ""
    });

    for (const cellElem of cellEls) {
      Object.assign(cellElem.style, {
        top: "",
        left: "",
        minWidth: "",
        minHeight: "",
        position: "",
        zIndex: "",
        marginTop: "",
        marginLeft: ""
      });
    }

    // 셀 스타일 변경사항들 가져오기
    const cellStyleMap = new Map<HTMLElement, Partial<CSSStyleDeclaration>>();

    // 각 셀 크기 고정
    for (const cellEl of cellEls) {
      cellStyleMap.set(cellEl, {
        minWidth: `${cellEl.offsetWidth}px`,
        minHeight: `${cellEl.offsetHeight}px`
      });
    }

    // title 셀 설정
    const cellLength = thisEl.findAll("> table > * > tr > *").length;
    let currIndex = cellLength + 1;
    const titleCellEls = tableEl.findAll("> thead > tr > *");
    for (const titleCellEl of titleCellEls) {
      Object.assign(cellStyleMap.get(titleCellEl), {
        minWidth: `${titleCellEl.offsetWidth}px`,
        minHeight: `${titleCellEl.offsetHeight}px`,
        top: `${titleCellEl.offsetTop}px`,
        left: `${titleCellEl.offsetLeft}px`,
        position: "absolute",
        zIndex: (currIndex--).toString()
      });
    }

    // fixed 셀 설정
    if (this.fixedColumnLength) {
      const fixedCellEls = tableEl.findAll(`> tbody > tr > *:nth-child(-n+${this.fixedColumnLength})`);
      for (const fixedCellEl of fixedCellEls) {
        Object.assign(cellStyleMap.get(fixedCellEl), {
          minWidth: `${fixedCellEl.offsetWidth}px`,
          minHeight: `${fixedCellEl.offsetHeight}px`,
          top: `${fixedCellEl.offsetTop}px`,
          left: `${fixedCellEl.offsetLeft}px`,
          position: "absolute",
          zIndex: (currIndex--).toString()
        });
      }
    }

    // 포커싱된 셀 z-index 수정
    const focusedCellElem = thisEl.find("*[sd-prev-z-index]");
    if (focusedCellElem) {
      Object.assign(cellStyleMap.get(focusedCellElem), {
        zIndex: (cellLength + 2).toString()
      });
    }

    // 실제 스타일 변경
    for (const cellEl of Array.from(cellStyleMap.keys())) {
      Object.assign(cellEl.style, cellStyleMap.get(cellEl));
    }

    // thead만큼 상단 띄우기
    const headFirstCellEls = tableEl.findAll("> thead > tr > *:nth-child(1)");
    thisEl.style.paddingTop = `${headFirstCellEls.sum(item => item.offsetHeight)}px`;

    // fixed만큼 좌측 띄우기
    if (this.fixedColumnLength) {
      const fixedColumnElList = tableEl.findAll(`> thead:first-child > tr > *:nth-child(-n+${this.fixedColumnLength})`);
      const fixedWidth = fixedColumnElList.map(item => item.offsetWidth).reduce((p, n) => p + n);
      thisEl.style.paddingLeft = `${fixedWidth}px`;
    }
    else {
      thisEl.style.paddingLeft = "";
    }

    thisEl.style.width = "";

    this.repositioning();
    this.redrawSelectedRowOverlay();
  }

  public repositioning(): void {
    const thisEl = this._elementRef.nativeElement as HTMLElement;
    const titleCellEls = thisEl.findAll("> table > thead > tr > *");
    for (const titleCellEl of titleCellEls) {
      titleCellEl.style.marginTop = `${thisEl.scrollTop}px`;
    }

    if (this.fixedColumnLength) {
      const fixedCellEls = thisEl.findAll(`> table > * > tr > *:nth-child(-n+${this.fixedColumnLength})`);
      for (const fixedCellEl of fixedCellEls) {
        fixedCellEl.style.marginLeft = `${thisEl.scrollLeft}px`;
      }
    }
  }

  public redrawFocusedOutline(): void {
    const thisEl = this._elementRef.nativeElement as HTMLElement;
    const targetEl = document.activeElement as HTMLElement | undefined;
    if (!targetEl) {
      return;
    }

    const cellEl = targetEl.matches("td") ? targetEl : targetEl.findParent("td");
    if (!cellEl) {
      return;
    }

    const cellLength = thisEl.findAll("> table > * > tr > *").length;
    cellEl.setAttribute("sd-prev-z-index", cellEl.style.zIndex!);
    cellEl.style.zIndex = (cellLength + 2).toString();

    const scrollLeft = thisEl.scrollLeft;
    const scrollTop = thisEl.scrollTop;

    const headFirstCellEls = thisEl.findAll("> table > thead > tr > *:nth-child(1)");
    const fixedHeight = headFirstCellEls.sum(item => item.offsetHeight)!;

    const offsetLeft = cellEl.offsetLeft;
    const offsetTop = cellEl.offsetTop;

    if (scrollTop > offsetTop - fixedHeight) {
      thisEl.scrollTop = offsetTop - fixedHeight;
    }

    if (this.fixedColumnLength) {
      const fixedColumnEls = thisEl.findAll(`> table > thead:first-child > tr > *:nth-child(-n+${this.fixedColumnLength})`);
      const fixedWidth = fixedColumnEls.sum(item => item.offsetWidth)!;

      if (scrollLeft > offsetLeft - fixedWidth) {
        thisEl.scrollLeft = offsetLeft - fixedWidth;
      }
    }

    if (scrollTop + thisEl.offsetHeight < offsetTop + cellEl.offsetHeight) {
      const scrollbarHeight = thisEl.offsetHeight - thisEl.clientHeight;
      thisEl.scrollTop = offsetTop + cellEl.offsetHeight - thisEl.offsetHeight + scrollbarHeight;
    }

    if (scrollLeft + thisEl.offsetWidth < offsetLeft + cellEl.offsetWidth) {
      const scrollbarWidth = thisEl.offsetWidth - thisEl.clientWidth;
      thisEl.scrollLeft = offsetLeft + cellEl.offsetWidth - thisEl.offsetWidth + scrollbarWidth;
    }
  }

  public redrawSelectedRowOverlay(): void {
    const thisEl = this._elementRef.nativeElement as HTMLElement;
    const cellLength = thisEl.findAll("> table > * > tr > *").length;

    const selectorEl = thisEl.find("> .selector")!;
    if (this.items && this.selectedItem != undefined && this.items.some((item, i) => this.itemsTrackByFn(i, item) === this.itemsTrackByFn(i, this.selectedItem))) {
      const item = this.items.single((item1, i) => this.itemsTrackByFn(i, item1) === this.itemsTrackByFn(i, this.selectedItem));
      const selectedRow = this.items.indexOf(item);
      const row = thisEl.find(`> table > tbody:nth-child(${selectedRow + 2}) > tr`);
      if (row) {
        selectorEl.style.top = `${row.offsetTop + Number(thisEl.style.paddingTop!.slice(0, -2))}px`;
        selectorEl.style.left = `${row.offsetLeft}px`;
        selectorEl.style.width = `${row.offsetWidth + (thisEl.style.paddingLeft ? Number(thisEl.style.paddingLeft.slice(0, -2)) : 0) - 1}px`;
        selectorEl.style.height = `${row.offsetHeight - 1}px`;
        selectorEl.style.zIndex = (cellLength + 3).toString();
        selectorEl.style.display = "block";
      }
    }
    else {
      selectorEl.style.display = "none";
    }
  }
}
