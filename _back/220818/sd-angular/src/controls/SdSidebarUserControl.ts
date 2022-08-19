import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { SdIconRootProvider } from "../root-providers/SdIconRootProvider";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content"
         [style.background]="bgImgSrc ? 'url(' + bgImgSrc + ')' : undefined">
      <div class="sd-padding-lg">
        <ng-content></ng-content>
      </div>
      <div class="_menu-button" *ngIf="menuTitle" (click)="onMenuOpenButtonClick()">
        {{ menuTitle }}
        <fa-icon [icon]="icon.get('chevronDown')"
                 style="float: right;"
                 [sdAnimate]="[menuOpen, {transform: 'rotate(180deg)'}, {transform:'none'}]"></fa-icon>
      </div>
    </div>
    <sd-collapse [open]="menuOpen" *ngIf="menuTitle">
      <ng-content select="sd-sidebar-user-menu"></ng-content>
    </sd-collapse>`,
  styles: [/* language=SCSS */ `
    :host {
      > ._content {
        background-size: cover;
        text-shadow: 0 0 1px var(--text-brightness-default);
        background: var(--trans-brightness-rev-default);

        > ._menu-button {
          display: block;
          padding: var(--gap-sm) var(--gap-default);
          background: var(--trans-brightness-default);
          cursor: pointer;
          user-select: none;

          &:hover {
            background: var(--trans-brightness-dark);
          }

          &:active {
            background: var(--trans-brightness-darker);
          }
        }
      }

      &[sd-menu-open=true] {
        > ._content {
          > ._menu-button {
            background: var(--trans-brightness-dark);

            &:active {
              background: var(--trans-brightness-darker);
            }
          }
        }
      }
    }
  `]
})
export class SdSidebarUserControl {
  @Input()
  @SdInputValidate(String)
  public menuTitle?: string;

  @HostBinding("attr.sd-menu-open")
  public menuOpen?: boolean;

  @Input()
  @SdInputValidate(String)
  public bgImgSrc?: string;

  public onMenuOpenButtonClick(): void {
    this.menuOpen = !this.menuOpen;
  }

  public constructor(public readonly icon: SdIconRootProvider) {
  }
}
