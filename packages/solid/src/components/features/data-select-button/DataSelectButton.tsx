import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  type JSX,
  on,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconSearch, IconX } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { Invalid } from "../../form-control/Invalid";
import { useDialog, type DialogShowOptions } from "../../disclosure/DialogContext";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { type ComponentSize, textMuted } from "../../../styles/tokens.styles";
import {
  triggerBaseClass,
  triggerDisabledClass,
  triggerInsetClass,
  triggerSizeClasses,
} from "../../form-control/DropdownTrigger.styles";

/** 모달에서 반환하는 결과 인터페이스 */
export interface DataSelectModalResult<TKey> {
  selectedKeys: TKey[];
}

/** DataSelectButton Props */
export interface DataSelectButtonProps<TItem, TKey = string | number> {
  /** 현재 선택된 키 (단일 또는 다중) */
  value?: TKey | TKey[];
  /** 값 변경 콜백 */
  onValueChange?: (value: TKey | TKey[] | undefined) => void;

  /** 키로 아이템을 로드하는 함수 */
  load: (keys: TKey[]) => TItem[] | Promise<TItem[]>;
  /** 선택 모달 컴포넌트 팩토리 */
  modal: () => JSX.Element;
  /** 아이템 렌더링 함수 */
  renderItem: (item: TItem) => JSX.Element;

  /** 다중 선택 모드 */
  multiple?: boolean;
  /** 필수 입력 */
  required?: boolean;
  /** 비활성화 */
  disabled?: boolean;
  /** 트리거 크기 */
  size?: ComponentSize;
  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 커스텀 유효성 검사 함수 */
  validate?: (value: unknown) => string | undefined;
  /** touchMode: 포커스 해제 후에만 에러 표시 */
  touchMode?: boolean;

  /** 다이얼로그 옵션 */
  dialogOptions?: DialogShowOptions;
}

// 스타일
const containerClass = clsx("inline-flex items-center", "group");
const selectedValueClass = clsx("flex-1", "whitespace-nowrap", "overflow-hidden", "text-ellipsis");
const actionButtonClass = clsx(
  "flex-shrink-0",
  "p-0.5",
  "rounded",
  "cursor-pointer",
  "transition-colors",
  "hover:bg-base-200 dark:hover:bg-base-700",
  "focus:outline-none",
);

function getTriggerContainerClass(options: {
  size?: ComponentSize;
  disabled?: boolean;
  inset?: boolean;
  class?: string;
}): string {
  return twMerge(
    triggerBaseClass,
    "px-2 py-1",
    options.size && triggerSizeClasses[options.size],
    options.disabled && triggerDisabledClass,
    options.inset && triggerInsetClass,
    options.class,
  );
}

export function DataSelectButton<TItem, TKey = string | number>(
  props: DataSelectButtonProps<TItem, TKey>,
): JSX.Element {
  const [local] = splitProps(props, [
    "value",
    "onValueChange",
    "load",
    "modal",
    "renderItem",
    "multiple",
    "required",
    "disabled",
    "size",
    "inset",
    "validate",
    "touchMode",
    "dialogOptions",
  ]);

  const dialog = useDialog();

  // value를 항상 배열로 정규화
  const normalizeKeys = (value: TKey | TKey[] | undefined): TKey[] => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    return [value];
  };

  // controlled/uncontrolled 패턴
  type ValueType = TKey | TKey[] | undefined;
  const [getValue, setValue] = createControllableSignal<ValueType>({
    value: () => local.value,
    onChange: () => local.onValueChange as ((v: ValueType) => void) | undefined,
  } as Parameters<typeof createControllableSignal<ValueType>>[0]);

  // load를 위한 키 추적 signal
  // eslint-disable-next-line solid/reactivity -- 초기값은 mount 시점에 한 번만 읽음
  const [loadKeys, setLoadKeys] = createSignal<TKey[]>(normalizeKeys(local.value));

  // value가 변경되면 loadKeys 업데이트
  createEffect(
    on(
      () => getValue(),
      (value) => {
        setLoadKeys(normalizeKeys(value));
      },
    ),
  );

  // createResource로 load 호출
  // eslint-disable-next-line solid/reactivity -- createResource의 fetcher는 source 변경 시 호출됨
  const [selectedItems] = createResource(loadKeys, async (keys) => {
    if (keys.length === 0) return [];
    return Promise.resolve(local.load(keys));
  });

  // 값이 있는지 확인
  const hasValue = createMemo(() => {
    const keys = normalizeKeys(getValue());
    return keys.length > 0;
  });

  // 지우기 가능 여부
  const clearable = createMemo(() => !local.required && hasValue() && !local.disabled);

  // 유효성 검사
  const errorMsg = createMemo(() => {
    const v = getValue();
    if (local.required) {
      const keys = normalizeKeys(v);
      if (keys.length === 0) return "필수 입력 항목입니다";
    }
    return local.validate?.(v);
  });

  // 모달 열기
  const handleOpenModal = async () => {
    if (local.disabled) return;

    const result = await dialog.show<DataSelectModalResult<TKey>>(
      local.modal,
      local.dialogOptions ?? {},
    );

    if (result) {
      const newKeys = result.selectedKeys;
      if (local.multiple) {
        setValue(newKeys);
      } else {
        setValue(newKeys.length > 0 ? newKeys[0] : undefined);
      }
    }
  };

  // 지우기
  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    if (local.multiple) {
      setValue([] as unknown as TKey[]);
    } else {
      setValue(undefined);
    }
  };

  // 선택된 값 표시
  const renderSelectedDisplay = (): JSX.Element => {
    const items = selectedItems();
    if (!items || items.length === 0) {
      return <span class={textMuted} />;
    }
    return (
      <span class="flex items-center gap-1">
        <For each={items}>
          {(item, index) => (
            <>
              <Show when={index() > 0}>
                <span class={textMuted}>,</span>
              </Show>
              {local.renderItem(item)}
            </>
          )}
        </For>
      </span>
    );
  };

  // 트리거 클래스 계산
  const triggerClassName = () =>
    getTriggerContainerClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
    });

  return (
    <Invalid message={errorMsg()} variant="border" touchMode={local.touchMode}>
      <div data-data-select-button class={containerClass}>
        <div
          role="combobox"
          aria-haspopup="dialog"
          aria-expanded={false}
          aria-disabled={local.disabled || undefined}
          aria-required={local.required || undefined}
          tabIndex={local.disabled ? -1 : 0}
          class={triggerClassName()}
          onKeyDown={(e) => {
            if (local.disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void handleOpenModal();
            }
          }}
        >
          <div class={selectedValueClass}>{renderSelectedDisplay()}</div>
          <div class="flex items-center gap-0.5">
            <Show when={clearable()}>
              <button
                type="button"
                data-clear-button
                class={twMerge(actionButtonClass, "text-base-400 hover:text-danger-500")}
                onClick={handleClear}
                tabIndex={-1}
                aria-label="선택 해제"
              >
                <Icon icon={IconX} size="0.875em" />
              </button>
            </Show>
            <Show when={!local.disabled}>
              <button
                type="button"
                data-search-button
                class={twMerge(actionButtonClass, "text-base-400 hover:text-primary-500")}
                onClick={() => void handleOpenModal()}
                tabIndex={-1}
                aria-label="검색"
              >
                <Icon icon={IconSearch} size="0.875em" />
              </button>
            </Show>
          </div>
        </div>
      </div>
    </Invalid>
  );
}
