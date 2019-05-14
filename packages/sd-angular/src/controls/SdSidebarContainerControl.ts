import {ChangeDetectionStrategy, Component, HostBinding} from "@angular/core";
import {NavigationStart, Router} from "@angular/router";

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="toggle = !toggle"></div>`
})
export class SdSidebarContainerControl {
  @HostBinding("attr.sd-toggle")
  public toggle = false;

  public constructor(private readonly _router: Router) {
    this._router.events.subscribe(value => {
      if (value instanceof NavigationStart) {
        this.toggle = false;
      }
    });
  }
}
