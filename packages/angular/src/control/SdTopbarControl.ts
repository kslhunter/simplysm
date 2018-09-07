import {ChangeDetectionStrategy, Component, Injector} from "@angular/core";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a (click)="toggleSidebar()">
      <sd-icon [icon]="'bars'" [fixedWidth]="true"></sd-icon>
    </a>
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: absolute;
      z-index: $z-index-topbar;
      top: 0;
      left: 0;
      width: 100%;
      height: 32px;
      line-height: 31px;
      background: theme-color(primary, default);
      color: text-color(reverse, default);

      /deep/ {
        > * {
          float: left;
          line-height: 31px;
        }

        > a {
          min-width: 32px;
          text-align: center;
          margin-right: gap(sm);
          color: text-color(reverse, dark);

          &:hover,
          &:focus {
            color: text-color(reverse, default);
          }
        }

        > h1,
        > h2,
        > h3,
        > h4,
        > h5,
        > h6 {
          padding-right: gap(default);
        }
      }
    }
  `]
})
export class SdTopbarControl {
  public constructor(private readonly _injector: Injector) {
  }

  public toggleSidebar(): void {
    const sidebarControl = this._injector.get<{ toggle: boolean }>(SdSidebarContainerControl, {toggle: false});
    sidebarControl.toggle = !sidebarControl.toggle;
  }
}