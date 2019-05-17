import {ChangeDetectionStrategy, Component, HostBinding} from "@angular/core";
import {NavigationStart, Router} from "@angular/router";
import {SdWindowProvider} from "../providers/SdWindowProvider";

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

  @HostBinding("attr.sd-hidden")
  public get hidden(): boolean {
    return this._window.isWindow;
  }

  public constructor(private readonly _router: Router,
                     private readonly _window: SdWindowProvider) {
    this._router.events.subscribe(value => {
      if (value instanceof NavigationStart) {
        this.toggle = false;
      }
    });
  }
}
