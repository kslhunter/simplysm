import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdNoteComponent } from "./sd-note.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdNoteComponent],
  exports: [SdNoteComponent],
  providers: []
})
export class SdNoteModule {
}
