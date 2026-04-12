import { Component } from "@angular/core";
import { SdStatePreset } from "../../../src/data/state-preset/sd-state-preset";

@Component({
  selector: "sd-state-preset-test",
  template: `<sd-state-preset [key]="'test-key'" [(state)]="testState" />`,
  standalone: true,
  imports: [SdStatePreset],
})
export class SdStatePresetTestHost {
  testState: any = { filter: "default" };
}
