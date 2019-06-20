import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdCasePipe} from "./SdCasePipe";
import {SdSharedModule} from "../shared/SdSharedModule";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdCasePipe
  ],
  declarations: [
    SdCasePipe
  ]
})
export class SdCasePipeModule {
}
