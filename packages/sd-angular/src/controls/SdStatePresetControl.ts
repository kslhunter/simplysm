import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  EventEmitter,
  HostBinding,
  inject,
  Injector,
  Input,
  Output
} from "@angular/core";
import {ObjectUtil} from "@simplysm/sd-core-common";
import {SdSystemConfigProvider} from "../providers/SdSystemConfigProvider";
import {SdToastProvider} from "../providers/SdToastProvider";
import {CommonModule} from "@angular/common";
import {SdGapControl} from "./SdGapControl";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdNgHelper} from "../utils/SdNgHelper";
import {faSave, faStar} from "@fortawesome/pro-duotone-svg-icons";
import {faXmark} from "@fortawesome/pro-solid-svg-icons/faXmark";
import {SdIconControl} from "./SdIconControl";

export interface ISdStatePresetVM {
  name: string;
  state: any;
}

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, SdAnchorControl, SdGapControl, SdIconControl],
  template: `
    <sd-anchor (click)="onAddButtonClick()">
      <sd-icon [icon]="faStar" class="tx-theme-warning-default" fixedWidth/>
    </sd-anchor>
    <sd-gap width="sm"></sd-gap>
    <ng-container *ngFor="let preset of presets; trackBy: trackByFnForPreset">
      <div>
        <sd-anchor (click)="onItemClick(preset)"
                   class="tx-trans-default">
          {{ preset.name }}
        </sd-anchor>
        <sd-anchor (click)="onSaveButtonClick(preset)">
          <sd-icon [icon]="faSave" size="sm"/>
        </sd-anchor>
        <sd-anchor (click)="onRemoveButtonClick(preset)">
          <sd-icon [icon]="faXmark" size="sm"/>
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

        background: var(--theme-grey-lightest);
        border-radius: var(--border-radius-lg);

        &:hover {
          background: var(--theme-grey-lighter);
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
export class SdStatePresetControl implements DoCheck {
  @Input({required: true})
  key!: string;

  @Input()
  state?: any;

  @Output()
  stateChange = new EventEmitter<any>();

  @Input()
  @HostBinding("attr.sd-size")
  size?: "sm" | "lg";

  presets: ISdStatePresetVM[] = [];

  trackByFnForPreset = (i: number, item: ISdStatePresetVM): string => item.name;

  #sdSystemConfig = inject(SdSystemConfigProvider);
  #sdToast = inject(SdToastProvider);

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck(): void {
    this.#sdNgHelper.doCheck(async run => {
      await run({
        key: [this.key]
      }, async () => {
        this.presets = (await this.#sdSystemConfig.getAsync(`sd-state-preset.${this.key}`)) ?? [];
      });
    });
  }

  async onAddButtonClick() {
    const newName = prompt("현재 상태를 저장합니다.");
    if (newName == null) return;

    this.presets.push({
      name: newName,
      state: ObjectUtil.clone(this.state)
    });
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key}`, this.presets);

    this.#sdToast.info(`현재 상태가 ${newName}에 저장되었습니다.`);
  }

  onItemClick(preset: ISdStatePresetVM) {
    if (!ObjectUtil.equal(this.state, preset.state)) {
      if (this.stateChange.observed) {
        this.stateChange.emit(ObjectUtil.clone(preset.state));
      }
      else {
        this.state = preset.state;
      }
    }
  }

  async onRemoveButtonClick(preset: ISdStatePresetVM) {
    if (!confirm("저장된 '" + preset.name + "'상태가 삭제됩니다.")) return;

    this.presets.remove(preset);
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key}`, this.presets);
  }

  async onSaveButtonClick(preset: ISdStatePresetVM) {
    preset.state = ObjectUtil.clone(this.state);
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key}`, this.presets);

    this.#sdToast.info(`현재 상태가 ${preset.name}에 저장되었습니다.`);
  }

  protected readonly faStar = faStar;
  protected readonly faSave = faSave;
  protected readonly faXmark = faXmark;
}
