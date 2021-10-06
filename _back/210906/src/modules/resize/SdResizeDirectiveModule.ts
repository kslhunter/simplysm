import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdResizeDirective } from "./SdResizeDirective";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdResizeDirective
  ],
  exports: [
    SdResizeDirective
  ]
})
export class SdResizeDirectiveModule {
}
