import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from "@angular/core";
import { SdSystemConfigRootProvider } from "../root-providers/SdSystemConfigRootProvider";
import { SdInputValidate } from "../commons/SdInputValidate";
import { ObjectUtils } from "@simplysm/sd-core-common";

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-anchor (click)="onAddButtonClick()">
      <sd-icon icon="arrow-right" fixedWidth></sd-icon>
    </sd-anchor>
    <sd-gap width="sm"></sd-gap>
    <ng-container *ngFor="let preset of presets; trackBy: trackByNameFn">
      <sd-label theme="info">
        <sd-anchor (click)="onItemClick(preset)" class="sd-text-brightness-rev-default">
          {{ preset.name }}
        </sd-anchor>
        <sd-anchor (click)="onRemoveButtonClick(preset)"
                   class="sd-text-brightness-rev-default">
          <sd-icon icon="times"></sd-icon>
        </sd-anchor>
      </sd-label>
      <sd-gap width="sm"></sd-gap>
    </ng-container>
  `,
  styles: [/* language=SCSS */ `
    :host {
      /deep/ sd-anchor {
        padding: var(--gap-sm) var(--gap-default);
      }
    }
  `]
})
export class SdStatePresetControl implements OnInit {
  @Input()
  @SdInputValidate(String)
  public key?: string;

  @Input()
  public state?: any;

  @Output()
  public readonly stateChange = new EventEmitter<any>();

  public presets: ISdStatePresetVM[] = [];

  public trackByNameFn = (i: number, item: ISdStatePresetVM): string => item.name;

  public constructor(private readonly _systemConfig: SdSystemConfigRootProvider,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  public async ngOnInit(): Promise<void> {
    if (Boolean(this.key)) {
      this.presets = (await this._systemConfig.getAsync(`sd-state-preset.${this.key}`)) ?? [];
      this._cdr.markForCheck();
    }
  }

  public async onAddButtonClick(): Promise<void> {
    const newName = prompt("명칭을 입력하세요.");
    if (newName == null) return;

    this.presets.push({
      name: newName,
      state: ObjectUtils.clone(this.state)
    });
    await this._systemConfig.setAsync(`sd-state-preset.${this.key}`, this.presets);
  }

  public onItemClick(preset: ISdStatePresetVM): void {
    if (this.state !== preset.state) {
      // this.state = preset.state;
      this.stateChange.emit(preset.state);
    }
  }

  public async onRemoveButtonClick(preset: ISdStatePresetVM): Promise<void> {
    this.presets.remove(preset);
    await this._systemConfig.setAsync(`sd-state-preset.${this.key}`, this.presets);
  }
}

export interface ISdStatePresetVM {
  name: string;
  state: any;
}