import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from "@angular/core";
import { SdInputValidate } from "../../decorators/SdInputValidate";
import { ObjectUtil } from "@simplysm/sd-core/common";
import { SdSystemConfigRootProvider } from "../../root-providers/system-config";
import { SdToastProvider } from "../toast";
import fasStar from "@fortawesome/pro-solid-svg-icons/faStar";
import fasSave from "@fortawesome/pro-solid-svg-icons/faSave";
import fasTimes from "@fortawesome/pro-solid-svg-icons/faTimes";

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-anchor (click)="onAddButtonClick()">
      <fa-icon [icon]="icons.fasStar" class="sd-text-color-warning-default" [fixedWidth]="true"></fa-icon>
    </sd-anchor>
    <sd-gap width="sm"></sd-gap>
    <ng-container *ngFor="let preset of presets; trackBy: trackByNameFn">
      <div>
        <sd-anchor (click)="onItemClick(preset)"
                   class="sd-text-brightness-default">
          {{ preset.name }}
        </sd-anchor>
        <sd-anchor (click)="onSaveButtonClick(preset)">
          <fa-icon [icon]="icons.fasSave" size="sm"></fa-icon>
        </sd-anchor>
        <sd-anchor (click)="onRemoveButtonClick(preset)">
          <fa-icon [icon]="icons.fasTimes" size="sm"></fa-icon>
        </sd-anchor>
      </div>
      <sd-gap width="sm"></sd-gap>
    </ng-container>
  `,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      vertical-align: top;

      > sd-anchor {
        display: inline-block;
        vertical-align: top;
        line-height: var(--line-height);
        border: 1px solid transparent;
        padding: var(--gap-sm) var(--gap-default);
      }

      > div {
        display: inline-block;
        vertical-align: top;
        line-height: var(--line-height);
        border: 1px solid transparent;
        padding: var(--gap-sm) var(--gap-default);

        background: var(--theme-color-grey-lightest);
        border-radius: 4px;

        &:hover {
          background: var(--theme-color-grey-lighter);
        }

        > sd-anchor {
          padding: 0 var(--gap-sm);
        }
      }

      &[sd-size=sm] {
        > sd-anchor,
        > div {
          padding: var(--gap-xs) var(--gap-default);
        }
      }

      &[sd-size=lg] {
        > sd-anchor,
        > div {
          padding: var(--gap-default) var(--gap-lg);
        }
      }
    }
  `]
})
export class SdStatePresetControl implements OnInit, OnChanges {
  public icons = {
    fasStar,
    fasSave,
    fasTimes
  };

  @Input()
  @SdInputValidate(String)
  public key?: string;

  @Input()
  public state?: any;

  @Output()
  public readonly stateChange = new EventEmitter<any>();

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";


  public presets: ISdStatePresetVM[] = [];

  public trackByNameFn = (i: number, item: ISdStatePresetVM): string => item.name;

  public constructor(private readonly _systemConfig: SdSystemConfigRootProvider,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _toast: SdToastProvider) {
  }

  public async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if ("key" in changes && this.key !== undefined) {
      this.presets = (await this._systemConfig.getAsync(`sd-state-preset.${this.key}`)) ?? [];
      this._cdr.markForCheck();
    }
  }

  public async ngOnInit(): Promise<void> {
    if (this.key !== undefined) {
      this.presets = (await this._systemConfig.getAsync(`sd-state-preset.${this.key}`)) ?? [];
      this._cdr.markForCheck();
    }
  }

  public async onAddButtonClick(): Promise<void> {
    const newName = prompt("현재 상태를 저장합니다.");
    if (newName == null) return;

    this.presets.push({
      name: newName,
      state: ObjectUtil.clone(this.state)
    });
    if (this.key !== undefined) {
      await this._systemConfig.setAsync(`sd-state-preset.${this.key}`, this.presets);
    }

    this._toast.info(`현재 상태가 ${newName}에 저장되었습니다.`);
  }

  public onItemClick(preset: ISdStatePresetVM): void {
    if (!ObjectUtil.equal(this.state, preset.state)) {
      if (this.stateChange.observers.length > 0) {
        this.stateChange.emit(ObjectUtil.clone(preset.state));
      }
      else {
        this.state = preset.state;
      }
    }
  }

  public async onRemoveButtonClick(preset: ISdStatePresetVM): Promise<void> {
    if (!confirm("저장된 '" + preset.name + "'상태가 삭제됩니다.")) return;

    this.presets.remove(preset);
    if (this.key !== undefined) {
      await this._systemConfig.setAsync(`sd-state-preset.${this.key}`, this.presets);
    }
  }

  public async onSaveButtonClick(preset: ISdStatePresetVM): Promise<void> {
    preset.state = ObjectUtil.clone(this.state);
    if (this.key !== undefined) {
      await this._systemConfig.setAsync(`sd-state-preset.${this.key}`, this.presets);
    }

    this._toast.info(`현재 상태가 ${preset.name}에 저장되었습니다.`);
  }
}

export interface ISdStatePresetVM {
  name: string;
  state: any;
}
