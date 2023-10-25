import {NgModule} from "@angular/core";
import {SdFormBoxControl} from "./SdFormBoxControl";
import {SdFormBoxItemControl} from "./SdFormBoxItemControl";
import {CommonModule} from "@angular/common";

@NgModule({
  imports: [CommonModule],
  declarations: [SdFormBoxControl, SdFormBoxItemControl],
  exports: [SdFormBoxControl, SdFormBoxItemControl],
  providers: []
})
export class SdFormBoxModule {
}