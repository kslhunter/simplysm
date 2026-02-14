import { createSignal, For, Show, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { IconDeviceFloppy, IconStar, IconX } from "@tabler/icons-solidjs";
import { objClone, objEqual } from "@simplysm/core-common";
import { useSyncConfig } from "../../../hooks/useSyncConfig";
import { useNotification } from "../../feedback/notification/NotificationContext";
import { Icon } from "../../display/Icon";
import { textPlaceholder } from "../../../styles/tokens.styles";
import type { ComponentSize } from "../../../styles/tokens.styles";

// ── Types ──

interface StatePresetItem<T> {
  name: string;
  state: T;
}

type StatePresetSize = ComponentSize;

export interface StatePresetProps<T> {
  presetKey: string;
  value: T;
  onValueChange: (value: T) => void;
  size?: StatePresetSize;
  class?: string;
  style?: JSX.CSSProperties;
}

// ── Style constants ──

const baseClass = clsx("inline-flex items-center gap-1.5", "flex-wrap");

const chipClass = clsx(
  "inline-flex items-center gap-1",
  "rounded-full",
  "bg-base-200 dark:bg-base-700",
  "text-base-800 dark:text-base-200",
  "cursor-default",
);

const chipDefaultClass = "px-3 py-1";

const chipSizeClasses: Record<StatePresetSize, string> = {
  sm: "px-2 py-0.5 text-sm",
  lg: "px-4 py-2",
  xl: "px-5 py-3 text-lg",
};

const chipNameBtnClass = clsx("cursor-pointer", "hover:underline", "focus:outline-none");

const iconBtnClass = clsx(
  "inline-flex items-center justify-center",
  "rounded-full",
  "cursor-pointer",
  "transition-colors",
  "focus:outline-none",
  "hover:bg-base-300 dark:hover:bg-base-600",
);

const iconBtnDefaultClass = "p-0.5";

const iconBtnSizeClasses: Record<StatePresetSize, string> = {
  sm: "p-px",
  lg: "p-1",
  xl: "p-1.5",
};

const starBtnClass = clsx(
  "inline-flex items-center justify-center",
  "rounded-full",
  "cursor-pointer",
  "transition-colors",
  "focus:outline-none",
  "text-warning-500",
  "hover:bg-warning-100 dark:hover:bg-warning-900/40",
);

const starBtnDefaultClass = "p-1";

const starBtnSizeClasses: Record<StatePresetSize, string> = {
  sm: "p-0.5",
  lg: "p-1.5",
  xl: "p-2",
};

const inputClass = clsx(
  "rounded-full",
  "bg-base-200 dark:bg-base-700",
  "text-base-800 dark:text-base-200",
  "border border-transparent",
  "focus:ring-1 focus:ring-primary-400",
  "focus:outline-none",
  textPlaceholder,
);

const inputDefaultClass = "px-3 py-1 w-24";

const inputSizeClasses: Record<StatePresetSize, string> = {
  sm: "px-2 py-0.5 w-20 text-sm",
  lg: "px-4 py-2 w-32",
  xl: "px-5 py-3 w-36 text-lg",
};

const iconSize = "0.85em";

// ── Component ──

function StatePresetInner<T>(props: StatePresetProps<T>): JSX.Element {
  const [local] = splitProps(props, ["presetKey", "value", "onValueChange", "size", "class", "style"]);

  const notification = useNotification();

  // presetKey는 마운트 시 한 번만 설정되는 식별자이므로 즉시 평가하여 캡처
  /* eslint-disable solid/reactivity */
  const [presets, setPresets] = useSyncConfig<StatePresetItem<T>[]>(`state-preset.${local.presetKey}`, []);
  /* eslint-enable solid/reactivity */
  const [adding, setAdding] = createSignal(false);
  const [inputValue, setInputValue] = createSignal("");

  // ── Handlers ──

  function handleStartAdd(): void {
    setAdding(true);
    setInputValue("");
  }

  function handleCancelAdd(): void {
    setAdding(false);
    setInputValue("");
  }

  function handleConfirmAdd(): void {
    const name = inputValue().trim();
    if (!name) {
      handleCancelAdd();
      return;
    }

    if (presets().some((p) => p.name === name)) {
      notification.warning("이름 중복", "같은 이름의 프리셋이 이미 존재합니다.");
      return;
    }

    const newPreset: StatePresetItem<T> = {
      name,
      state: objClone(local.value),
    };
    setPresets([...presets(), newPreset]);
    notification.info("프리셋 저장", `"${name}" 프리셋이 저장되었습니다.`);
    setAdding(false);
    setInputValue("");
  }

  function handleRestore(preset: StatePresetItem<T>): void {
    if (!objEqual(local.value, preset.state)) {
      local.onValueChange(objClone(preset.state));
    }
  }

  function handleOverwrite(index: number): void {
    const snapshot = [...presets()];
    const presetName = snapshot[index].name;

    const updated = snapshot.map((p, i) => (i === index ? { ...p, state: objClone(local.value) } : p));
    setPresets(updated);

    const notiId = notification.info("프리셋 덮어쓰기", `"${presetName}" 프리셋이 현재 상태로 업데이트되었습니다.`, {
      action: {
        label: "실행 취소",
        onClick: () => {
          setPresets(snapshot);
          notification.remove(notiId);
        },
      },
    });
  }

  function handleDelete(index: number): void {
    const snapshot = [...presets()];
    const presetName = snapshot[index].name;

    const updated = snapshot.filter((_, i) => i !== index);
    setPresets(updated);

    const notiId = notification.info("프리셋 삭제", `"${presetName}" 프리셋이 삭제되었습니다.`, {
      action: {
        label: "실행 취소",
        onClick: () => {
          setPresets(snapshot);
          notification.remove(notiId);
        },
      },
    });
  }

  function handleInputKeyDown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmAdd();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelAdd();
    }
  }

  // ── Render ──

  const containerClass = () => twMerge(baseClass, local.class);

  const resolvedChipClass = () => twMerge(chipClass, local.size ? chipSizeClasses[local.size] : chipDefaultClass);

  const resolvedIconBtnClass = () =>
    twMerge(iconBtnClass, local.size ? iconBtnSizeClasses[local.size] : iconBtnDefaultClass);

  const resolvedStarBtnClass = () =>
    twMerge(starBtnClass, local.size ? starBtnSizeClasses[local.size] : starBtnDefaultClass);

  const resolvedInputClass = () => twMerge(inputClass, local.size ? inputSizeClasses[local.size] : inputDefaultClass);

  return (
    <div class={containerClass()} style={local.style}>
      {/* Star button - add preset */}
      <button type="button" class={resolvedStarBtnClass()} onClick={handleStartAdd} title="프리셋 추가">
        <Icon icon={IconStar} size={iconSize} />
      </button>

      {/* Preset chips */}
      <For each={presets()}>
        {(preset, index) => (
          <span class={resolvedChipClass()}>
            <button
              type="button"
              class={chipNameBtnClass}
              onClick={() => handleRestore(preset)}
              title={`"${preset.name}" 프리셋 적용`}
            >
              {preset.name}
            </button>
            <button
              type="button"
              class={resolvedIconBtnClass()}
              onClick={() => handleOverwrite(index())}
              title="현재 상태로 덮어쓰기"
            >
              <Icon icon={IconDeviceFloppy} size={iconSize} />
            </button>
            <button
              type="button"
              class={resolvedIconBtnClass()}
              onClick={() => handleDelete(index())}
              title="프리셋 삭제"
            >
              <Icon icon={IconX} size={iconSize} />
            </button>
          </span>
        )}
      </For>

      {/* Inline input for naming a new preset */}
      <Show when={adding()}>
        <input
          ref={(el) => {
            // Autofocus when input appears
            requestAnimationFrame(() => el.focus());
          }}
          type="text"
          class={resolvedInputClass()}
          placeholder="이름..."
          value={inputValue()}
          onInput={(e) => setInputValue(e.currentTarget.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={() => (inputValue().trim() ? handleConfirmAdd() : handleCancelAdd())}
        />
      </Show>
    </div>
  );
}

export const StatePreset = StatePresetInner as <T>(props: StatePresetProps<T>) => JSX.Element;
