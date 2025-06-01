import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { SdSystemConfigProvider } from "../providers/sd-system-config.provider";
import { SdToastProvider } from "../providers/sd-toast.provider";
import { $effect } from "../utils/bindings/$effect";
import { $signal } from "../utils/bindings/$signal";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdGapControl } from "./sd-gap.control";
import { SdIconControl } from "./sd-icon.control";

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdGapControl, SdIconControl],
  styles: [
    /* language=SCSS */ `
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

        &[sd-size="sm"] {
          > sd-anchor,
          > div {
            padding: var(--gap-xs) var(--gap-default);
          }
        }

        &[sd-size="lg"] {
          > sd-anchor,
          > div {
            padding: var(--gap-default) var(--gap-lg);
          }
        }
      }
    `,
  ],
  template: `
    <sd-anchor (click)="onAddButtonClick()">
      <sd-icon [icon]="icons.star" class="tx-theme-warning-default" fixedWidth />
    </sd-anchor>
    <sd-gap width="sm"></sd-gap>
    @for (preset of presets(); track preset.name) {
      <div>
        <sd-anchor (click)="onItemClick(preset)" class="tx-trans-default">
          {{ preset.name }}
        </sd-anchor>
        <sd-anchor (click)="onSaveButtonClick(preset)">
          <sd-icon [icon]="icons.save" size="sm" />
        </sd-anchor>
        <sd-anchor (click)="onRemoveButtonClick(preset)">
          <sd-icon [icon]="icons.xmark" size="sm" />
        </sd-anchor>
      </div>
      <sd-gap width="sm"></sd-gap>
    }
  `,
  host: {
    "[attr.sd-size]": "size()",
  },
})
export class SdStatePresetControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdSystemConfig = inject(SdSystemConfigProvider);
  #sdToast = inject(SdToastProvider);

  state = model<any>();

  key = input.required<string>();
  size = input<"sm" | "lg">();

  presets = $signal<ISdStatePreset[]>([]);

  constructor() {
    $effect([this.key], async () => {
      this.presets.set(
        (await this.#sdSystemConfig.getAsync(`sd-state-preset.${this.key()}`)) ?? [],
      );
    });
  }

  async onAddButtonClick() {
    const newName = prompt("현재 상태를 저장합니다.");
    if (newName == null) return;

    this.presets.update((v) => [
      ...v,
      {
        name: newName,
        state: ObjectUtils.clone(this.state),
      },
    ]);
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());

    this.#sdToast.info(`현재 상태가 ${newName}에 저장되었습니다.`);
  }

  onItemClick(preset: ISdStatePreset) {
    if (!ObjectUtils.equal(this.state(), preset.state)) {
      this.state.set(ObjectUtils.clone(preset.state));
    }
  }

  async onRemoveButtonClick(preset: ISdStatePreset) {
    if (!confirm("저장된 '" + preset.name + "'상태가 삭제됩니다.")) return;

    this.presets.update((v) => v.filter((item) => item !== preset));
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());
  }

  async onSaveButtonClick(preset: ISdStatePreset) {
    preset.state = ObjectUtils.clone(this.state());
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());

    this.#sdToast.info(`현재 상태가 ${preset.name}에 저장되었습니다.`);
  }
}

export interface ISdStatePreset {
  name: string;
  state: any;
}
