import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  Injector,
  Input,
  IterableDiffer,
  IterableDiffers,
  OnInit,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdMultiSelectItemControl} from "./SdMultiSelectItemControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-multi-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown [disabled]="disabled" (open)="open.emit()" (close)="close.emit()">
      <div #content></div>
      <div class="_icon">
        <sd-icon [fixedWidth]="true" [icon]="'angle-down'"></sd-icon>
      </div>

      <sd-dropdown-popup>
        <ng-content></ng-content>
      </sd-dropdown-popup>
    </sd-dropdown>`
})
export class SdMultiSelectControl extends SdControlBase implements DoCheck, OnInit, AfterContentChecked {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: block;
        width: 100%;

        > sd-dropdown > div {
          ${vars.formControlBase};

          text-align: left;
          display: block;
          overflow: visible;
          padding-right: 30px !important;
          height: ${vars.stripUnit(vars.gap.sm) * 2 + vars.stripUnit(vars.lineHeight) * vars.stripUnit(vars.fontSize.default) + 2}px;

          background: white;
          border-color: ${vars.transColor.default};
          transition: outline-color .1s linear;
          outline: 1px solid transparent;
          outline-offset: -1px;

          > div:first-child {
            overflow: hidden;
            white-space: nowrap;
          }

          > ._icon {
            position: absolute;
            top: -1px;
            right: -1px;
            padding: ${vars.gap.sm} 0;
            width: 30px;
            text-align: center;
            pointer-events: none;
          }

          &:focus {
            outline-color: ${vars.themeColor.primary.default};
          }
        }

        &[sd-disabled=true] > sd-dropdown > div {
          background: ${vars.bgColor};
          color: ${vars.textColor.light};
        }
      }`;
  }

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

  @ContentChildren(SdMultiSelectItemControl, {descendants: true})
  public itemControls?: QueryList<SdMultiSelectItemControl>;

  private readonly _iterableDiffer: IterableDiffer<any>;

  @Output()
  public readonly open = new EventEmitter();

  @Output()
  public readonly close = new EventEmitter();

  @ViewChild("content")
  public contentElRef?: ElementRef<HTMLDivElement>;

  public constructor(injector: Injector,
                     private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef) {
    super(injector);
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
    } else {
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
      } else {
        content += selectedItemControl.elRef.nativeElement.findAll("> sd-checkbox > label > ._content > ._label")[0].innerHTML + ",\n";
      }
    }
    content = content.slice(0, -2);

    this.contentElRef.nativeElement.innerHTML = content;
  }
}