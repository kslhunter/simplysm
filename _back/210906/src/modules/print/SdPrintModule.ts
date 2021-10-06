import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdPrintProvider } from "./SdPrintProvider";

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    SdPrintProvider
  ]
})
export class SdPrintModule {
}
