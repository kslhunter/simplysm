import { Component } from "@angular/core";

@Component({
  selector: "lib-test",
  standalone: true,
  template: `<p>{{ message }}</p>`,
  styles: [`
    :host { display: block; }
  `],
})
export class TestComponent {
  message = "test";
}
