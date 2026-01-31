import { type Component, createSignal, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import { type CheckboxStyles, checkbox, checkboxIndicator, checkboxIndicatorIcon, checkboxContents } from "./checkbox.css";
import { ripple } from "../../directives/ripple";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";
import { IconCheck, IconMinus, type IconProps } from "@tabler/icons-solidjs";

// 디렉티브 등록 (TypeScript unused import 경고 방지)
void ripple;

/**
 * Checkbox 컴포넌트의 props
 * @property checked - 체크 상태 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property indeterminate - 부분 선택 상태 (기본값: false)
 * @property onChange - 체크 상태 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property icon - 체크 아이콘 (기본값: IconCheck)
 * @property indeterminateIcon - 부분 선택 아이콘 (기본값: IconMinus)
 * @property disabled - 비활성화 상태
 * @property theme - 테마 색상 (primary, secondary, success, warning, danger, info, gray, slate)
 * @property size - 크기 (xs, sm, lg, xl)
 * @property inline - 인라인 스타일 적용
 * @property inset - 인셋 스타일 적용
 */
export interface CheckboxProps
  extends Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, "onChange">,
    CheckboxStyles {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  icon?: Component<IconProps>;
  indeterminateIcon?: Component<IconProps>;
  disabled?: boolean;
}

/**
 * 체크박스 컴포넌트
 *
 * @example
 * ```tsx
 * <Checkbox checked={checked()} onChange={setChecked}>동의합니다</Checkbox>
 * <Checkbox theme="success" indeterminate>부분 선택</Checkbox>
 * ```
 */
export const Checkbox: ParentComponent<CheckboxProps> = (props) => {
  const [local, rest] = splitProps(props, [
    ...checkbox.variants(),
    "class",
    "children",
    "checked",
    "indeterminate",
    "onChange",
    "icon",
    "indeterminateIcon",
    "disabled",
  ]);

  // uncontrolled 모드를 위한 내부 상태 (checked를 초기값으로 사용)
  // eslint-disable-next-line solid/reactivity -- 초기값 설정에만 사용
  const [internalChecked, setInternalChecked] = createSignal(local.checked ?? false);

  // controlled 모드(onChange가 있으면 controlled) vs uncontrolled 모드
  const isControlled = () => local.onChange !== undefined;
  const currentChecked = () => (isControlled() ? (local.checked ?? false) : internalChecked());

  const handleChange = () => {
    const newValue = !currentChecked();
    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalChecked(newValue);
    }
  };

  const Icon = () => {
    const IconComponent = local.icon ?? IconCheck;
    return <IconComponent />;
  };

  const IndeterminateIcon = () => {
    const IconComponent = local.indeterminateIcon ?? IconMinus;
    return <IconComponent />;
  };

  return (
    <label
      use:ripple
      {...rest}
      class={[
        checkbox({
          ...objPick(local, checkbox.variants()),
          checked: currentChecked(),
          indeterminate: local.indeterminate ?? false,
          disabled: local.disabled,
        }),
        local.class,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        type="checkbox"
        checked={currentChecked()}
        disabled={local.disabled}
        style={{ position: "absolute", opacity: 0, "pointer-events": "none" }}
        onChange={handleChange}
      />
      <span class={checkboxIndicator}>
        <span
          class={checkboxIndicatorIcon}
          data-checked={String(currentChecked() && !local.indeterminate)}
          data-indeterminate={String(local.indeterminate ?? false)}
        >
          <Show when={local.indeterminate} fallback={<Icon />}>
            <IndeterminateIcon />
          </Show>
        </span>
      </span>
      <span class={checkboxContents}>{local.children}</span>
    </label>
  );
};
