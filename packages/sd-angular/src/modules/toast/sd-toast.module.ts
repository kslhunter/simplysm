import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdToastControl } from "./sd-toast.control";
import { SdToastContainerControl } from "./sd-toast-container.control";
import { SdToastProvider } from "./sd-toast.provider";

@NgModule({
  imports: [CommonModule],
  declarations: [SdToastControl, SdToastContainerControl],
  exports: [SdToastControl, SdToastContainerControl],
  providers: [SdToastProvider]
})
export class SdToastModule {
}
