import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "app-main",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-topbar-container>
      <sd-topbar>
        <h4>메인화면</h4>
      </sd-topbar>
    </sd-topbar-container>`
})
export class MainPage {
}
