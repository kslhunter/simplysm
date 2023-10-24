import {SdDockContainerControl} from "./SdDockContainerControl";
import {SdDockControl} from "./SdDockControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdEventDirectiveModule} from "../../directives/SdEventDirectiveModule";

@NgModule({
    imports: [CommonModule, SdEventDirectiveModule],
  declarations: [SdDockContainerControl, SdDockControl],
  exports: [SdDockContainerControl, SdDockControl],
  providers: []
})
export class SdDockingModule {
}