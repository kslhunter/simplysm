import {
  AfterContentChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  IterableDiffer,
  IterableDiffers,
  OnInit,
  Output,
  TemplateRef,
  ViewChild
} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";
import {JsonConvert, NeverEntryError} from "@simplysm/sd-core-common";
import {SdDropdownControl} from "./SdDropdownControl";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown #dropdown [disabled]="disabled" (open)="open.emit()">
      <div class="_sd-select-content"></div>
      <div class="_invalid-indicator"></div>
      <div class="_icon">
        <sd-icon fixedWidth icon="caret-down"></sd-icon>
      </div>

      <sd-dropdown-popup #popup>
        <ng-container *ngIf="!items">
          <ng-content></ng-content>
        </ng-container>
        <ng-container *ngIf="items">
          <sd-dock-container>
            <sd-dock class="sd-border-bottom-default">
              <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
            </sd-dock>

            <sd-pane>
              <ng-template [ngTemplateOutlet]="beforeTemplateRef"></ng-template>
              <ng-template #rowOfList let-items="items">
                <ng-container *ngFor="let item of items; let i = index; trackBy: trackByItemFn">
                  <div class="_sd-select-item">
                    <ng-template [ngTemplateOutlet]="itemTemplateRef"
                                 [ngTemplateOutletContext]="{item: item}"></ng-template>

                    <ng-container *ngIf="getChildrenFn && getChildrenFn(i, item) && getChildrenFn!(i, item).length > 0">
                      <div class="_children">
                        <ng-template [ngTemplateOutlet]="rowOfList"
                                     [ngTemplateOutletContext]="{items: getChildrenFn(i, item)}"></ng-template>
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
    </sd-dropdown>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: block;
      width: 100%;

      /deep/ > sd-dropdown > div {
        @include form-control-base();

        background: var(--theme-color-secondary-lightest);
        display: block;
        overflow: visible;
        padding-right: 30px !important;
        height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

        border: 1px solid var(--sd-border-color);
        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;
        cursor: pointer;

        > div:first-child {
          overflow: hidden;
          white-space: nowrap;
        }

        > ._icon {
          position: absolute;
          top: -1px;
          right: -1px;
          padding: var(--gap-sm) 0;
          width: 30px;
          text-align: center;
          pointer-events: none;
        }

        &:focus {
          outline-color: var(--theme-color-primary-default);
        }
      }

      &[sd-disabled=true] /deep/ > sd-dropdown > div {
        background: var(--theme-color-grey-lightest);
        color: var(--text-brightness-light);
        cursor: default;
      }

      &[sd-invalid=true] /deep/ > sd-dropdown > div > ._invalid-indicator {
        @include invalid-indicator();
      }

      &[sd-inline=true] {
        display: inline-block;
        width: auto;
        vertical-align: top;
      }

      &[sd-size=sm] /deep/ > sd-dropdown > div {
        padding: var(--gap-xs) var(--gap-sm);

        > ._icon {
          padding: var(--gap-xs) 0;
        }

        height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }

      &[sd-size=lg] /deep/ > sd-dropdown > div {
        padding: var(--gap-default) var(--gap-lg);

        > ._icon {
          padding: var(--gap-default) 0;
        }

        height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }

      &[sd-inset=true] {
        > /deep/ sd-dropdown > div {
          border: none;
          border-radius: 0;
          height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=sm] > /deep/ sd-dropdown > div {
          height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=lg] > /deep/ sd-dropdown > div {
          height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        > /deep/ sd-dropdown > div:focus {
          outline: 1px solid var(--theme-color-primary-default);
          outline-offset: -1px;
        }
      }
    }

    ._sd-select-item > ._children {
      border-left: var(--gap-xl) solid var(--theme-color-secondary-lightest);
    }
  `]
})
export class SdSelectControl implements DoCheck, AfterContentChecked, OnInit, AfterViewInit {
  @Input()
  public set value(value: any) {
    this._value = value;
    this._refreshContent();
    this._refreshInvalid();
  }

  public get value(): any {
    return this._value;
  }

  private _value: any;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  @Input()
  @SdInputValidate(Boolean)
  public set required(value: boolean | undefined) {
    this._required = value;
    this._refreshInvalid();
  }

  public get required(): boolean | undefined {
    return this._required;
  }

  private _required: boolean | undefined;

  @Input()
  @HostBinding("attr.sd-disabled")
  @SdInputValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdInputValidate(String)
  public keyProp?: string;

  @ViewChild("dropdown", {static: true})
  public dropdownControl?: SdDropdownControl;

  @ViewChild("popup", {static: true, read: ElementRef})
  public popupElRef?: ElementRef<HTMLElement>;

  @ContentChild("item", {static: true})
  public itemTemplateRef?: TemplateRef<any>;

  @ContentChild("header", {static: true})
  public headerTemplateRef?: TemplateRef<any>;

  @ContentChild("before", {static: true})
  public beforeTemplateRef?: TemplateRef<any>;

  @Input()
  @SdInputValidate(Array)
  public items?: any[];

  @Input()
  @SdInputValidate(Function)
  public trackByFn?: (index: number, item: any) => any;

  @Input()
  @SdInputValidate(Function)
  public getChildrenFn?: (index: number, item: any) => any;

  @Output()
  public readonly open = new EventEmitter();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  public get isDropdownLocatedTop(): boolean {
    return this.dropdownControl ? this.dropdownControl.isDropdownLocatedTop : false;
  }

  public trackByItemFn(index: number, item: any): any {
    if (this.trackByFn) {
      return this.trackByFn(index, item) ?? item;
    }
    else {
      return item;
    }
  }

  private readonly _iterableDiffer: IterableDiffer<any>;
  private readonly _itemElsIterableDiffer: IterableDiffer<any>;

  private readonly _el: HTMLElement;
  private _contentEl?: HTMLElement;
  private _popupEl?: HTMLElement;

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _elRef: ElementRef) {
    this._el = (this._elRef.nativeElement as HTMLElement);
    this._iterableDiffer = this._iterableDiffers.find([]).create((index, item) => this.trackByItemFn(index, item));
    this._itemElsIterableDiffer = this._iterableDiffers.find([]).create();
  }

  public ngOnInit(): void {
    this._contentEl = this._el.findAll("._sd-select-content")[0];
    this._popupEl = this._el.findAll("sd-dropdown-popup")[0];
  }

  public ngAfterViewInit(): void {
    this._refreshContent();
    if (!this._popupEl) throw new NeverEntryError();
    this._popupEl.addEventListener("mutation", () => {
      this._refreshContent();
    }, true);
  }

  public ngDoCheck(): void {
    if (this.items && this._iterableDiffer.diff(this.items)) {
      this._cdr.markForCheck();
    }
  }

  public ngAfterContentChecked(): void {
    if (this.popupElRef) {
      const itemEls = this.popupElRef.nativeElement.findAll("sd-select-item");
      if (this._itemElsIterableDiffer.diff(itemEls)) {
        this._cdr.markForCheck();
      }
    }
  }

  public setValue(value: any): void {
    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(this.value);
    }

    if (this.dropdownControl) {
      this.dropdownControl.closePopup();
    }
  }

  private _refreshContent(): void {
    if (this._contentEl === undefined || this._popupEl === undefined) return;

    const selectedItemEl = this._popupEl.findAll("sd-select-item")
      .single(item => item.getAttribute("sd-value-json") === JsonConvert.stringify(this.value));
    if (!selectedItemEl) {
      this._contentEl.innerHTML = "";
    }
    else {
      let cursorEl: HTMLElement | undefined = selectedItemEl;
      let innerHTML = "";
      while (true) {
        if (!cursorEl) break;

        const labelTemplateEl = cursorEl.findAll("> ._labelTemplate")[0];
        const labelEl = labelTemplateEl !== undefined ? labelTemplateEl : cursorEl.findAll("> ._label")[0];
        innerHTML = labelEl.innerHTML + (Boolean(innerHTML) ? " / " + innerHTML : "");

        cursorEl = cursorEl.findParent("._children")?.parentElement?.findFirst("sd-select-item");
      }

      this._contentEl.innerHTML = innerHTML;
    }
  }

  private _refreshInvalid(): void {
    if (this.required && this.value === undefined) {
      this._el.setAttribute("sd-invalid", "true");
    }
    else {
      this._el.setAttribute("sd-invalid", "false");
    }
  }
}
