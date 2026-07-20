import { Component, signal } from "@angular/core";
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
  selector: "sd-dropdown-test-with-tabbable",
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
export class SdDropdownTestWithTabbable {}

/**
 * 팝업 내부의 포커스된 버튼이 클릭 결과로 자기 자신을 disabled 시키는 케이스.
 * 렌더 도중 native `disabled` 가 적용되면 브라우저가 동기 blur 를 발사한다.
 */
@Component({
  selector: "sd-dropdown-test-self-disabling",
  standalone: true,
  imports: [SdDropdown, SdDropdownPopup],
  template: `
    <sd-dropdown>
      trigger
      <sd-dropdown-popup>
        <button class="self-disabling-button" [disabled]="isDisabled()" (click)="isDisabled.set(true)">
          disable me
        </button>
        <span class="popup-text">text</span>
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
})
export class SdDropdownTestSelfDisabling {
  readonly isDisabled = signal(false);
}

