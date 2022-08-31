import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-sheet-adv",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock>
        <sd-anchor>
          <fa-icon [icon]="icons.fasCog | async" [fixedWidth]=true></fa-icon>
        </sd-anchor>
        <sd-anchor>
          <fa-icon [icon]="icons.fasTable | async" [fixedWidth]=true></fa-icon>
        </sd-anchor>
        <sd-pagination [page]="1" [pageLength]="30"></sd-pagination>
      </sd-dock>

      <sd-pane>
        <table class="_sheet">
          <thead>
          <tr class="_header-group-row">
            <th class="_feature-cell">F</th>
            <th class="_fixed-cell" colspan="3">고정헤더</th>
            <th colspan="5">일반헤더</th>
          </tr>
          <tr class="_header-group-row">
            <th class="_feature-cell">F</th>
            <th class="_fixed-cell" colspan="2">고정헤더01~02</th>
            <th class="_fixed-cell">고정헤더03</th>
            <th colspan="2">일반헤더01~02</th>
            <th colspan="3">일반헤더03~05</th>
          </tr>
          <tr class="_header-row">
            <th class="_feature-cell">F</th>
            <th class="_fixed-cell">고정헤더01</th>
            <th class="_fixed-cell">고정헤더02</th>
            <th class="_fixed-cell">고정헤더03</th>
            <th>일반헤더01</th>
            <th>일반헤더02</th>
            <th>일반헤더03</th>
            <th>일반헤더04</th>
            <th>일반헤더05</th>
          </tr>
          </thead>
          <tbody>
          <tr class="_summary_row">
            <td class="_feature-cell">F</td>
            <td class="_fixed-cell">요약고정값01</td>
            <td class="_fixed-cell">요약고정값02</td>
            <td class="_fixed-cell">요약고정값03</td>
            <td>요약일반값01</td>
            <td>요약일반값02</td>
            <td>요약일반값03</td>
            <td>요약일반값04</td>
            <td>요약일반값05</td>
          </tr>
          <tr>
            <td class="_feature-cell">F</td>
            <td class="_fixed-cell">고정값01-1</td>
            <td class="_fixed-cell">고정값02-1</td>
            <td class="_fixed-cell">고정값03-1</td>
            <td>일반값01-1</td>
            <td>일반값02-1</td>
            <td>일반값03-1</td>
            <td>일반값04-1</td>
            <td>일반값05-1</td>
          </tr>
          <tr>
            <td class="_feature-cell">F</td>
            <td class="_fixed-cell">고정값01-2</td>
            <td class="_fixed-cell">고정값02-2</td>
            <td class="_fixed-cell">고정값03-2</td>
            <td>일반값01-2</td>
            <td>일반값02-2</td>
            <td>일반값03-2</td>
            <td>일반값04-2</td>
            <td>일반값05-2</td>
          </tr>
          </tbody>
        </table>
      </sd-pane>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ ``]
})
export class SdSheetAdvControl {
  public icons = {
    fasCog: import("@fortawesome/pro-solid-svg-icons/faCog").then(m => m.faCog),
    fasTable: import("@fortawesome/pro-solid-svg-icons/faTable").then(m => m.faTable),
  };
}
