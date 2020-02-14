import {ChangeDetectionStrategy, Component} from "@angular/core";
import {SdModalBase} from "../providers/SdModalProvider";
import {ISdSheetConfigVM, SdSheetControl} from "../controls/SdSheetControl";

@Component({
  selector: "sd-sheet-config-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  `,
  styles: [/* language=SCSS */ `
  `]
})
export class SdSheetConfigModal extends SdModalBase<SdSheetControl, ISdSheetConfigVM> {
}