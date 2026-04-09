import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class TestProvider {
  getValue(): string {
    return "test-value";
  }
}
