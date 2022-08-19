import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ObjectUtil, TFlatType } from "@simplysm/sd-core-common";
import { SdIconsRootProvider } from "../root-providers/SdIconsRootProvider";
import { SdModalBase } from "../root-providers/SdModalRootProvider";

@Component({
  selector: "sd-object-merge3-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container *ngIf="data && keys">
      <sd-pane class="sd-padding-sm-default">
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
              [class.sd-background-color-danger-lightest]="getIsAllNotEqual(key)">
            <th style="text-align: right">
              {{ this.getDisplayTitle(key) }}
            </th>
            <td style="text-align: right"
                [class.sd-background-color-success-lightest]="getIsOrgAllNotEqual(key) && !getIsNotEqual(data.theirs[key], data.origin[key])">
              >
              {{ getDisplayName(key, data.theirs[key], data.theirs) }}
            </td>
            <td
              [class.sd-background-color-success-lightest]="getIsOrgAllNotEqual(key) && !getIsNotEqual(data.theirs[key], data.origin[key])">
              <sd-anchor [disabled]="!getIsNotEqual(data.theirs[key], data.origin[key])">
                <fa-icon [fixedWidth]="true" [icon]="icons.get('arrowRight')"
                         (click)="$any(data.origin)[key] = $any(data.theirs)[key]"
                         style="pointer-events: auto"></fa-icon>
              </sd-anchor>
            </td>
            <td style="text-align: center"
                [class.sd-background-color-success-lightest]="getIsOrgAllNotEqual(key) && !getIsAllNotEqual(key)">
              {{ getDisplayName(key, data.origin[key], data.origin) }}
            </td>
            <td
              [class.sd-background-color-success-lightest]="getIsOrgAllNotEqual(key) && !getIsNotEqual(data.yours[key], data.origin[key])">
              <sd-anchor [disabled]="!getIsNotEqual(data.yours[key], data.origin[key])">
                <fa-icon [fixedWidth]="true" [icon]="icons.get('arrowLeft')"
                         (click)="$any(data.origin)[key] = $any(data.yours)[key]"
                         style="pointer-events: auto"></fa-icon>
              </sd-anchor>
            </td>
            <td style="text-align: left"
                [class.sd-background-color-success-lightest]="getIsOrgAllNotEqual(key) && !getIsNotEqual(data.yours[key], data.origin[key])">
              {{ getDisplayName(key, data.yours[key], data.yours) }}
            </td>
          </tr>
          </tbody>
        </sd-table>
      </sd-pane>

      <sd-dock position="bottom" class="sd-padding-sm-default sd-padding-top-0">
        <sd-button theme="primary" (click)="onConfirmButtonClick()">
          결과 확정
        </sd-button>
      </sd-dock>
    </sd-dock-container>`
})
export class SdObjectMerge3Modal<T extends Record<string, TFlatType>> extends SdModalBase<ISdObjectMerge3ModalInput<T>, T> {
  public data!: Omit<ISdObjectMerge3ModalInput<T>, "displayNameRecord">;
  public orgData!: Omit<ISdObjectMerge3ModalInput<T>, "displayNameRecord">;
  public keys!: string[];
  public displayNameRecord?: Partial<Record<keyof T, string>>;
  public valueTextConverter?: <K extends keyof T>(key: K, value: T[K], item: T) => string | undefined;

  public trackByMeFn = (index: number, item: any): any => item;

  public constructor(public readonly icons: SdIconsRootProvider) {
    super();
  }

  public sdOnOpen(param: ISdObjectMerge3ModalInput<T>): void {
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

  public getDisplayTitle(key: string): string {
    if (!this.displayNameRecord) return key;
    return this.displayNameRecord[key] ?? key;
  }

  public getDisplayName(key: string, val: any, item: any): TFlatType {
    if (!this.valueTextConverter) return val;
    return this.valueTextConverter(key, val, item);
  }

  public getIsOrgAllNotEqual(key: string): boolean {
    return !ObjectUtil.equal(this.orgData.theirs[key], this.orgData.origin[key])
      && !ObjectUtil.equal(this.orgData.theirs[key], this.orgData.yours[key])
      && !ObjectUtil.equal(this.orgData.origin[key], this.orgData.yours[key]);
  }

  public getIsAllNotEqual(key: string): boolean {
    return !ObjectUtil.equal(this.data.theirs[key], this.data.origin[key])
      && !ObjectUtil.equal(this.data.theirs[key], this.data.yours[key])
      && !ObjectUtil.equal(this.data.origin[key], this.data.yours[key]);
  }

  public getIsNotEqual(item1: TFlatType, item2: TFlatType): boolean {
    return !ObjectUtil.equal(item1, item2);
  }

  public onConfirmButtonClick(): void {
    this.close(this.data.origin);
  }
}

export interface ISdObjectMerge3ModalInput<T extends Record<string, TFlatType>> {
  theirs: T;
  origin: T;
  yours: T;
  displayNameRecord?: Partial<Record<keyof T, string>>;
  valueTextConverter?: <K extends keyof T>(key: K, value: T[K], item: T) => string | undefined;
}
