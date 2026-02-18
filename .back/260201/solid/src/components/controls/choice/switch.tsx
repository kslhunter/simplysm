import { type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import {
  switchContents,
  switchStyle,
  type SwitchStyles,
  switchThumb,
  switchTrack,
} from "./switch.css";
import { ripple } from "../../../directives/ripple";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";
import { createFieldSignal } from "../../../hooks/createFieldSignal";

// 디렉티브 등록 (TypeScript unused import 경고 방지)
void ripple;

/**
 * Switch 컴포넌트의 props
 * @property checked - 토글 상태 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 토글 상태 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property disabled - 비활성화 상태
 * @property theme - 테마 색상 (primary, secondary, success, warning, danger, info, gray, slate)
 * @property size - 크기 (xs, sm, lg, xl)
 * @property inline - 인라인 스타일 적용
 * @property inset - 인셋 스타일 적용
 */
export interface SwitchProps
  extends Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, "onChange">, SwitchStyles {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * 스위치 컴포넌트 (토글 스위치)
 *
 * @example
 * ```tsx
 * <Switch checked={enabled()} onChange={setEnabled}>알림 수신</Switch>
 * <Switch theme="success">다크 모드</Switch>
 * ```
 */
export const Switch: ParentComponent<SwitchProps> = (props) => {
  const [local, rest] = splitProps(props, [
    ...switchStyle.variants(),
    "class",
    "children",
    "checked",
    "onChange",
    "disabled",
  ]);

  const [checked, setChecked] = createFieldSignal({
    value: () => local.checked ?? false,
    onChange: () => local.onChange,
  });
  const handleChange = () => setChecked((v) => !v);

  return (
    <label
      use:ripple
      {...rest}
      class={[
        switchStyle({
          ...objPick(local, switchStyle.variants()),
          checked: checked(),
          disabled: local.disabled,
        }),
        local.class,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked()}
        checked={checked()}
        disabled={local.disabled}
        style={{ "position": "absolute", "opacity": 0, "pointer-events": "none" }}
        onChange={handleChange}
      />
      <span class={switchTrack} data-part="track">
        <span class={switchThumb} data-part="thumb" />
      </span>
      <Show when={local.children}>
        <span class={switchContents}>{local.children}</span>
      </Show>
    </label>
  );
};
