import {ChangeDetectionStrategy, Component} from "@angular/core";
import {ObjectUtil, TFlatType} from "@simplysm/sd-core-common";
import {SdModalBase} from "../providers/SdModalProvider";
import {SdPaneControl} from "../controls/SdPaneControl";
import {SdTableControl} from "../controls/SdTableControl";
import {SdAnchorControl} from "../controls/SdAnchorControl";
import {SdButtonControl} from "../controls/SdButtonControl";
import {CommonModule} from "@angular/common";
import {SdIconControl} from "../controls/SdIconControl";
import {faArrowLeft, faArrowRight} from "@fortawesome/pro-duotone-svg-icons";
import {SdDockContainerControl} from "../controls/SdDockContainerControl";
import {SdDockControl} from "../controls/SdDockControl";

@Component({
  selector: "sd-object-merge3-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    SdPaneControl,
    SdTableControl,
    SdAnchorControl,
    SdButtonControl,
    SdIconControl,
    SdDockContainerControl,
    SdDockControl
  ],
  template: `
    <sd-dock-container *ngIf="data && keys">
      <sd-pane class="p-sm-default">
        <sd-table>
          <thead>
          <tr>
            <th>구분</th>
            <th>기존</th>
            <th></th>
            <th>결과</th>
            <th></th>
            <th>신규</th>
          </tr>
          </thead>
          <tbody>
          <tr *ngFor="let key of keys; trackBy: trackByMeFn"
              [class.bg-theme-danger-lightest]="getIsAllNotEqual(key)">
            <th style="text-align: right">
              {{ this.getDisplayTitle(key) }}
            </th>
            <td style="text-align: right"
                [class.bg-theme-success-lightest]="getIsOrgAllNotEqual(key) && !getIsNotEqual(data.theirs[key], data.origin[key])">
              >
              {{ getDisplayName(key, data.theirs[key], data.theirs) }}
            </td>
            <td
              [class.bg-theme-success-lightest]="getIsOrgAllNotEqual(key) && !getIsNotEqual(data.theirs[key], data.origin[key])">
              <sd-anchor [disabled]="!getIsNotEqual(data.theirs[key], data.origin[key])">
                <sd-icon fixedWidth [icon]="faArrowRight"
                         (click)="$any(data.origin)[key] = $any(data.theirs)[key]"
                         style="pointer-events: auto"/>
              </sd-anchor>
            </td>
            <td style="text-align: center"
                [class.bg-theme-success-lightest]="getIsOrgAllNotEqual(key) && !getIsAllNotEqual(key)">
              {{ getDisplayName(key, data.origin[key], data.origin) }}
            </td>
            <td
              [class.bg-theme-success-lightest]="getIsOrgAllNotEqual(key) && !getIsNotEqual(data.yours[key], data.origin[key])">
              <sd-anchor [disabled]="!getIsNotEqual(data.yours[key], data.origin[key])">
                <sd-icon fixedWidth [icon]="faArrowLeft"
                         (click)="$any(data.origin)[key] = $any(data.yours)[key]"
                         style="pointer-events: auto"/>
              </sd-anchor>
            </td>
            <td style="text-align: left"
                [class.bg-theme-success-lightest]="getIsOrgAllNotEqual(key) && !getIsNotEqual(data.yours[key], data.origin[key])">
              {{ getDisplayName(key, data.yours[key], data.yours) }}
            </td>
          </tr>
          </tbody>
        </sd-table>
      </sd-pane>

      <sd-dock position="bottom" class="p-sm-default pt-0">
        <sd-button theme="primary" (click)="onConfirmButtonClick()">
          결과 확정
        </sd-button>
      </sd-dock>
    </sd-dock-container>`
})
export class SdObjectMerge3Modal<T extends Record<string, TFlatType>> extends SdModalBase<ISdObjectMerge3ModalInput<T>, T> {
  data!: Omit<ISdObjectMerge3ModalInput<T>, "displayNameRecord">;
  orgData!: Omit<ISdObjectMerge3ModalInput<T>, "displayNameRecord">;
  keys!: string[];
  displayNameRecord?: Partial<Record<keyof T, string>>;
  valueTextConverter?: <K extends keyof T>(key: K, value: T[K], item: T) => string | undefined;

  trackByMeFn = <TT>(index: number, item: TT) => item;

  sdOnOpen(param: ISdObjectMerge3ModalInput<T>) {
    this.data = {
      theirs: param.theirs,
      origin: ObjectUtil.clone(param.origin),
      yours: param.yours
    };
    this.orgData = ObjectUtil.clone(this.data);

    this.keys = (
      param.displayNameRecord
        ? Object.keys(param.displayNameRecord)
        : Object.keys(param.theirs).concat(Object.keys(param.origin)).concat(Object.keys(param.yours))
    )
      .distinct()
      .filter((key) => !(param.origin[key] === undefined && param.theirs[key] === undefined && param.yours[key] === undefined));
    this.displayNameRecord = param.displayNameRecord;
    this.valueTextConverter = param.valueTextConverter;
  }

  getDisplayTitle(key: string): string {
    if (!this.displayNameRecord) return key;
    return this.displayNameRecord[key] ?? key;
  }

  getDisplayName(key: string, val: any, item: any): TFlatType {
    if (!this.valueTextConverter) return val;
    return this.valueTextConverter(key, val, item);
  }

  getIsOrgAllNotEqual(key: string): boolean {
    return !ObjectUtil.equal(this.orgData.theirs[key], this.orgData.origin[key])
      && !ObjectUtil.equal(this.orgData.theirs[key], this.orgData.yours[key])
      && !ObjectUtil.equal(this.orgData.origin[key], this.orgData.yours[key]);
  }

  getIsAllNotEqual(key: string): boolean {
    return !ObjectUtil.equal(this.data.theirs[key], this.data.origin[key])
      && !ObjectUtil.equal(this.data.theirs[key], this.data.yours[key])
      && !ObjectUtil.equal(this.data.origin[key], this.data.yours[key]);
  }

  getIsNotEqual(item1: TFlatType, item2: TFlatType): boolean {
    return !ObjectUtil.equal(item1, item2);
  }

  onConfirmButtonClick() {
    this.close(this.data.origin);
  }

  protected readonly faArrowRight = faArrowRight;
  protected readonly faArrowLeft = faArrowLeft;
}

export interface ISdObjectMerge3ModalInput<T extends Record<string, TFlatType>> {
  theirs: T;
  origin: T;
  yours: T;
  displayNameRecord?: Partial<Record<keyof T, string>>;
  valueTextConverter?: <K extends keyof T>(key: K, value: T[K], item: T) => string | undefined;
}
