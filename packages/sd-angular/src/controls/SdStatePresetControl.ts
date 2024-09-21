import { ChangeDetectionStrategy, Component, inject, input, model, ViewEncapsulation } from "@angular/core";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdSystemConfigProvider } from "../providers/SdSystemConfigProvider";
import { SdToastProvider } from "../providers/SdToastProvider";
import { SdGapControl } from "./SdGapControl";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $effect, $signal } from "../utils/$hooks";

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdGapControl, FaIconComponent],
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
      <fa-icon [icon]="icons.star" class="tx-theme-warning-default" [fixedWidth]="true" />
    </sd-anchor>
    <sd-gap width="sm"></sd-gap>
    @for (preset of presets(); track preset.name) {
      <div>
        <sd-anchor (click)="onItemClick(preset)" class="tx-trans-default">
          {{ preset.name }}
        </sd-anchor>
        <sd-anchor (click)="onSaveButtonClick(preset)">
          <fa-icon [icon]="icons.save" size="sm" />
        </sd-anchor>
        <sd-anchor (click)="onRemoveButtonClick(preset)">
          <fa-icon [icon]="icons.xmark" size="sm" />
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
  icons = inject(SdAngularConfigProvider).icons;

  #sdSystemConfig = inject(SdSystemConfigProvider);
  #sdToast = inject(SdToastProvider);

  state = model<any>();

  key = input.required<string>();
  size = input<"sm" | "lg">();

  presets = $signal<ISdStatePresetVM[]>([]);

  constructor() {
    $effect([this.key], async () => {
      this.presets.set((await this.#sdSystemConfig.getAsync(`sd-state-preset.${this.key()}`)) ?? []);
    });
  }

  async onAddButtonClick() {
    const newName = prompt("현재 상태를 저장합니다.");
    if (newName == null) return;

    this.presets.update((v) => [
      ...v,
      {
        name: newName,
        state: ObjectUtil.clone(this.state),
      },
    ]);
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());

    this.#sdToast.info(`현재 상태가 ${newName}에 저장되었습니다.`);
  }

  onItemClick(preset: ISdStatePresetVM) {
    if (!ObjectUtil.equal(this.state(), preset.state)) {
      this.state.set(ObjectUtil.clone(preset.state));
    }
  }

  async onRemoveButtonClick(preset: ISdStatePresetVM) {
    if (!confirm("저장된 '" + preset.name + "'상태가 삭제됩니다.")) return;

    this.presets.update((v) => v.filter((item) => item !== preset));
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());
  }

  async onSaveButtonClick(preset: ISdStatePresetVM) {
    preset.state = ObjectUtil.clone(this.state());
    await this.#sdSystemConfig.setAsync(`sd-state-preset.${this.key()}`, this.presets());

    this.#sdToast.info(`현재 상태가 ${preset.name}에 저장되었습니다.`);
  }
}

export interface ISdStatePresetVM {
  name: string;
  state: any;
}
