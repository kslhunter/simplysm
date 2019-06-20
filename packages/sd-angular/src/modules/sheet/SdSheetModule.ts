import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdPaginationModule} from "../pagination/SdPaginationModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdLocalStorageModule} from "../local-storage/SdLocalStorageModule";
import {SdSheetControl} from "./SdSheetControl";
import {SdSheetColumnControl} from "./SdSheetColumnControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdPaginationModule,
    SdIconModule,
    SdLocalStorageModule
  ],
  exports: [
    SdSheetControl,
    SdSheetColumnControl
  ],
  declarations: [
    SdSheetControl,
    SdSheetColumnControl
  ]
})
export class SdSheetModule {
}
