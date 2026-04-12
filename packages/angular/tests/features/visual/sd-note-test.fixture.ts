import { Component } from "@angular/core";
import { SdNote } from "../../../src/features/visual/sd-note";

@Component({
  selector: "sd-note-theme-test",
  template: `<sd-note [theme]="'info'">안내 노트</sd-note>`,
  standalone: true,
  imports: [SdNote],
})
export class SdNoteThemeTest {}

@Component({
  selector: "sd-note-size-sm-test",
  template: `<sd-note [size]="'sm'">작은 노트</sd-note>`,
  standalone: true,
  imports: [SdNote],
})
export class SdNoteSizeSmTest {}

@Component({
  selector: "sd-note-size-lg-test",
  template: `<sd-note [size]="'lg'">큰 노트</sd-note>`,
  standalone: true,
  imports: [SdNote],
})
export class SdNoteSizeLgTest {}

@Component({
  selector: "sd-note-inset-test",
  template: `<sd-note [inset]="true">인셋 노트</sd-note>`,
  standalone: true,
  imports: [SdNote],
})
export class SdNoteInsetTest {}

@Component({
  selector: "sd-note-default-test",
  template: `<sd-note>기본 노트</sd-note>`,
  standalone: true,
  imports: [SdNote],
})
export class SdNoteDefaultTest {}
