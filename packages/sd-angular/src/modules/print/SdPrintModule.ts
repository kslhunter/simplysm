import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdPrintProvider} from "./SdPrintProvider";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  providers: [
    SdPrintProvider
  ]
})
export class SdPrintModule {
}
