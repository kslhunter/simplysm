import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  IterableDiffer,
  IterableDiffers,
  OnInit,
  Output,
  QueryList,
  TemplateRef,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdMultiSelectItemControl} from "./SdMultiSelectItemControl";

@Component({
  selector: "sd-multi-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown [disabled]="disabled" (open)="open.emit()" (close)="close.emit()">
      <div #content></div>
      <div class="_icon">
        <sd-icon [fw]="true" [icon]="'caret-down'"></sd-icon>
      </div>

      <sd-dropdown-popup>
        <ng-container *ngIf="!items">
          <ng-content></ng-content>
        </ng-container>
        <ng-container *ngIf="items">
          <sd-dock-container>
            <sd-dock>
              <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
            </sd-dock>
            <sd-pane>
              <ng-template #rowOfList let-items="items">
                <ng-container *ngFor="let item of items; let i = index; trackBy: trackByItemFn">
                  <div class="_sd-multi-select-item">
                    <ng-template [ngTemplateOutlet]="itemTemplateRef"
                                 [ngTemplateOutletContext]="{item: item}"></ng-template>

                    <ng-container *ngIf="children && children!(i, item) && children!(i, item).length > 0">
                      <div class="_children">
                        <ng-template [ngTemplateOutlet]="rowOfList"
                                     [ngTemplateOutletContext]="{items: children(i, item)}"></ng-template>
                      </div>
                    </ng-container>
                  </div>
                </ng-container>
              </ng-template>
              <ng-template [ngTemplateOutlet]="rowOfList"
                           [ngTemplateOutletContext]="{items: items}"></ng-template>
            </sd-pane>
          </sd-dock-container>
        </ng-container>
      </sd-dropdown-popup>
    </sd-dropdown>`
})
export class SdMultiSelectControl implements DoCheck, OnInit, AfterContentChecked {
  @Input()
  @SdTypeValidate(Array)
  public value?: any[];

  @Output()
  public readonly valueChange = new EventEmitter<any[]>();

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(String)
  public keyProp?: string;

  @ContentChildren(forwardRef(() => SdMultiSelectItemControl), {descendants: true})
  public itemControls?: QueryList<SdMultiSelectItemControl>;

  private readonly _iterableDiffer: IterableDiffer<any>;

  @Output()
  public readonly open = new EventEmitter();

  @Output()
  public readonly close = new EventEmitter();

  @ViewChild("content", {static: true})
  public contentElRef?: ElementRef<HTMLDivElement>;

  @ContentChild("item", {static: true})
  public itemTemplateRef?: TemplateRef<any>;

  @ContentChild("header", {static: true})
  public headerTemplateRef?: TemplateRef<any>;

  @Input()
  @SdTypeValidate(Array)
  public items?: any[];

  @Input()
  @SdTypeValidate(Function)
  public trackBy?: (index: number, item: any) => any;

  @Input()
  @SdTypeValidate(Function)
  public children?: (index: number, item: any) => any;

  public trackByItemFn(index: number, item: any): any {
    if (this.trackBy) {
      return this.trackBy(index, item) || item;
    }
    else {
      return item;
    }
  }

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef) {
    this._iterableDiffer = this._iterableDiffers.find([]).create((index, item) => item);
  }

  public ngOnInit(): void {
    this._render();
  }

  public ngDoCheck(): void {
    if (this.value && this._iterableDiffer.diff(this.value)) {
      this._cdr.markForCheck();
    }
  }

  public ngAfterContentChecked(): void {
    this._render();
  }

  public getIsItemSelected(item: SdMultiSelectItemControl): boolean {
    if (!this.keyProp) {
      return this.value ? this.value.includes(item.value) : false;
    }
    else {
      return this.value ? this.value.map(item1 => item1[this.keyProp!]).includes(item.value[this.keyProp!]) : false;
    }
  }

  private _render(): void {
    if (!this.itemControls || !this.value || !this.contentElRef) return;

    let content = "";
    const selectedItemControls = this.itemControls.toArray().filter(item => this.getIsItemSelected(item));
    for (const selectedItemControl of selectedItemControls) {
      if (selectedItemControl.labelTemplateRef) {
        /*const embeddedView = selectedItemControl.labelTemplateRef.createEmbeddedView({});*/
        content += selectedItemControl.elRef.nativeElement.findAll("> sd-checkbox > label > ._content > ._labelTemplate")[0].innerHTML + ",\n";
      }
      else {
        content += selectedItemControl.elRef.nativeElement.findAll("> sd-checkbox > label > ._content > ._label")[0].innerHTML + ",\n";
      }
    }
    content = content.slice(0, -2);

    this.contentElRef.nativeElement.innerHTML = content;
  }
}
