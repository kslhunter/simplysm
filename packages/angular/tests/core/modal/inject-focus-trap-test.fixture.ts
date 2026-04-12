import { Component } from "@angular/core";
import { injectFocusTrap } from "../../../src/core/modal/injectFocusTrap";

@Component({
  selector: "test-focus-trap-host",
  standalone: true,
  template: `
    <button class="btn1">1</button>
    <input class="input1" type="text" />
    <button class="btn2">2</button>
  `,
})
export class TestFocusTrapHost {
  focusTrap = injectFocusTrap();
}

@Component({
  selector: "test-focus-trap-empty",
  standalone: true,
  template: `<div class="no-tabbable">text only</div>`,
})
export class TestFocusTrapEmpty {
  focusTrap = injectFocusTrap();
}
