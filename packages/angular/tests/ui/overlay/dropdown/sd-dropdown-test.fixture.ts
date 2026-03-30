import { Component } from "@angular/core";
import { SdDropdownControl } from "../../../../src/ui/overlay/dropdown/sd-dropdown.control";
import { SdDropdownPopupControl } from "../../../../src/ui/overlay/dropdown/sd-dropdown-popup.control";

@Component({
  selector: "sd-dropdown-test-default",
  standalone: true,
  imports: [SdDropdownControl, SdDropdownPopupControl],
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
  imports: [SdDropdownControl, SdDropdownPopupControl],
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
  imports: [SdDropdownControl, SdDropdownPopupControl],
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
  imports: [SdDropdownControl, SdDropdownPopupControl],
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

@Component({
  selector: "sd-dropdown-test-tall-content",
  standalone: true,
  imports: [SdDropdownControl, SdDropdownPopupControl],
  template: `
    <sd-dropdown>
      trigger
      <sd-dropdown-popup>
        <div class="tall-content" style="height: 500px;">tall content</div>
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
})
export class SdDropdownTestTallContent {}

@Component({
  selector: "sd-dropdown-test-short-content",
  standalone: true,
  imports: [SdDropdownControl, SdDropdownPopupControl],
  template: `
    <sd-dropdown>
      trigger
      <sd-dropdown-popup>
        <div class="short-content" style="height: 250px;">short content</div>
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
})
export class SdDropdownTestShortContent {}
