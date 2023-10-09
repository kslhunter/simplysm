import {SdProgressItemControl} from "./SdProgressItemControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdProgressControl} from "./SdProgressControl";

@NgModule({
  imports: [CommonModule],
  declarations: [SdProgressControl, SdProgressItemControl],
  exports: [SdProgressControl, SdProgressItemControl],
  providers: []
})
export class SdProgressModule {
}