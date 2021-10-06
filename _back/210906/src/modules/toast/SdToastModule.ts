import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdToastContainerControl } from "./SdToastContainerControl";
import { SdToastProvider } from "./SdToastProvider";
import { SdToastControl } from "./SdToastControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdToastContainerControl,
    SdToastControl
  ],
  exports: [
    SdToastContainerControl,
    SdToastControl
  ],
  providers: [
    SdToastProvider
  ]
})
export class SdToastModule {
}
