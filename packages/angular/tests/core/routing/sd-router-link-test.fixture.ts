import { Component } from "@angular/core";
import { SdRouterLink } from "../../../src/core/routing/sd-router-link";

@Component({
  selector: "sd-router-link-test-host",
  standalone: true,
  imports: [SdRouterLink],
  template: `<div [sdRouterLink]="linkOption">link</div>`,
})
export class SdRouterLinkTestHost {
  linkOption: { link: string; params?: Record<string, string> } | undefined;
}
