import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdModalProvider } from "../../core/modal/sd-modal.provider";
import { SdToastProvider } from "../../core/toast/sd-toast.provider";
import { SdPromptModal } from "../../core/modal/sd-prompt-modal";
import { SdConfirmModal } from "../../core/modal/sd-confirm-modal";
import { injectSdSystemConfigResource } from "../../core/config/injectSdSystemConfigResource";
import { SdAnchor } from "../../controls/button/sd-anchor";
import { NgIcon } from "@ng-icons/core";
import { tablerStar, tablerDeviceFloppy, tablerX } from "@ng-icons/tabler-icons";
import { obj } from "@simplysm/core-common";

export interface SdStatePresetDef<TState> {
  name: string;
  state: TState;
}

@Component({
  selector: "sd-state-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchor, NgIcon],
  template: `
    <div class="_sd-state-preset">
      <sd-anchor (click)="onAddClick()" class="_add-btn">
        <ng-icon [svg]="tablerStar" class="tx-warning" />
      </sd-anchor>
      @for (preset of _presets(); track preset.name) {
        <div class="_preset-item">
          <sd-anchor class="_preset-name tx-default" (click)="onPresetClick(preset)">
            {{ preset.name }}
          </sd-anchor>
          <sd-anchor class="_preset-save" (click)="onSaveClick(preset)">
            <ng-icon [svg]="tablerDeviceFloppy" [size]="'1em'" />
          </sd-anchor>
          <sd-anchor class="_preset-delete" [theme]="'danger'" (click)="onDeleteClick(preset)">
            <ng-icon [svg]="tablerX" [size]="'1em'" />
          </sd-anchor>
        </div>
      }
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-state-preset {
        display: inline-block;
        vertical-align: top;

        > ._sd-state-preset {
          display: flex;
          align-items: center;
          gap: var(--sd-gap-sm);
          flex-wrap: wrap;

          > ._add-btn {
            line-height: var(--sd-line-height);
            border: 1px solid transparent;
            padding: var(--sd-gap-sm) var(--sd-gap-default);
          }

          > ._preset-item {
            display: inline-flex;
            align-items: center;
            gap: var(--sd-gap-xs);
            line-height: var(--sd-line-height);
            border: 1px solid transparent;
            border-radius: var(--sd-radius-lg);
            padding: var(--sd-gap-sm) var(--sd-gap-default);
            background-color: var(--sd-bg-gray-subtle);

            &:hover {
              background-color: var(--sd-bg-gray-subtle-hover);
            }

            > sd-anchor {
              padding: 0 var(--sd-gap-sm);
            }
          }
        }

        &[data-sd-size="sm"] > ._sd-state-preset {
          > ._add-btn {
            padding: var(--sd-gap-xs) var(--sd-gap-default);
          }

          > ._preset-item {
            padding: var(--sd-gap-xs) var(--sd-gap-default);
          }
        }

        &[data-sd-size="lg"] > ._sd-state-preset {
          > ._add-btn {
            padding: var(--sd-gap-default) var(--sd-gap-lg);
          }

          > ._preset-item {
            padding: var(--sd-gap-default) var(--sd-gap-lg);
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-size]": "size()",
  },
})
export class SdStatePreset<TState> {
  private readonly _sdModal = inject(SdModalProvider);
  private readonly _sdToast = inject(SdToastProvider);

  key = input.required<string>();
  state = model.required<TState>();
  size = input<"sm" | "lg">();

  protected readonly tablerStar = tablerStar;
  protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
  protected readonly tablerX = tablerX;

  private readonly _configResource = injectSdSystemConfigResource<SdStatePresetDef<TState>[]>({
    key: this.key,
  });

  _presets = computed(() => this._configResource.value() ?? []);

  async onAddClick(): Promise<void> {
    const name = await this._sdModal.showAsync(
      {
        title: "프리셋 추가",
        type: SdPromptModal,
        inputs: { message: "프리셋 이름을 입력하세요." },
      },
      { useCloseByBackdrop: false },
    );

    if (name == null) return;

    const currentPresets = this._presets();

    if (currentPresets.some((p) => p.name === name)) {
      this._sdToast.warning("이미 존재하는 프리셋 이름입니다.");
      return;
    }

    const newPreset: SdStatePresetDef<TState> = {
      name,
      state: obj.clone(this.state()),
    };

    this._configResource.set([...currentPresets, newPreset]);
    this._sdToast.success(`현재 상태가 '${name}'에 저장되었습니다.`);
  }

  onPresetClick(preset: SdStatePresetDef<TState>): void {
    const currentState = this.state();
    if (obj.equal(currentState, preset.state)) return;
    this.state.set(obj.clone(preset.state));
  }

  onSaveClick(preset: SdStatePresetDef<TState>): void {
    const currentPresets = this._presets();
    const updated = currentPresets.map((p) =>
      p.name === preset.name ? { ...p, state: obj.clone(this.state()) } : p,
    );
    this._configResource.set(updated);
    this._sdToast.success(`현재 상태가 ${preset.name}에 저장되었습니다.`);
  }

  async onDeleteClick(preset: SdStatePresetDef<TState>): Promise<void> {
    const confirmed = await this._sdModal.showAsync(
      {
        title: "프리셋 삭제",
        type: SdConfirmModal,
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
