import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdMutationDirective} from "../../directives/SdMutationDirective";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdMutationDirective
  ],
  exports: [
    SdMutationDirective
  ],
  entryComponents: [],
  providers: []
})
export class SdMutationDirectiveModule {
}