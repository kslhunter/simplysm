import {SdToastControl} from "./SdToastControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdToastContainerControl} from "./SdToastContainerControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdToastContainerControl,
    SdToastControl,
  ],
  exports: [
    SdToastContainerControl,
    SdToastControl,
  ],
  providers: []
})
export class SdToastModule {
}