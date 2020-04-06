import {ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, OnInit} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";

@Component({
  selector: "sd-progress-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables-scss-arr";

    :host {
      display: block;
      float: left;
      overflow: hidden;
      padding: var(--gap-sm) var(--gap-default);


      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] {
          background: var(--theme-color-#{$color}-default);
          color: var(--text-brightness-default);
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
  @SdInputValidate({
    type: String,
    includes: ["primary", "info", "success", "warning", "danger", "grey", "bluegrey"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger" | "grey" | "bluegrey";

  @Input()
  @SdInputValidate({
    type: String,
    validator(value: string): boolean {
      return (/^#[0-9a-fA-F]*$/).test(value);
    }
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