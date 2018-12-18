import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  HostBinding,
  Injector,
  Input,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {SdSelectItemControl} from "./SdSelectItemControl";
import {optional} from "@simplism/core";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown #dropdown [disabled]="disabled">
      <div class="_sd-select-content" [innerHTML]="getContentHtml()"></div>
      <div class="_invalid-indicator"></div>
      <div class="_icon">
        <sd-icon [fixedWidth]="true" [icon]="'angle-down'"></sd-icon>
      </div>

      <sd-dropdown-popup>
        <ng-content></ng-content>
      </sd-dropdown-popup>
    </sd-dropdown>`
})
export class SdSelectControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: block;
        width: 100%;

        > sd-dropdown > div {
          ${vars.formControlBase};
          border-radius: 3px;

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

        &[sd-invalid=true] > sd-dropdown > div > ._invalid-indicator {
          display: block;
          position: absolute;
          top: 2px;
          left: 2px;
          border-radius: 100%;
          width: 4px;
          height: 4px;
          background: ${vars.themeColor.danger.default};
        }
      }`;
  }

  @Input()
  public value?: any;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(String)
  public keyProp?: string;

  @HostBinding("attr.sd-invalid")
  public get isInvalid(): boolean {
    return !!this.required && !this.value;
  }

  @ContentChildren(SdSelectItemControl, {descendants: true})
  public itemControls?: QueryList<SdSelectItemControl>;

  @ViewChild("dropdown")
  public dropdownControl?: SdDropdownControl;

  public constructor(injector: Injector,
                     private readonly _sanitizer: DomSanitizer) {
    super(injector);
  }

  public getIsItemSelected(item: SdSelectItemControl): boolean {
    const thisKeyValue = this.keyProp && this.value ? this.value[this.keyProp] : this.value;
    const itemKeyValue = this.keyProp && item.value ? item.value[this.keyProp] : item.value;
    return thisKeyValue === itemKeyValue;
  }

  public getContentHtml(): SafeHtml {
    if (!this.itemControls) {
      return "";
    }

    return this._sanitizer.bypassSecurityTrustHtml(
      optional(
        this.itemControls.toArray().single(item => this.getIsItemSelected(item)),
        o => o.content
      ) || ""
    );
  }

  public setValue(value: any): void {
    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(this.value);
      if (this.dropdownControl) {
        this.dropdownControl.closePopup();
      }
    }
  }
}