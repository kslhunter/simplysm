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
import { createFieldState } from "../../hooks/createFieldState";

/**
 * ColorField 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property inline - true일 경우 inline-block으로 표시
 */
export interface ColorFieldProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size">,
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
  const [local, rest] = splitProps(props, [
    ...colorField.variants(),
    "class",
    "value",
    "onChange",
  ]);

  const fieldState = createFieldState({
    value: () => local.value ?? "#000000",
    onChange: () => local.onChange,
  });

  // color input은 빈 값을 허용하지 않음, createFieldState에서 기본값 "#000000" 처리됨
  const inputValue = () => fieldState.currentValue() as string;

  // 변경 핸들러
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const input = e.currentTarget;
    const newValue = input.value !== "" ? input.value : undefined;
    fieldState.setValue(newValue);
  };

  // 공통 input props
  const inputProps = () => ({
    type: "color" as const,
    value: inputValue(),
    onChange: handleChange,
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
            .filterExists()
            .join(" ")}
        />
      }
    >
      <div class={colorFieldContainer}>
        <div class={colorFieldContent} style={{ background: inputValue() }} />
        <input
          {...rest}
          {...inputProps()}
          class={[colorFieldInput, colorField(objPick(local, colorField.variants())), local.class]
            .filterExists()
            .join(" ")}
        />
      </div>
    </Show>
  );
};
