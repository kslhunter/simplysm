import { Component } from "@angular/core";
import { SdLabel } from "../../../src/ui/visual/sd-label";

@Component({
  selector: "sd-label-default-test",
  template: `<sd-label>기본 라벨</sd-label>`,
  standalone: true,
  imports: [SdLabel],
})
export class SdLabelDefaultTest {}

@Component({
  selector: "sd-label-theme-test",
  template: `<sd-label [theme]="'primary'">테마 라벨</sd-label>`,
  standalone: true,
  imports: [SdLabel],
})
export class SdLabelThemeTest {}

@Component({
  selector: "sd-label-color-test",
  template: `<sd-label [color]="'#ff0000'">커스텀 라벨</sd-label>`,
  standalone: true,
  imports: [SdLabel],
})
export class SdLabelColorTest {}

@Component({
  selector: "sd-label-clickable-test",
  template: `<sd-label [clickable]="true">클릭 라벨</sd-label>`,
  standalone: true,
  imports: [SdLabel],
})
export class SdLabelClickableTest {}
