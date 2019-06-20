import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdPaginationControl} from "./SdPaginationControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdIconModule
  ],
  exports: [
    SdPaginationControl
  ],
  declarations: [
    SdPaginationControl
  ]
})
export class SdPaginationModule {
}
