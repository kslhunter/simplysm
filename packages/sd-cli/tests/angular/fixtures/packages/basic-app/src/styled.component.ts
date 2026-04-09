import { Component } from "@angular/core";

@Component({
  selector: "app-styled",
  standalone: true,
  template: `<p>styled</p>`,
  styles: [`
    @use 'variables' as vars;
    :host {
      color: vars.$primary;
    }
  `],
})
export class StyledComponent {}
