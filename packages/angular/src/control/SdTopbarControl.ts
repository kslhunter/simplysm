import {ChangeDetectionStrategy, Component, Injector} from "@angular/core";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a (click)="toggleSidebar()">
      <sd-icon [icon]="'bars'" [fixedWidth]="true"></sd-icon>
    </a>
    <ng-content></ng-content>`
})
export class SdTopbarControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
:host {
  display: block;
  position: absolute;
  z-index: ${vars.zIndex.topbar};
  top: 0;
  left: 0;
  width: 100%;
  height: 36px;
  line-height: 35px;
  background: ${vars.topbarTheme};
  color: ${vars.textReverseColor.default};

  > * {
    float: left;
    line-height: 35px;
  }

  > a {
    min-width: 36px;
    text-align: center;
    margin-right: ${vars.gap.small};
    color: ${vars.textReverseColor.dark};

    &:hover,
    &:focus {
      color: ${vars.textReverseColor.default};
    }
  }

  > h1,
  > h2,
  > h3,
  > h4,
  > h5,
  > h6 {
    padding-right: ${vars.gap.default};
  }
}`;
  }

  public constructor(private readonly _injector: Injector) {
    super(_injector);
  }

  public toggleSidebar(): void {
    const sidebarControl = this._injector.get<{ toggle: boolean }>(SdSidebarContainerControl, {toggle: false});
    sidebarControl.toggle = !sidebarControl.toggle;
  }
}