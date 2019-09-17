import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdProgressControl} from "./SdProgressControl";
import {SdProgressItemControl} from "./SdProgressItemControl";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdProgressControl,
    SdProgressItemControl
  ],
  declarations: [
    SdProgressControl,
    SdProgressItemControl
  ]
})
export class SdProgressModule {
}
