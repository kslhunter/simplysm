import { Component } from "@angular/core";
import { SdCommandDirective } from "../../../src/core/commands/sd-command";

@Component({
  selector: "sd-command-test-template",
  standalone: true,
  imports: [SdCommandDirective],
  template: `<div
    class="target"
    (sdRefreshCommand)="onRefresh($event)"
    (sdSaveCommand)="onSave($event)"
    (sdInsertCommand)="onInsert($event)"
  ></div>`,
})
export class SdCommandTestTemplate {
  refreshEvents: KeyboardEvent[] = [];
  saveEvents: KeyboardEvent[] = [];
  insertEvents: KeyboardEvent[] = [];

  onRefresh(e: KeyboardEvent) {
    this.refreshEvents.push(e);
  }
  onSave(e: KeyboardEvent) {
    this.saveEvents.push(e);
  }
  onInsert(e: KeyboardEvent) {
    this.insertEvents.push(e);
  }
}

@Component({
  selector: "sd-command-test-host-directive",
  standalone: true,
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand", "sdSaveCommand"] },
  ],
  host: {
    "(sdRefreshCommand)": "onRefresh($event)",
    "(sdSaveCommand)": "onSave($event)",
  },
  template: `<ng-content />`,
})
export class SdCommandTestHostDirective {
  refreshEvents: KeyboardEvent[] = [];
  saveEvents: KeyboardEvent[] = [];

  onRefresh(e: KeyboardEvent) {
    this.refreshEvents.push(e);
  }
  onSave(e: KeyboardEvent) {
    this.saveEvents.push(e);
  }
}
