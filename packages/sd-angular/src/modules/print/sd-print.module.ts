import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdPrintProvider } from "./sd-print.provider";

@NgModule({
  imports: [CommonModule],
  declarations: [],
  exports: [],
  providers: [SdPrintProvider]
})
export class SdPrintModule {
}
