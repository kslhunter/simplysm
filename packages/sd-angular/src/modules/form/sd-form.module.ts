import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdFormComponent } from "./sd-form.component";
import { SdFormItemComponent } from "./sd-form-item.component";
import { SdToastModule } from "../toast";

@NgModule({
  imports: [CommonModule, SdToastModule],
  declarations: [SdFormComponent, SdFormItemComponent],
  exports: [SdFormComponent, SdFormItemComponent],
  providers: []
})
export class SdFormModule {
}
