import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `모달`,
  styles: [/* language=SCSS */ `
  `]
})
export class SdModalEntryControl {
  public open: boolean;
}