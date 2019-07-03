import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  HostBinding,
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


@Component({
  selector: "sd-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown #dropdown [disabled]="disabled" (open)="open.emit()">
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
export class SdSelectControl {
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

  @Output()
  public readonly open = new EventEmitter();

  @ViewChild("dropdown")
  public dropdownControl?: SdDropdownControl;

  public constructor(private readonly _sanitizer: DomSanitizer) {
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
      this.itemControls.toArray().single(item => this.getIsItemSelected(item)) ?
        optional(() =>
          this.itemControls!.toArray().single(item => this.getIsItemSelected(item))
        )!.content : ""
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
