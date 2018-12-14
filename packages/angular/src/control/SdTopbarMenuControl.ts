import {ChangeDetectionStrategy, Component, Injector} from "@angular/core";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdTopbarMenuControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
:host {
  display: block;
  padding: 0 ${vars.gap.default};
  cursor: pointer;
  transition: .1s linear;
  transition-property: background, color;
  user-select: none;
  color: ${vars.topbarLinkColor};
  float: left;

  &:hover {
    background: ${vars.transColor.dark};
    color: ${vars.topbarLinkHoverColor};
  }

  &:active {
    transition: none;
    background: ${vars.transColor.dark};
    color: ${vars.topbarLinkHoverColor};
  }

  @media ${vars.media.mobile} {
    float: right;
  }
}`;
  }

  public constructor(injector: Injector) {
    super(injector);
  }
}