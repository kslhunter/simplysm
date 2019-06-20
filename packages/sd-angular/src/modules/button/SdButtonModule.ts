import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdButtonControl} from "./SdButtonControl";
import {SdSharedModule} from "../shared/SdSharedModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdButtonControl
  ],
  declarations: [
    SdButtonControl
  ]
})
export class SdButtonModule {
}
