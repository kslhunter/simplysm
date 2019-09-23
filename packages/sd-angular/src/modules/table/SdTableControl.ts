import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  Input,
  IterableDiffer,
  IterableDiffers,
  Output,
  QueryList,
  ViewEncapsulation
} from "@angular/core";
import {ResizeEvent} from "../../commons/ResizeEvent";
import {SdTypeValidate} from "../..";
import {SdTableColumnControl} from "./SdTableColumnControl";

@Component({
  selector: "sd-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_header" (resize)="onHeaderResize($event)">
      <table>
        <thead>
        <tr>
          <th *ngIf="selectable">
            <input type="checkbox"
                   [checked]="!!items.length && getIsAllItemsChecked(item)"
                   (click)="onAllSelectorClick()"
                   [disabled]="!items.length">
          </th>
          <th *ngFor="let columnControl of columnControls; trackBy: trackByColumnControlFn;"
              [style.width]="columnControl.widthPercent + '%'">
            <ng-container *ngIf="columnControl.headerTemplateRef">
              <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef"></ng-template>
            </ng-container>
            <div *ngIf="!columnControl.headerTemplateRef && columnControl.header">
              {{ columnControl.header }}
            </div>
          </th>
        </tr>
        </thead>
      </table>
    </div>

    <div class="_content" (resize)="onContentResize($event)">
      <table>
        <tbody *ngFor="let item of items; let i = index; trackBy: trackByItemFn">
        <tr>
          <td *ngIf="selectable" class="sd-text-align-center">
            <input #selector type="checkbox"
                   [checked]="getIsItemChecked(item)"
                   (click)="onItemSelectorClick(item)">
          </td>
          <td *ngFor="let columnControl of columnControls; trackBy: trackByColumnControlFn;"
              [style.width]="columnControl.widthPercent + '%'">
            <ng-template [ngTemplateOutlet]="columnControl.contentTemplateRef"
                         [ngTemplateOutletContext]="{item: item, index: i}"></ng-template>
          </td>
        </tr>
        </tbody>
      </table>
    </div>`,
  styles: [/* language=SCSS */ `
    sd-table {
      position: relative;
      display: block;
      border: 1px solid var(--theme-grey-light);

      > * > table {
        width: 100%;
        border-collapse: collapse;

        > * > * > * {
          border-bottom: 1px solid var(--theme-grey-light);
        }
      }

      > ._header {
        position: absolute;
        top: 0;
        left: 0;
        background: var(--theme-grey-lightest);
        border-top: 1px solid white;
        //border-bottom: 1px solid var(--theme-grey-light);

        > table > thead > tr > th > div {
          padding: var(--gap-xs) var(--gap-sm);
        }
      }

      > ._content {
        overflow-y: auto;
        height: 100%;
        margin-bottom: -1px;

        > table {
          background: white;
          
          > * > * > * {
            border-top: 1px solid var(--theme-grey-light);
          }
        }
      }
    }
  `]
})
export class SdTableControl implements DoCheck {
  @ContentChildren(SdTableColumnControl)
  public columnControls?: QueryList<SdTableColumnControl>;

  @Input()
  @SdTypeValidate(Function)
  public trackBy?: (index: number, item: any) => any;

  public trackByColumnControlFn = (index: number, item: SdTableColumnControl) => item.guid;
  public trackByItemFn = (index: number, item: any) => {
    if (this.trackBy) {
      return this.trackBy(index, item) || item;
    }
    else {
      return item;
    }
  };

  @Input()
  @SdTypeValidate(Array)
  public items?: any[];

  @Input()
  @SdTypeValidate(Boolean)
  public selectable?: boolean;

  @Input()
  public selectedItems: any[] = [];

  @Output()
  public readonly selectedItemsChange = new EventEmitter<any>();

  private readonly _iterableDiffer: IterableDiffer<any>;
  private readonly _iterableDifferForColumn: IterableDiffer<any>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _elRef: ElementRef) {
    this._iterableDiffer = this._iterableDiffers.find([]).create((i: number, item: any) => this.trackByItemFn(i, item));
    this._iterableDifferForColumn = this._iterableDiffers.find([]).create();
  }

  public ngDoCheck(): void {
    if (this.items && this._iterableDiffer.diff(this.items)) {
      this._cdr.markForCheck();
    }

    if (this.columnControls && this._iterableDifferForColumn.diff(this.columnControls.toArray())) {
      this._cdr.markForCheck();
    }
  }

  public onItemSelectorClick(item: any): void {
    if (this.selectedItems.includes(item)) {
      this.selectedItems.remove(item);
    }
    else {
      this.selectedItems.push(item);
    }
    this.selectedItemsChange.emit(this.selectedItems);
  }

  public onAllSelectorClick(): void {
    if (this.items) {
      if (this.selectedItems.length === this.items.length) {
        this.selectedItems = [];
      }
      else {
        this.selectedItems = this.items;
      }
    }
    this.selectedItemsChange.emit(this.selectedItems);
  }

  public getIsAllItemsChecked(): boolean {
    return !!this.items && this.selectedItems.length === this.items.length;
  }

  public getIsItemChecked(item: any): boolean {
    return this.selectedItems.includes(item);
  }


  public onHeaderResize(event: ResizeEvent): void {
    if (event.detail.dimensions.includes("height")) {
      const thisEl = this._elRef.nativeElement as HTMLElement;
      const headerEl = thisEl.findAll("> ._header")[0] as HTMLElement;
      const contentEl = thisEl.findAll("> ._content")[0] as HTMLElement;
      contentEl.style.paddingTop = headerEl.offsetHeight + "px";
    }
  }

  public onContentResize(event: ResizeEvent): void {
    if (event.detail.dimensions.includes("width")) {
      const thisEl = this._elRef.nativeElement as HTMLElement;
      const headerEl = thisEl.findAll("> ._header")[0] as HTMLElement;
      const contentEl = thisEl.findAll("> ._content")[0] as HTMLElement;
      headerEl.style.width = contentEl.clientWidth + "px";
    }
  }
}
