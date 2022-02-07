import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdCollapseComponent } from "./sd-collapse.component";
import { SdResizeModule } from "../resize";

@NgModule({
  imports: [CommonModule, SdResizeModule],
  declarations: [SdCollapseComponent],
  exports: [SdCollapseComponent],
  providers: []
})
export class SdCollapseModule {
}
