import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdMutationDirective } from "./SdMutationDirective";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdMutationDirective
  ],
  exports: [
    SdMutationDirective
  ]
})
export class SdMutationDirectiveModule {
}
