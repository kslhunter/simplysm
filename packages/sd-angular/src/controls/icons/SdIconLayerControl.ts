import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnChanges,
  OnInit,
  Renderer2,
  SimpleChanges
} from "@angular/core";
import {SizeProp} from "@fortawesome/fontawesome-svg-core";
import {SdInputValidate} from "../../commons/SdInputValidate";

/**
 * Fontawesome layers.
 */
@Component({
  selector: "sd-icon-layer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content select="fa-icon, fa-layers-text, fa-layers-counter"></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-icon-layer {
      &[sd-fixed-width=true] {
        display: inline-block;
        width: 1.25em;
      }
    }
  `]
})
export class SdIconLayerControl implements OnInit, OnChanges {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["xs", "lg", "sm", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"]
  })
  public size?: SizeProp;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-fixed-width")
  public fixedWidth?: boolean;

  public constructor(private readonly _renderer: Renderer2,
                     private readonly _elementRef: ElementRef) {
  }

  public ngOnInit(): void {
    this._renderer.addClass(this._elementRef.nativeElement, "fa-layers");
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if ("size" in changes) {
      if (changes.size.currentValue !== undefined) {
        this._renderer.addClass(this._elementRef.nativeElement, `fa-${changes.size.currentValue as SizeProp}`);
      }
      if (changes.size.previousValue !== undefined) {
        this._renderer.removeClass(this._elementRef.nativeElement, `fa-${changes.size.previousValue as SizeProp}`);
      }
    }
  }
}