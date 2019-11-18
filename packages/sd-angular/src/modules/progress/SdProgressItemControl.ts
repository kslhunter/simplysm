import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnInit,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../..";

function colorValidator(value: string): boolean {
  return /^#[0-9a-fA-F]*$/.test(value);
}

@Component({
  selector: "sd-progress-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `    
      <ng-content></ng-content>
  `,
  styles: [/* language=SCSS */ `
    @import "../../../scss/variables-scss";

    sd-progress-item {
      display: block;
      float: left;
      overflow: hidden;
      padding: var(--gap-sm) var(--gap-default);

      
      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] {
          background: var(--theme-#{$color}-default);
          color: var(--text-color-default);
        }
      }
    }
  `]
})
export class SdProgressItemControl implements OnInit {
  @Input()
  @HostBinding("style.width")
  public width = "100%";

  @Input()
  @HostBinding("style.height")
  public height = "30px";

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["primary", "info", "success", "warning", "danger", "grey", "bluegrey"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger" | "grey" | "bluegrey";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: colorValidator
  })
  @HostBinding("style.background")
  public color?: string;

  public constructor(public readonly elRef: ElementRef) {
  }

  public ngOnInit(): void {
    const el = this.elRef.nativeElement;
    el.style.width = `${this.width}%`;
    el.style.height = `${this.height}px`;
  }
}