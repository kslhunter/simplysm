import { Component } from "@angular/core";
import { SdProgressControl } from "../../../src/ui/visual/sd-progress.control";

@Component({
  selector: "sd-progress-half-test",
  template: `<sd-progress [value]="0.5" [theme]="'primary'" />`,
  standalone: true,
  imports: [SdProgressControl],
})
export class SdProgressHalfTest {}

@Component({
  selector: "sd-progress-zero-test",
  template: `<sd-progress [value]="0" [theme]="'success'" />`,
  standalone: true,
  imports: [SdProgressControl],
})
export class SdProgressZeroTest {}

@Component({
  selector: "sd-progress-full-test",
  template: `<sd-progress [value]="1" [theme]="'info'" />`,
  standalone: true,
  imports: [SdProgressControl],
})
export class SdProgressFullTest {}

@Component({
  selector: "sd-progress-size-sm-test",
  template: `<sd-progress [value]="0.3" [theme]="'primary'" [size]="'sm'" />`,
  standalone: true,
  imports: [SdProgressControl],
})
export class SdProgressSizeSmTest {}

@Component({
  selector: "sd-progress-inset-test",
  template: `<sd-progress [value]="0.7" [theme]="'primary'" [inset]="true" />`,
  standalone: true,
  imports: [SdProgressControl],
})
export class SdProgressInsetTest {}
