import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdResizeDirective} from "../../directives/SdResizeDirective";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdResizeDirective
  ],
  exports: [
    SdResizeDirective
  ],
  entryComponents: [],
  providers: []
})
export class SdResizeDirectiveModule {
}