import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  EventEmitter,
  HostBinding,
  Input,
  IterableDiffer,
  IterableDiffers,
  Output,
  QueryList
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdMultiSelectItemControl} from "./SdMultiSelectItemControl";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";

@Component({
  selector: "sd-multi-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dropdown [disabled]="disabled">
      <div class="_sd-multi-select-control" [innerHTML]="getContentHtml()"></div>
      <div class="_icon">
        <sd-icon [fixedWidth]="true" [icon]="'angle-down'"></sd-icon>
      </div>

      <sd-dropdown-popup>
        <ng-content></ng-content>
      </sd-dropdown-popup>
    </sd-dropdown>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      width: 100%;

      /deep/ > sd-dropdown > div {
        @include form-control-base();

        display: block;
        overflow: visible;
        padding-right: 30px !important;
        height: gap(sm) * 2 + strip-unit($line-height) * font-size(default) + 2;

        background: white;
        border-color: trans-color(default);
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
          padding: gap(sm) 0;
          width: 30px;
          text-align: center;
          pointer-events: none;
        }

        &:focus {
          outline-color: theme-color(primary, default);
        }
      }

      &[sd-disabled=true] /deep/ > sd-dropdown > div {
        background: $bg-color;
        color: text-color(light);
      }
    }
  `]
})
export class SdMultiSelectControl implements DoCheck {
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

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _sanitizer: DomSanitizer) {
    this._iterableDiffer = this._iterableDiffers.find([]).create((index, item) => item);
  }

  public ngDoCheck(): void {
    if (this.value && this._iterableDiffer.diff(this.value)) {
      this._cdr.markForCheck();
    }
  }

  public getIsItemSelected(item: SdMultiSelectItemControl): boolean {
    if (!this.keyProp) {
      return this.value ? this.value.includes(item.value) : false;
    }
    else {
      return this.value ? this.value.map(item1 => item1[this.keyProp!]).includes(item.value[this.keyProp!]) : false;
    }
  }

  public getContentHtml(): SafeHtml {
    if (!this.itemControls || !this.value) {
      return "";
    }

    return this._sanitizer.bypassSecurityTrustHtml(
      this.itemControls.toArray()
        .filter(item => this.getIsItemSelected(item))
        .map(item => item.elRef.nativeElement.findAll("> sd-checkbox > label > ._content")[0].innerHTML).join(",\n")
    );
  }
}