import {Component, ElementRef, HostBinding, Input, OnChanges, OnInit, Renderer2, SimpleChanges} from "@angular/core";
import {SizeProp} from "@fortawesome/fontawesome-svg-core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

/**
 * Fontawesome layers.
 */
@Component({
  selector: "sd-icon-layer",
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-icon-layer {
      &[sd-fw=true] {
        display: inline-block;
        width: 1.25em;
      }
    }
  `]
})
export class SdIconLayerControl implements OnInit, OnChanges {
  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["xs", "lg", "sm", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"]
  })
  public size?: SizeProp;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-fw")
  public fw?: boolean;

  public constructor(private readonly _renderer: Renderer2,
                     private readonly _elementRef: ElementRef) {
  }

  public ngOnInit(): void {
    this._renderer.addClass(this._elementRef.nativeElement, "fa-layers");
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if ("size" in changes) {
      if (!changes.size.currentValue) {
        this._renderer.addClass(this._elementRef.nativeElement, `fa-${changes.size.currentValue}`);
      }
      if (!changes.size.previousValue) {
        this._renderer.removeClass(this._elementRef.nativeElement, `fa-${changes.size.previousValue}`);
      }
    }
  }
}