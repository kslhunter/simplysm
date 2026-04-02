import { Component } from "@angular/core";
import { SdRouterLinkDirective } from "../../../src/core/directives/sd-router-link.directive";

@Component({
  selector: "sd-router-link-test-host",
  standalone: true,
  imports: [SdRouterLinkDirective],
  template: `<div [sd-router-link]="linkOption">link</div>`,
})
export class SdRouterLinkTestHost {
  linkOption: { link: string; params?: Record<string, string> } | undefined;
}
