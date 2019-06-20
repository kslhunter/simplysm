import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdCardControl} from "./SdCardControl";
import {SdSharedModule} from "../shared/SdSharedModule";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdCardControl
  ],
  declarations: [
    SdCardControl
  ]
})
export class SdCardModule {
}
