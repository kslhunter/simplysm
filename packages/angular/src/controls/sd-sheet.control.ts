import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  HostListener,
  Input,
  IterableDiffer,
  IterableDiffers,
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
          {{ columnControl.headerText }}
        </div>
      </div>
      <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
        <div class="_col" *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
             [style.width.px]="columnControl.width">
          {{ columnControl.headerText }}
        </div>
      </div>
    </div>

    <div class="_content _body">
      <div class="_row" *ngFor="let item of items; trackBy: trackByItemFn" [@rowState]="'in'">
        <div class="_col-group _fixed-col-group" [style.left.px]="fixedLeft">
          <div class="_col _first-col"></div>
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

      ._first-col {
        background: theme-color(bluegrey, darkest);
        width: 24px;
        text-align: center;
        padding: gap(xs);
      }

      ._fixed-col-group {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
      }

      ._row {
        position: relative;
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

  public get fixedColumnControls(): SdSheetColumnControl[] {
    return this.columnControls ? this.columnControls.filter(item => !!item.fixed) : [];
  }

  public get nonFixedColumnControls(): SdSheetColumnControl[] {
    return this.columnControls ? this.columnControls.filter(item => !item.fixed) : [];
  }

  public get fixedColumnWidth(): number {
    return this.fixedColumnControls.map(item => item.width).reduce((a, b) => a + b) + 24;
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

  @HostListener("scroll", ["$event"])
  public onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.headTop = el.scrollTop;
    this.fixedLeft = el.scrollLeft;
  }
}