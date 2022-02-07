import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdToastComponent } from "./sd-toast.component";
import { SdToastContainerComponent } from "./sd-toast-container.component";
import { SdToastService } from "./sd-toast.service";

@NgModule({
  imports: [CommonModule],
  declarations: [SdToastComponent, SdToastContainerComponent],
  exports: [SdToastComponent, SdToastContainerComponent],
  providers: [SdToastService]
})
export class SdToastModule {
}
