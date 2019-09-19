import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdTableControl} from "./SdTableControl";
import {SdTableColumnControl} from "./SdTableColumnControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdTableControl,
    SdTableColumnControl
  ],
  declarations: [
    SdTableControl,
    SdTableColumnControl
  ]
})
export class SdTableModule {
}
