import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdWindowProvider} from "./SdWindowProvider";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  providers: [
    SdWindowProvider
  ]
})
export class SdWindowModule {
}
