import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "@simplysm/sd-angular";
import { faChevronDown } from "@fortawesome/pro-light-svg-icons/faChevronDown";

@Component({
  selector: "sdm-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content" [attr.style]="contentStyle" (click)="menuOpen = !menuOpen">
      <div class="_menu-button">
        <sd-collapse-icon [open]="menuOpen" style="float: right;" openRotate="180"
                          [icon]="icons.falChevronDown"></sd-collapse-icon>
      </div>

      <ng-content></ng-content>
    </div>
    <sd-collapse [open]="menuOpen">
      <ng-content select="sdm-sidebar-user-menu"></ng-content>
    </sd-collapse>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: block;
      overflow: hidden;

      border-top-right-radius: var(--gap-lg);
      //border-bottom-right-radius: var(--gap-xs);
      //border-bottom: 1px solid var(--border-color);

      /*border-bottom: 2px solid var(--theme-color-primary-darker);
      background: var(--theme-color-primary-default);
      
      color: var(--text-brightness-rev-default);*/

      > ._content {
        @include mobile-active-effect(true);

        position: relative;
        border-top-right-radius: var(--gap-lg);
        //border-bottom-right-radius: var(--gap-xs);
        //border-bottom: 1px solid var(--border-color);

        /*border-bottom: 2px solid var(--theme-color-primary-darker);
        background: var(--theme-color-primary-dark);*/

        > ._menu-button {
          position: absolute;
          bottom: 0;
          right: 0;
          padding: var(--gap-xs) var(--gap-default);
          font-size: small;
        }
      }
    }
  `]
})
export class SdmSidebarUserControl {
  public icons = {
    falChevronDown: faChevronDown
  };

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-menu-open")
  public menuOpen?: boolean;

  @Input("content.style")
  @SdInputValidate(String)
  public contentStyle?: string;
}
