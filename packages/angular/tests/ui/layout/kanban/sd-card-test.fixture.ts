import { Component } from "@angular/core";
import { SdCardDirective } from "../../../../src/ui/layout/sd-card.directive";

@Component({
  selector: "sd-card-test-host",
  standalone: true,
  imports: [SdCardDirective],
  template: `<sd-card>content</sd-card>`,
})
export class SdCardTestHost {}

@Component({
  selector: "sd-card-attr-test-host",
  standalone: true,
  imports: [SdCardDirective],
  template: `<div sd-card>content</div>`,
})
export class SdCardAttrTestHost {}
