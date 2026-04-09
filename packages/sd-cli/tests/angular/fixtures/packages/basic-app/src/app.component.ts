import { Component } from "@angular/core";

@Component({
  selector: "app-root",
  standalone: true,
  template: `<h1>{{ title }}</h1>`,
  styles: [`
    :host {
      display: block;
      $color: red;
      h1 { color: $color; }
    }
  `],
})
export class AppComponent {
  title = "test-app";
}
