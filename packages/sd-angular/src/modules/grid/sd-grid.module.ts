import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdGridComponent } from "./sd-grid.component";
import { SdGridItemComponent } from "./sd-grid-item.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdGridComponent, SdGridItemComponent],
  exports: [SdGridComponent, SdGridItemComponent],
  providers: []
})
export class SdGridModule {
}
