import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

@Component({
  selector: "sd-note",
  template: `
        <ng-content></ng-content>`,
  host: {
    "[class._size-sm]": "size === 'sm'",
    "[class._theme-primary]": "theme === 'primary'",
    "[class._theme-success]": "theme === 'success'",
    "[class._theme-info]": "theme === 'info'",
    "[class._theme-warning]": "theme === 'warning'",
    "[class._theme-danger]": "theme === 'danger'"
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdNoteControl {
  @Input() public size = "default";
  @Input() public theme = "default";
}