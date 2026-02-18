import { type JSX, type ParentComponent, splitProps } from "solid-js";
import { radio, radioContents, radioIndicator, radioInnerDot, type RadioStyles } from "./radio.css";
import { ripple } from "../../../directives/ripple";
import "@simplysm/core-common";
import { objPick } from "@simplysm/core-common";
import { createFieldSignal } from "../../../hooks/createFieldSignal";

// 디렉티브 등록 (TypeScript unused import 경고 방지)
void ripple;

/**
 * Radio 컴포넌트의 props
 * @property checked - 선택 상태 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 선택 상태 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property disabled - 비활성화 상태
 * @property theme - 테마 색상 (primary, secondary, success, warning, danger, info, gray, slate)
 * @property size - 크기 (xs, sm, lg, xl)
 * @property inline - 인라인 스타일 적용
 * @property inset - 인셋 스타일 적용
 */
export interface RadioProps
  extends Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, "onChange">, RadioStyles {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * 라디오 버튼 컴포넌트
 *
 * Checkbox와 달리 indeterminate 상태를 지원하지 않습니다.
 * 라디오 버튼은 항상 선택(checked) 또는 미선택 상태만 가집니다.
 *
 * @example
 * ```tsx
 * <Radio checked={selected() === 'a'} onChange={() => setSelected('a')}>옵션 A</Radio>
 * <Radio checked={selected() === 'b'} onChange={() => setSelected('b')}>옵션 B</Radio>
 * ```
 */
export const Radio: ParentComponent<RadioProps> = (props) => {
  const [local, rest] = splitProps(props, [
    ...radio.variants(),
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

  // 라디오는 항상 true로 설정 (토글 아님)
  const handleChange = () => setChecked(true);

  return (
    <label
      use:ripple
      {...rest}
      class={[
        radio({
          ...objPick(local, radio.variants()),
          checked: checked(),
          disabled: local.disabled,
        }),
        local.class,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        type="radio"
        checked={checked()}
        disabled={local.disabled}
        style={{ "position": "absolute", "opacity": 0, "pointer-events": "none" }}
        onChange={handleChange}
      />
      <span class={radioIndicator}>
        <span class={radioInnerDot} />
      </span>
      <span class={radioContents}>{local.children}</span>
    </label>
  );
};
