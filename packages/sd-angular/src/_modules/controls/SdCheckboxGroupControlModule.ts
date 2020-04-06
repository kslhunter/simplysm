import {NgModule, ApplicationModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdCheckboxGroupControl} from "../../controls/SdCheckboxGroupControl";

@NgModule({
  imports: [
    CommonModule,
    ApplicationModule
  ],
  declarations: [
    SdCheckboxGroupControl
  ],
  exports: [
    SdCheckboxGroupControl
  ],
  entryComponents: [],
  providers: []
})
export class SdCheckboxGroupControlModule {
}