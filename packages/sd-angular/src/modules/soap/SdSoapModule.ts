import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdSoapProvider} from "./SdSoapProvider";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  providers: [
    SdSoapProvider
  ]
})
export class SdSoapModule {
}
