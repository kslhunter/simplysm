import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdProgressComponent } from "./sd-progress.component";
import { SdProgressItemComponent } from "./sd-progress-item.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdProgressComponent, SdProgressItemComponent],
  exports: [SdProgressComponent, SdProgressItemComponent],
  providers: []
})
export class SdProgressModule {
}
