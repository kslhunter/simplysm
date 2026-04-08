import { Component } from "@angular/core";
import { SdDockContainer } from "../../../../src/ui/layout/dock/sd-dock-container";
import { SdDock } from "../../../../src/ui/layout/dock/sd-dock";

@Component({
  selector: "sd-dock-test-top",
  standalone: true,
  imports: [SdDockContainer, SdDock],
  template: `
    <sd-dock-container>
      <sd-dock [position]="'top'" style="height: 50px">top dock</sd-dock>
      <div>content</div>
    </sd-dock-container>
  `,
})
export class SdDockTestTop {}

@Component({
  selector: "sd-dock-test-multi",
  standalone: true,
  imports: [SdDockContainer, SdDock],
  template: `
    <sd-dock-container>
      <sd-dock [position]="'left'" style="width: 100px">left dock</sd-dock>
      <sd-dock [position]="'top'" style="height: 50px">top dock</sd-dock>
      <div>content</div>
    </sd-dock-container>
  `,
})
export class SdDockTestMulti {}

@Component({
  selector: "sd-dock-test-empty",
  standalone: true,
  imports: [SdDockContainer],
  template: `
    <sd-dock-container>
      <div>content only</div>
    </sd-dock-container>
  `,
})
export class SdDockTestEmpty {}

@Component({
  selector: "sd-dock-test-content-class",
  standalone: true,
  imports: [SdDockContainer],
  template: `
    <sd-dock-container [contentClass]="'my-class'">
      <div>content</div>
    </sd-dock-container>
  `,
})
export class SdDockTestContentClass {}

@Component({
  selector: "sd-dock-test-resizable",
  standalone: true,
  imports: [SdDockContainer, SdDock],
  template: `
    <sd-dock-container>
      <sd-dock [position]="'top'" [resizable]="true" style="height: 50px">resizable dock</sd-dock>
      <div>content</div>
    </sd-dock-container>
  `,
})
export class SdDockTestResizable {}

@Component({
  selector: "sd-dock-test-not-resizable",
  standalone: true,
  imports: [SdDockContainer, SdDock],
  template: `
    <sd-dock-container>
      <sd-dock [position]="'top'" style="height: 50px">not resizable</sd-dock>
      <div>content</div>
    </sd-dock-container>
  `,
})
export class SdDockTestNotResizable {}

@Component({
  selector: "sd-dock-test-four-directions",
  standalone: true,
  imports: [SdDockContainer, SdDock],
  template: `
    <sd-dock-container>
      <sd-dock [position]="'top'" style="height: 30px">top</sd-dock>
      <sd-dock [position]="'bottom'" style="height: 30px">bottom</sd-dock>
      <sd-dock [position]="'left'" style="width: 80px">left</sd-dock>
      <sd-dock [position]="'right'" style="width: 80px">right</sd-dock>
      <div>center</div>
    </sd-dock-container>
  `,
})
export class SdDockTestFourDirections {}
