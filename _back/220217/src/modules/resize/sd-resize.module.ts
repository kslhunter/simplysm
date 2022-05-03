import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdResizeDirective } from "./sd-resize.directive";

@NgModule({
  imports: [CommonModule],
  declarations: [SdResizeDirective],
  exports: [SdResizeDirective],
  providers: []
})
export class SdResizeModule {
}
