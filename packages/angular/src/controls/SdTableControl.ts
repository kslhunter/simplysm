import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table>
      <ng-content></ng-content>
    </table>`
})
export class SdTableControl {
}
