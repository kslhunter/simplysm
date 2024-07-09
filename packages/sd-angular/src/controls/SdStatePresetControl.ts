import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  EventEmitter,
  inject,
  Injector,
  Input,
  Output, ViewEncapsulation
} from "@angular/core";
import {ObjectUtil} from "@simplysm/sd-core-common";
import {SdSystemConfigProvider} from "../providers/SdSystemConfigProvider";
import {SdToastProvider} from "../providers/SdToastProvider";
import {SdGapControl} from "./SdGapControl";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdNgHelper} from "../utils/SdNgHelper";
import {SdIconControl} from "./SdIconControl";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdAnchorControl,
    SdGapControl,
    SdIconControl,
  ],
  template: `
    <sd-anchor (click)="onAddButtonClick()">
      <sd-icon [icon]="icons.star" class="tx-theme-warning-default" fixedWidth/>
    </sd-anchor>
    <sd-gap width="sm"></sd-gap>
    @for (preset of presets; track preset.name) {
      <div>
        <sd-anchor (click)="onItemClick(preset)"
                   class="tx-trans-default">
          {{ preset.name }}
        </sd-anchor>
        <sd-anchor (click)="onSaveButtonClick(preset)">
          <sd-icon [icon]="icons.save" size="sm"/>
        </sd-anchor>
        <sd-anchor (click)="onRemoveButtonClick(preset)">
          <sd-icon [icon]="icons.xmark" size="sm"/>
        </sd-anchor>
      </div>
      <sd-gap width="sm"></sd-gap>
    }
  `,
  styles: [/* language=SCSS */ `
    sd-state-preset {
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
  `],
  host: {
    "[attr.sd-size]": "size"
  }
})
export class SdStatePresetControl implements DoCheck {
  #sdSystemConfig = inject(SdSystemConfigProvider);
  #sdToast = inject(SdToastProvider);
  icons = inject(SdAngularOptionsProvider).icons;

  @Input() state?: any;
  @Output() stateChange = new EventEmitter<any>();

  @Input({required: true}) key!: string;
  @Input() size?: "sm" | "lg";

  presets: ISdStatePresetVM[] = [];

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
}

export interface ISdStatePresetVM {
  name: string;
  state: any;
}