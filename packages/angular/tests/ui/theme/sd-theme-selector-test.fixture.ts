import { Component } from "@angular/core";
import { SdThemeSelector } from "../../../src/ui/theme/sd-theme-selector";

@Component({
  selector: "sd-theme-selector-test",
  template: `<sd-theme-selector />`,
  standalone: true,
  imports: [SdThemeSelector],
})
export class SdThemeSelectorTest {}
