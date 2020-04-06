import {NgModule, ApplicationModule} from "@angular/core";
import {SdCheckboxGroupControl} from "../../controls/SdCheckboxGroupControl";

@NgModule({
  imports: [
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