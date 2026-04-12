import { Component } from "@angular/core";
import { SdDropdown } from "../../../src/controls/dropdown/sd-dropdown";
import { SdDropdownPopup } from "../../../src/controls/dropdown/sd-dropdown-popup";

@Component({
  selector: "sd-dropdown-test-default",
  standalone: true,
  imports: [SdDropdown, SdDropdownPopup],
  template: `
    <sd-dropdown>
      trigger
      <sd-dropdown-popup>popup content</sd-dropdown-popup>
    </sd-dropdown>
  `,
})
export class SdDropdownTestDefault {}

@Component({
  selector: "sd-dropdown-test-disabled",
  standalone: true,
  imports: [SdDropdown, SdDropdownPopup],
  template: `
    <sd-dropdown [disabled]="true">
      trigger
      <sd-dropdown-popup>popup content</sd-dropdown-popup>
    </sd-dropdown>
  `,
})
export class SdDropdownTestDisabled {}

@Component({
  selector: "sd-dropdown-test-scrollable",
  standalone: true,
  imports: [SdDropdown, SdDropdownPopup],
  template: `
    <div class="scroll-container" style="height: 200px; overflow: auto;">
      <div style="height: 100px;"></div>
      <sd-dropdown>
        trigger
        <sd-dropdown-popup>popup content</sd-dropdown-popup>
      </sd-dropdown>
      <div style="height: 500px;"></div>
    </div>
  `,
})
export class SdDropdownTestScrollable {}

@Component({
  selector: "sd-dropdown-test-with-focusable",
  standalone: true,
  imports: [SdDropdown, SdDropdownPopup],
  template: `
    <sd-dropdown>
      trigger
      <sd-dropdown-popup>
        <input class="popup-input" type="text" />
        <button class="popup-button">click me</button>
      </sd-dropdown-popup>
    </sd-dropdown>
    <button class="outside-button">outside</button>
  `,
})
export class SdDropdownTestWithFocusable {}

