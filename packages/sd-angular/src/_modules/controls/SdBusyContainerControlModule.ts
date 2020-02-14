import {NgModule} from "@angular/core";
import {SdBusyContainerControl} from "../../controls/SdBusyContainerControl";
import {SdAngularModule} from "../../SdAngularModule";

@NgModule({
  imports: [
    SdAngularModule
  ],
  declarations: [
    SdBusyContainerControl
  ],
  exports: [
    SdBusyContainerControl
  ],
  entryComponents: []
})
export class SdBusyContainerControlModule {
}