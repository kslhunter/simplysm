import { Component } from "@angular/core";
import { SdCard } from "../../../../src/ui/layout/sd-card";

@Component({
  selector: "sd-card-test-host",
  standalone: true,
  imports: [SdCard],
  template: `<sd-card>content</sd-card>`,
})
export class SdCardTestHost {}

@Component({
  selector: "sd-card-attr-test-host",
  standalone: true,
  imports: [SdCard],
  template: `<div sdCard>content</div>`,
})
export class SdCardAttrTestHost {}
