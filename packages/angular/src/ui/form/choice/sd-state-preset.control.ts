import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdModalProvider } from "../../overlay/modal/sd-modal.provider";
import { SdToastProvider } from "../../../core/providers/sd-toast.provider";
import { SdPromptModalControl } from "../../overlay/modal/sd-prompt-modal.control";
import { SdConfirmModalControl } from "../../overlay/modal/sd-confirm-modal.control";
import { useSdSystemConfigResource } from "../../../core/utils/useSdSystemConfigResource";
import { SdAnchorControl } from "../button/sd-anchor.control";
import { NgIcon } from "@ng-icons/core";
import { tablerStar, tablerDeviceFloppy, tablerX } from "@ng-icons/tabler-icons";
import { obj } from "@simplysm/core-common";

export interface ISdStatePreset {
  name: string;
  state: any;
}

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, NgIcon],
  template: `
    <div class="_sd-state-preset">
      <sd-anchor (click)="onAddClick()" class="_add-btn">
        <ng-icon [svg]="tablerStar" />
      </sd-anchor>
      @for (preset of _presets(); track preset.name) {
        <div class="_preset-item">
          <sd-anchor class="_preset-name" (click)="onPresetClick(preset)">
            {{ preset.name }}
          </sd-anchor>
          <sd-anchor class="_preset-save" (click)="onSaveClick(preset)">
            <ng-icon [svg]="tablerDeviceFloppy" />
          </sd-anchor>
          <sd-anchor class="_preset-delete" [theme]="'danger'" (click)="onDeleteClick(preset)">
            <ng-icon [svg]="tablerX" />
          </sd-anchor>
        </div>
      }
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-state-preset {
        display: block;

        > ._sd-state-preset {
          display: flex;
          align-items: center;
          gap: var(--gap-sm);
          flex-wrap: wrap;

          > ._add-btn {
            padding: var(--gap-xs);
          }

          > ._preset-item {
            display: inline-flex;
            align-items: center;
            gap: var(--gap-xs);
            border: 1px solid var(--trans-lighter);
            border-radius: var(--border-radius-default);
            padding: var(--gap-xs) var(--gap-sm);
          }
        }

        &[data-sd-size="sm"] > ._sd-state-preset {
          > ._add-btn {
            padding: var(--gap-xxs);
          }

          > ._preset-item {
            padding: var(--gap-xxs) var(--gap-xs);
          }
        }

        &[data-sd-size="lg"] > ._sd-state-preset {
          > ._add-btn {
            padding: var(--gap-sm);
          }

          > ._preset-item {
            padding: var(--gap-sm) var(--gap-default);
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-size]": "size()",
  },
})
export class SdStatePresetControl {
  private readonly _sdModal = inject(SdModalProvider);
  private readonly _sdToast = inject(SdToastProvider);

  key = input.required<string>();
  state = model<any>();
  size = input<"sm" | "lg">();

  protected readonly tablerStar = tablerStar;
  protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
  protected readonly tablerX = tablerX;

  private readonly _configResource = useSdSystemConfigResource<ISdStatePreset[]>({
    key: this.key,
  });

  _presets = computed(() => this._configResource.value() ?? []);

  async onAddClick(): Promise<void> {
    const name = await this._sdModal.showAsync(
      {
        title: "프리셋 추가",
        type: SdPromptModalControl,
        inputs: { message: "프리셋 이름을 입력하세요." },
      },
      { useCloseByBackdrop: false },
    );

    if (name == null) return;

    const currentPresets = this._presets();
    const newPreset: ISdStatePreset = {
      name,
      state: obj.clone(this.state()),
    };

    this._configResource.set([...currentPresets, newPreset]);
    this._sdToast.info(`현재 상태가 '${name}'에 저장되었습니다.`);
  }

  onPresetClick(preset: ISdStatePreset): void {
    const currentState = this.state();
    if (obj.equal(currentState, preset.state)) return;
    this.state.set(obj.clone(preset.state));
  }

  onSaveClick(preset: ISdStatePreset): void {
    const currentPresets = this._presets();
    const updated = currentPresets.map((p) =>
      p.name === preset.name ? { ...p, state: obj.clone(this.state()) } : p,
    );
    this._configResource.set(updated);
    this._sdToast.info(`현재 상태가 ${preset.name}에 저장되었습니다.`);
  }

  async onDeleteClick(preset: ISdStatePreset): Promise<void> {
    const confirmed = await this._sdModal.showAsync(
      {
        title: "프리셋 삭제",
        type: SdConfirmModalControl,
        inputs: { message: `저장된 '${preset.name}' 상태가 삭제됩니다.` },
      },
      { useCloseByBackdrop: false },
    );

    if (confirmed !== true) return;

    const currentPresets = this._presets();
    const filtered = currentPresets.filter((p) => p.name !== preset.name);
    this._configResource.set(filtered);
  }
}
