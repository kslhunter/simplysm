import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  IterableDiffer,
  IterableDiffers,
  Output,
  QueryList
} from "@angular/core";
import {SdSheetColumnControl} from "./sd-sheet-column.control";
import {SdTypeValidate} from "../decorators/SdTypeValidate";
import {animate, state, style, transition, trigger} from "@angular/animations";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content _head" [style.top.px]="headTop">
      <div class="_col-group _fixed-col-group" [style.left.px]="fixedLeft">
        <div class="_col _first-col"></div>
        <div class="_col" *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn"
             [style.width.px]="columnControl.width">
          {{ columnControl.header }}
        </div>
      </div>
      <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
        <div class="_col" *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
             [style.width.px]="columnControl.width">
          {{ columnControl.header }}
        </div>
      </div>
    </div>

    <div class="_content _body">
      <div class="_row" *ngFor="let item of items; trackBy: trackByItemFn" [@rowState]="'in'">
        <div class="_col-group _fixed-col-group" [style.left.px]="fixedLeft">
          <div class="_col _first-col" (click)="onFirstColClick($event)">
            <sd-icon [icon]="'arrow-right'" *ngIf="selectedItem === item"
                     class="sd-text-color-primary-default"></sd-icon>
          </div>
          <div class="_col" *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn"
               [style.width.px]="columnControl.width" tabindex="0">
            <ng-template [ngTemplateOutlet]="columnControl.itemTemplateRef"
                         [ngTemplateOutletContext]="{item: item}"></ng-template>
            <div class="_col-indicator"></div>
          </div>
        </div>
        <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
          <div class="_col" *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
               [style.width.px]="columnControl.width" tabindex="0">
            <ng-template [ngTemplateOutlet]="columnControl.itemTemplateRef"
                         [ngTemplateOutletContext]="{item: item}"></ng-template>
            <div class="_col-indicator"></div>
          </div>
        </div>
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: auto;
      padding-top: 24px;
      background: black;

      ._content {
        white-space: nowrap;
      }

      ._head {
        display: block;
        position: absolute;
        z-index: 2;
        top: 0;
        left: 0;
        white-space: nowrap;
      }

      ._col-group {
        display: inline-block;
      }

      ._col {
        position: relative;
        display: inline-block;
        height: 24px;
        vertical-align: top;
      }

      ._head ._col {
        background: theme-color(bluegrey, darkest);
        text-align: center;
        padding: gap(xs) gap(sm);
        border-right: 1px solid theme-color(bluegrey, darker);
        border-bottom: 1px solid theme-color(bluegrey, darker);
      }

      ._body ._col {
        background: black;
        border-right: 1px solid theme-color(bluegrey, darkest);
        border-bottom: 1px solid theme-color(bluegrey, darkest);

        /deep/ sd-textfield > input {
          border: none;
          padding: gap(xs) gap(sm);
        }

        /deep/ sd-checkbox > label {
          display: inline-block;
          width: auto;
          border: none;
          padding: gap(xs) gap(sm);
        }
      }

      ._head ._col._first-col,
      ._body ._col._first-col {
        width: 24px;
        text-align: center;
        padding: gap(xs);
        background: theme-color(bluegrey, darkest);
        border-right: 1px solid theme-color(bluegrey, darker);
        border-bottom: 1px solid theme-color(bluegrey, darker);
      }

      ._fixed-col-group {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
      }

      ._row {
        position: relative;
        overflow: hidden;
      }

      ._col > ._col-indicator {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        outline: 1px solid transparent;
        outline-offset: 0;
        z-index: 3;
        pointer-events: none;
        transition: .1s linear;
      }

      ._col:focus > ._col-indicator {
        outline-color: theme-color(primary, default);
      }

      &[sd-selectable=true] ._body ._first-col {
        cursor: pointer;
      }
    }
  `],
  animations: [
    trigger("rowState", [
      state("void", style({height: "0"})),
      state("*", style({height: "*"})),
      transition("void <=> *", animate(".1s linear"))
    ])
  ]
})
export class SdSheetControl implements DoCheck {
  @ContentChildren(SdSheetColumnControl)
  public columnControls?: QueryList<SdSheetColumnControl>;

  @Input()
  @SdTypeValidate(Array)
  public items?: any[];

  @Input()
  @SdTypeValidate(Function)
  public trackBy?: (index: number, item: any) => any;

  public headTop = 0;
  public fixedLeft = 0;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-selectable")
  public selectable?: boolean;

  @Input()
  public selectedItem: any;

  @Output()
  public readonly selectedItemChange = new EventEmitter<any>();

  public get fixedColumnControls(): SdSheetColumnControl[] {
    return this.columnControls ? this.columnControls.filter(item => !!item.fixed) : [];
  }

  public get nonFixedColumnControls(): SdSheetColumnControl[] {
    return this.columnControls ? this.columnControls.filter(item => !item.fixed) : [];
  }

  public get fixedColumnWidth(): number {
    if (this.fixedColumnControls.length > 0) {
      return this.fixedColumnControls.map(item => item.width).reduce((a, b) => a + b) + 24;
    }
    else {
      return 24;
    }
  }

  public trackByColumnControlFn(index: number, item: SdSheetColumnControl): any {
    return item.guid;
  }

  public trackByItemFn(index: number, item: any): any {
    if (this.trackBy) {
      return this.trackBy(index, item);
    }
    else {
      return item;
    }
  }

  private readonly _iterableDiffer: IterableDiffer<any>;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef) {
    this._iterableDiffer = this._iterableDiffers.find([]).create(this.trackByItemFn);
  }

  public ngDoCheck(): void {
    if (this.items && this._iterableDiffer.diff(this.items)) {
      this._cdr.markForCheck();
    }
  }

  public onFirstColClick(event: MouseEvent): void {
    if (!this.selectable) return;

    const targetEl = event.target as Element;
    const rowEl = targetEl.findParent("._row")!;
    const bodyEl = rowEl.parentElement as Element;
    const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
    const selectedItem = this.items![rowIndex];
    if (this.selectedItem !== selectedItem) {
      this.selectedItem = this.items![rowIndex];
      this.selectedItemChange.emit(this.selectedItem);
    }
  }

  @HostListener("scroll", ["$event"])
  public onScroll(event: Event): void {
    const el = event.target as Element;
    this.headTop = el.scrollTop;
    this.fixedLeft = el.scrollLeft;
  }
}