import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdTableControl} from "./SdTableControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdTableControl
  ],
  declarations: [
    SdTableControl
  ]
})
export class SdTableModule {
}
