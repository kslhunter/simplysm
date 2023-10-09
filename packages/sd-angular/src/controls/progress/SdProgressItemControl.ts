import {ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, OnInit} from "@angular/core";
import {SdInputValidate} from "../../utils/SdInputValidate";
import {sdThemes, TSdTheme} from "../../commons";

@Component({
  selector: "sd-progress-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables";

    :host {
      display: block;
      float: left;
      overflow: hidden;
      padding: var(--gap-sm) var(--gap-default);


      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          background: var(--theme-#{$key}-default);
          color: var(--text-trans-default);
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
    includes: sdThemes
  })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme;

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
