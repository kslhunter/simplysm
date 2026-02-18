import { type Component, type JSX, Show, splitProps } from "solid-js";
import {
  type ColorFieldStyles,
  colorField,
  colorFieldContainer,
  colorFieldContent,
  colorFieldInput,
} from "./color-field.css";
import { objPick } from "@simplysm/core-common";
import "@simplysm/core-common";
import { createFieldSignal } from "../../../hooks/createFieldSignal";

/**
 * ColorField 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property inline - true일 경우 inline-block으로 표시
 */
export interface ColorFieldProps
  extends
    Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size">,
    ColorFieldStyles {
  value?: string | undefined;
  onChange?: (value: string | undefined) => void;
}

/**
 * 색상 선택 필드 컴포넌트
 *
 * @example
 * ```tsx
 * const [color, setColor] = createSignal<string | undefined>("#ff0000");
 * <ColorField value={color()} onChange={setColor} />
 * ```
 */
export const ColorField: Component<ColorFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [...colorField.variants(), "class", "value", "onChange"]);

  const [value, setValue] = createFieldSignal({
    value: () => local.value,
    onChange: () => local.onChange,
  });

  // 변경 핸들러
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const input = e.currentTarget;
    const newValue = input.value !== "" ? input.value : undefined;
    setValue(newValue);
  };

  // 공통 input props
  const inputProps = () => ({
    "type": "color" as const,
    "value": value(),
    "onChange": handleChange,
    "aria-disabled": rest.disabled ? ("true" as const) : undefined,
    "aria-readonly": rest.readOnly ? ("true" as const) : undefined,
  });

  return (
    <Show
      when={local.inline}
      fallback={
        <input
          {...rest}
          {...inputProps()}
          class={[colorField(objPick(local, colorField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      }
    >
      <div class={colorFieldContainer}>
        <div class={colorFieldContent} style={{ background: value() }} />
        <input
          {...rest}
          {...inputProps()}
          class={[colorFieldInput, colorField(objPick(local, colorField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
    </Show>
  );
};
