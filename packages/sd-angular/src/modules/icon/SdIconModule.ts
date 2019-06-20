import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SdIconControl} from "./SdIconControl";
import {SdSharedModule} from "../shared/SdSharedModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    FontAwesomeModule
  ],
  exports: [
    SdIconControl
  ],
  declarations: [
    SdIconControl
  ]
})
export class SdIconModule {
}
