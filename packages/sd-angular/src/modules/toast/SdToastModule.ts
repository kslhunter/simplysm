import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdToastContainerControl} from "./SdToastContainerControl";
import {SdToastControl} from "./SdToastControl";
import {SdToastProvider} from "./SdToastProvider";
import {SdSharedModule} from "../shared/SdSharedModule";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdToastContainerControl,
    SdToastControl
  ],
  declarations: [
    SdToastContainerControl,
    SdToastControl
  ],
  entryComponents: [
    SdToastContainerControl,
    SdToastControl
  ],
  providers: [
    SdToastProvider
  ]
})
export class SdToastModule {
}
