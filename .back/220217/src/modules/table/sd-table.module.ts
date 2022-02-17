import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdTableControl } from "./sd-table.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdTableControl],
  exports: [SdTableControl],
  providers: []
})
export class SdTableModule {
}
