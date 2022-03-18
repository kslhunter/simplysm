import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `루트`
})
export class AppPage {
}
