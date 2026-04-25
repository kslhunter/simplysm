import { Component, input, model } from "@angular/core";
import { SdBaseContainer } from "../../../src/data/crud/sd-base-container";
import type { SdViewType } from "../../../src/core/routing/injectViewTypeSignal";

@Component({
  selector: "sd-base-container-test",
  template: `<sd-base-container
    [(ready)]="ready"
    [initialized]="initialized()"
    [(busyCount)]="busyCount"
    [restricted]="restricted()"
    [viewType]="viewType()"
  />`,
  standalone: true,
  imports: [SdBaseContainer],
})
export class SdBaseContainerTestHost {
  ready = model(false);
  initialized = input(false);
  busyCount = model(0);
  restricted = input(false);
  viewType = input<SdViewType>("page");
}
